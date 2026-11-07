// Toutes les données personnelles restent dans le navigateur de l'utilisateur.
const PREFIX = 'glutenspot:';
const memory = new Map(); // Valeurs que le navigateur n'a pas pu enregistrer (stockage bloqué ou plein).

export const KEYS = ['profile', 'history', 'favorites', 'shopping', 'journal', 'plan', 'placeFavorites', 'questionsChecked', 'cardLanguage', 'lastLocation'];

let unsavedListener = () => {};
/** Prévient l'application quand des données ne sont plus (ou de nouveau) enregistrées. */
export const onUnsavedChange = (listener) => {
  unsavedListener = listener;
};

export function load(key, fallback) {
  // Une valeur non enregistrée est plus récente que celle du stockage.
  if (memory.has(key)) return memory.get(key);
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    // Valeur illisible ou stockage indisponible.
  }
  return fallback;
}

/** Renvoie false si la valeur n'est gardée qu'en mémoire : elle sera perdue à la fermeture de la page. */
export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    memory.delete(key);
    unsavedListener(memory.size > 0);
    return true;
  } catch {
    memory.set(key, value);
    unsavedListener(true);
    return false;
  }
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const getProfile = () => ({ strictness: 'strict', allergies: [], theme: 'auto', onboarded: false, ...load('profile', {}) });
export const saveProfile = (changes) => save('profile', { ...getProfile(), ...changes });

// Produits : historique et favoris gardent une copie pour rester consultables hors ligne.
const HISTORY_LIMIT = 50;

export const compactProduct = (p) => ({
  code: p.code,
  product_name: p.product_name_fr || p.product_name || '',
  brands: p.brands || '',
  image_front_small_url: p.image_front_small_url || '',
  allergens_tags: p.allergens_tags ?? [],
  traces_tags: p.traces_tags ?? [],
  labels_tags: (p.labels_tags ?? []).filter((t) => /gluten|grain|epi/i.test(t)),
  ingredients_text_fr: p.ingredients_text_fr || p.ingredients_text || '',
  categories_tags: p.categories_tags ?? [],
  savedAt: Date.now(),
});

export function rememberProduct(product) {
  const entry = compactProduct(product);
  const history = load('history', []).filter((p) => p.code !== entry.code);
  save('history', [entry, ...history].slice(0, HISTORY_LIMIT));
  const favorites = load('favorites', []);
  if (favorites.some((p) => p.code === entry.code)) {
    save('favorites', favorites.map((p) => (p.code === entry.code ? entry : p)));
  }
}

export const cachedProduct = (code) =>
  [...load('favorites', []), ...load('history', [])].find((p) => p.code === code) ?? null;

export const isFavorite = (code) => load('favorites', []).some((p) => p.code === code);

export function toggleFavorite(product) {
  const favorites = load('favorites', []);
  const exists = favorites.some((p) => p.code === product.code);
  save('favorites', exists ? favorites.filter((p) => p.code !== product.code) : [compactProduct(product), ...favorites]);
  return !exists;
}

// Liste de courses.
export function addShoppingItems(texts, source) {
  const items = load('shopping', []);
  const known = new Set(items.filter((i) => !i.done).map((i) => i.text.toLowerCase()));
  let added = 0;
  for (const text of texts) {
    const clean = text.trim();
    if (!clean || known.has(clean.toLowerCase())) continue;
    known.add(clean.toLowerCase());
    items.push({ id: newId(), text: clean, done: false, source });
    added += 1;
  }
  save('shopping', items);
  return added;
}

export function exportAll() {
  const data = {};
  for (const key of KEYS) {
    const value = load(key, undefined);
    if (value !== undefined) data[key] = value;
  }
  return { app: 'gluten-spot', version: 1, exportedAt: new Date().toISOString(), data };
}

// En cas de conflit, la version de cet appareil est conservée : importer n'écrase jamais rien.
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeBy = (field) => (local, incoming) => {
  const known = new Set(local.map((item) => item[field]));
  return [...local, ...incoming.filter((item) => isObject(item) && item[field] !== undefined && !known.has(item[field]))];
};

