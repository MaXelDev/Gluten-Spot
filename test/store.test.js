import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { backupReminderDue, clearAll, exportAll, importAll, lastBackupAt, load, markBackedUp, onUnsavedChange, save, snoozeBackupReminder } from '../js/lib/store.js';

const data = new Map();
let writable = true;
let readable = true;

Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem(key) {
      if (!readable) throw new Error('stockage bloqué');
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (!writable) throw new Error('stockage plein');
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
  },
});

beforeEach(() => {
  writable = true;
  readable = true;
  clearAll();
});

test('une valeur enregistrée est relue depuis le stockage', () => {
  assert.equal(save('journal', [{ id: 'a' }]), true);
  assert.deepEqual(load('journal', []), [{ id: 'a' }]);
  assert.equal(data.get('glutenspot:journal'), '[{"id":"a"}]');
});

test('stockage plein : la nouvelle valeur remplace l’ancienne à la lecture', () => {
  save('journal', [{ id: 'a' }]);
  writable = false;
  assert.equal(save('journal', [{ id: 'a' }, { id: 'b' }]), false);
  assert.deepEqual(load('journal', []), [{ id: 'a' }, { id: 'b' }]);
});

test('une valeur non enregistrée reste exportable', () => {
  writable = false;
  save('journal', [{ id: 'a' }]);
  assert.deepEqual(exportAll().data.journal, [{ id: 'a' }]);
});

test('après un échec, une écriture réussie redonne la main au stockage', () => {
  writable = false;
  save('journal', [{ id: 'a' }]);
  writable = true;
  assert.equal(save('journal', [{ id: 'b' }]), true);
  data.set('glutenspot:journal', '[{"id":"autre-onglet"}]');
  assert.deepEqual(load('journal', []), [{ id: 'autre-onglet' }]);
});

test('stockage totalement bloqué : la mémoire prend le relais', () => {
  writable = false;
  readable = false;
  assert.deepEqual(load('journal', []), []);
  assert.equal(save('journal', [{ id: 'a' }]), false);
  assert.deepEqual(load('journal', []), [{ id: 'a' }]);
});

test('une valeur illisible donne la valeur par défaut', () => {
  data.set('glutenspot:journal', '{cassé');
  assert.deepEqual(load('journal', []), []);
});

const backup = (data) => ({ app: 'gluten-spot', version: 1, data });

test('import : le journal est fusionné sans doublon ni écrasement', () => {
  save('journal', [{ id: 'a', text: 'version locale' }, { id: 'b', text: 'seulement ici' }]);
  const result = importAll(backup({ journal: [{ id: 'a', text: 'version du fichier' }, { id: 'c', text: 'seulement là-bas' }] }));
  assert.deepEqual(load('journal', []).map((e) => e.text), ['version locale', 'seulement ici', 'seulement là-bas']);
  assert.deepEqual(result, { saved: true, journalAdded: 1 });
});

test('import sur un appareil vide : tout est restauré', () => {
  const data = {
    profile: { strictness: 'moderate', allergies: ['lait'], onboarded: true },
    journal: [{ id: 'a' }],
    favorites: [{ code: '1' }],
    plan: { 'lundi-midi': { recipeId: 'r' } },
    cardLanguage: 'es',
    lastLocation: { label: 'Paris' },
  };
  importAll(backup(data));
  for (const [key, value] of Object.entries(data)) assert.deepEqual(load(key), value, key);
});

test('import : les allergies s’additionnent, le reste du profil local est gardé', () => {
  save('profile', { strictness: 'strict', allergies: ['soja'], theme: 'dark', onboarded: false });
  importAll(backup({ profile: { strictness: 'moderate', allergies: ['lait'], theme: 'light', onboarded: true } }));
  const profile = load('profile');
  assert.deepEqual(new Set(profile.allergies), new Set(['soja', 'lait']));
  assert.equal(profile.strictness, 'strict');
  assert.equal(profile.theme, 'dark');
  assert.equal(profile.onboarded, true);
});

test('import : le planning, l’historique et les réglages simples gardent le local', () => {
  save('plan', { lundi: { recipeId: 'local' } });
  save('cardLanguage', 'de');
  save('history', [{ code: '1', savedAt: 10 }]);
  importAll(backup({
    plan: { lundi: { recipeId: 'fichier' }, mardi: { recipeId: 'fichier' } },
    cardLanguage: 'es',
    history: [{ code: '2', savedAt: 20 }, { code: '1', savedAt: 5 }],
  }));
  assert.deepEqual(load('plan'), { lundi: { recipeId: 'local' }, mardi: { recipeId: 'fichier' } });
  assert.equal(load('cardLanguage'), 'de');
  assert.deepEqual(load('history').map((p) => p.code), ['2', '1']);
});

test('import : un fichier invalide ne modifie rien', () => {
  save('journal', [{ id: 'a' }]);
  assert.throws(() => importAll({ app: 'autre', data: {} }), /pas une sauvegarde/);
  assert.throws(() => importAll(backup({ profile: { allergies: [] }, journal: 'cassé' })), /abîmée/);
  assert.deepEqual(load('journal'), [{ id: 'a' }]);
  assert.equal(load('profile'), undefined);
});

test('import : les éléments sans identifiant sont ignorés', () => {
  importAll(backup({ journal: [null, 'texte', { text: 'sans id' }, { id: 'ok' }] }));
  assert.deepEqual(load('journal'), [{ id: 'ok' }]);
});

test('import : un stockage plein est signalé, et les données restent accessibles', () => {
  writable = false;
  const result = importAll(backup({ journal: [{ id: 'a' }] }));
  assert.equal(result.saved, false);
  assert.deepEqual(load('journal'), [{ id: 'a' }]);
});

test('le rappel attend 30 jours, puis revient 7 jours après « plus tard »', () => {
  const day = 86400000;
  const start = 1_000_000_000_000;
  assert.equal(backupReminderDue(start), false, 'pas de rappel sans donnée');
  save('journal', [{ id: 'a' }]);
  assert.equal(backupReminderDue(start), false, 'le délai démarre');
  assert.equal(backupReminderDue(start + 29 * day), false);
  assert.equal(backupReminderDue(start + 30 * day), true);
  snoozeBackupReminder(start + 30 * day);
  assert.equal(backupReminderDue(start + 36 * day), false);
  assert.equal(backupReminderDue(start + 37 * day), true);
  markBackedUp(start + 37 * day);
  assert.equal(lastBackupAt(), start + 37 * day);
  assert.equal(backupReminderDue(start + 66 * day), false);
  assert.equal(backupReminderDue(start + 67 * day), true);
});

test('l’état du rappel n’est pas exporté, mais il est effacé avec le reste', () => {
  save('journal', [{ id: 'a' }]);
  markBackedUp(123);
  assert.equal('backup' in exportAll().data, false);
  clearAll();
  assert.equal(lastBackupAt(), null);
});

test('l’application est prévenue quand des données ne sont pas enregistrées', () => {
  const states = [];
  onUnsavedChange((unsaved) => states.push(unsaved));
  writable = false;
  save('journal', [{ id: 'a' }]);
  writable = true;
  save('journal', [{ id: 'b' }]);
  onUnsavedChange(() => {});
  assert.deepEqual(states, [true, false]);
});