const keepLocal = (local, incoming) => local ?? incoming;

const MERGE = {
  profile: (local = {}, incoming) => ({
    ...incoming,
    ...local,
    // Une allergie déclarée sur un appareil ne doit jamais disparaître : on additionne.
    allergies: [...new Set([...(incoming.allergies ?? []), ...(local.allergies ?? [])])],
    onboarded: Boolean(local.onboarded || incoming.onboarded),
  }),
  journal: mergeBy('id'),
  shopping: mergeBy('id'),
  placeFavorites: mergeBy('id'),
  favorites: mergeBy('code'),
  history: (local, incoming) => mergeBy('code')(local, incoming).sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0)).slice(0, HISTORY_LIMIT),
  plan: (local = {}, incoming) => ({ ...incoming, ...local }),
  questionsChecked: (local, incoming) => [...new Set([...local, ...incoming])],
  cardLanguage: keepLocal,
  lastLocation: keepLocal,
};

const ARRAY_KEYS = new Set(['journal', 'shopping', 'placeFavorites', 'favorites', 'history', 'questionsChecked']);
const OBJECT_KEYS = new Set(['profile', 'plan']);

/** Fusionne une sauvegarde avec les données de cet appareil. */
export function importAll(backup) {
  if (backup?.app !== 'gluten-spot' || !isObject(backup.data)) {
    throw new Error('Ce fichier n’est pas une sauvegarde Gluten Spot.');
  }
  const present = KEYS.filter((key) => key in backup.data);
  for (const key of present) {
    const value = backup.data[key];
    const valid = ARRAY_KEYS.has(key) ? Array.isArray(value) : OBJECT_KEYS.has(key) ? isObject(value) : true;
    if (!valid) throw new Error('Cette sauvegarde est abîmée : rien n’a été importé.');
  }

  const journalBefore = load('journal', []).length;
  const merged = present.map((key) => {
    const local = load(key, ARRAY_KEYS.has(key) ? [] : undefined);
    return [key, MERGE[key](local, backup.data[key])];
  });
  // `every` s'arrêterait au premier échec : on écrit tout, pour que tout reste au moins en mémoire.
  const results = merged.map(([key, value]) => save(key, value));
  return {
    saved: results.every(Boolean),
    journalAdded: load('journal', []).length - journalBefore,
  };
}

// Rappel d'export. Cet état reste propre à l'appareil : il ne fait pas partie des sauvegardes.
const DAY_MS = 86400000;
const BACKUP_EVERY_MS = 30 * DAY_MS;
const SNOOZE_MS = 7 * DAY_MS;

export const hasPersonalData = () =>
  ['journal', 'favorites', 'placeFavorites', 'shopping'].some((key) => load(key, []).length > 0) ||
  Object.keys(load('plan', {})).length > 0;

export const lastBackupAt = () => load('backup', {}).lastAt ?? null;

export function backupReminderDue(now = Date.now()) {
  if (!hasPersonalData()) return false;
  const state = load('backup', {});
  if (!state.nextAt) {
    // Le délai démarre à la première donnée personnelle.
    save('backup', { ...state, nextAt: now + BACKUP_EVERY_MS });
    return false;
  }
  return now >= state.nextAt;
}

export const markBackedUp = (now = Date.now()) => save('backup', { lastAt: now, nextAt: now + BACKUP_EVERY_MS });
export const snoozeBackupReminder = (now = Date.now()) => save('backup', { ...load('backup', {}), nextAt: now + SNOOZE_MS });

/** Demande au navigateur de ne pas effacer les données quand l'espace manque. Il peut refuser. */
export async function protectStorage() {
  try {
    const storage = navigator.storage;
    if (!storage?.persist) return false;
    return (await storage.persisted()) || (await storage.persist());
  } catch {
    return false;
  }
}

export function clearAll() {
  for (const key of [...KEYS, 'backup']) {
    memory.delete(key);
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // Rien à faire si le stockage est indisponible.
    }
  }
  unsavedListener(false);
}
