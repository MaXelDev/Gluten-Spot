import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeIngredients, productVerdict, highlightSegments, isValidBarcode } from '../js/lib/gluten.js';

const key = (product, profile) => productVerdict(product, profile).key;
const labels = (text) => analyzeIngredients(text).findings.map((f) => f.label);

test('repère les céréales à gluten, avec ou sans accents', () => {
  for (const text of ['Farine de BLÉ', 'farine de ble', 'seigle', 'orge maltée', 'Épeautre', 'chapelure', 'extrait de malt', 'kamut', 'wheat flour', 'Weizenmehl dinkel']) {
    assert.equal(analyzeIngredients(text).contains, true, text);
  }
});

test("n'a pas de faux positifs sur des mots proches", () => {
  for (const text of [
    'farine de riz, fécule de pomme de terre',
    'blé noir',
    'farine de blé noir',
    'maltodextrine, maltose, maltitol',
    'sirop d’orgeat',
    'sensible, ensemble, comestible',
    'gorge, forge',
    'pâte de cacao, pâte d’amande',
    'amidon de maïs',
    'nouilles de riz',
    'pâtes de lentilles',
    'semoule de maïs',
    'dessert sans gluten',
    'Rice flour, corn starch',
    'sirop de glucose',
  ]) {
    const r = analyzeIngredients(text);
    assert.deepEqual(r.findings.map((f) => f.text), [], text);
  }
});

test('un ingrédient sûr ne masque pas le blé qui le suit', () => {
  assert.equal(analyzeIngredients('farine de riz, farine de blé').contains, true);
  assert.equal(analyzeIngredients('farine de riz et de blé').contains, true);
});

test('classe les termes ambigus en « à vérifier »', () => {
  for (const text of ['farine', 'amidon modifié', 'flocons d’avoine', 'sauce soja', 'semoule']) {
    const r = analyzeIngredients(text);
    assert.equal(r.contains, false, text);
    assert.equal(r.caution, true, text);
  }
});

test('les dérivés exemptés par la réglementation ne déclenchent pas d’alerte', () => {
  const r = analyzeIngredients('sirop de glucose de blé, dextrose (blé), maltodextrine de blé');
  assert.equal(r.contains, false);
  assert.equal(r.exempted.length, 3);
});

test('sépare ingrédients et mentions de traces', () => {
  const traces = analyzeIngredients('Sucre, cacao. Peut contenir des traces de blé.');
  assert.equal(traces.contains, false);
  assert.equal(traces.traces, true);

  const mixed = analyzeIngredients('Farine de blé, sucre, peut contenir du soja');
  assert.equal(mixed.contains, true);
  assert.equal(mixed.traces, false);

  const sameClause = analyzeIngredients('Sucre, peut contenir du seigle et de l’orge');
  assert.equal(sameClause.contains, false);
  assert.equal(sameClause.traces, true);
});

test('une mention de traces s’arrête à la fin de la phrase', () => {
  const r = analyzeIngredients('Traces de soja. Farine de blé.');
  assert.equal(r.contains, true);
});

test('verdicts produits', () => {
  assert.equal(key({ allergens_tags: ['en:gluten'], ingredients_text_fr: 'Semoule' }), 'contains');
  assert.equal(key({ ingredients_text_fr: 'Farine de blé' }), 'contains');
  assert.equal(key({ traces_tags: ['en:gluten'], ingredients_text: 'Sucre' }), 'traces');
  assert.equal(key({ labels_tags: ['en:no-gluten'], ingredients_text: 'Riz' }), 'labelled');
  assert.equal(key({ ingredients_text_fr: 'Sucre, huile' }), 'nodetect');
  assert.equal(key({ ingredients_text_fr: 'Sucre, amidon' }), 'check');
});

test('une fiche vide ne reçoit jamais de verdict rassurant', () => {
  assert.equal(key({}), 'unknown');
  assert.equal(key({ allergens_tags: ['en:milk'] }), 'unknown');
  assert.equal(key({ ingredients_text_fr: '   ' }), 'unknown');
});

test('un label sans gluten contredit par la fiche ne donne pas de vert', () => {
  // Cas réel : allergens_tags ["en:gluten", "fr:gluten-d-avoine"] avec le label en:no-gluten.
  assert.equal(key({ labels_tags: ['en:no-gluten'], allergens_tags: ['en:eggs', 'en:gluten', 'fr:gluten-d-avoine'] }), 'conflict');
  assert.equal(key({ labels_tags: ['en:no-gluten'], traces_tags: ['en:gluten'] }), 'conflict');
  assert.equal(key({ labels_tags: ['en:no-gluten'], ingredients_text_fr: 'Amidon de blé' }), 'conflict');
});

test('un produit labellisé peut contenir des termes ambigus comme la farine ou l’avoine', () => {
  assert.equal(key({ labels_tags: ['en:no-gluten'], ingredients_text_fr: 'Flocons d’avoine, farine' }), 'labelled');
});

test('le profil modifie le conseil, pas le statut', () => {
  const product = { traces_tags: ['en:gluten'], ingredients_text: 'Sucre' };
  const strict = productVerdict(product, { strictness: 'strict' });
  const moderate = productVerdict(product, { strictness: 'moderate' });
  assert.equal(strict.key, moderate.key);
  assert.notEqual(strict.advice, moderate.advice);
});

test('signale les autres allergies du profil', () => {
  const v = productVerdict(
    { allergens_tags: ['en:milk'], traces_tags: ['en:nuts'], ingredients_text: 'Lait' },
    { allergies: ['milk', 'nuts', 'eggs'] },
  );
  assert.deepEqual(v.otherAllergens, [
    { id: 'milk', contains: true, traces: false },
    { id: 'nuts', contains: false, traces: true },
  ]);
});

test('le surlignage conserve exactement le texte d’origine', () => {
  const raw = 'Œufs, Farine de BLÉ œuvrée, MALT. Peut contenir : Épeautre';
  const analysis = analyzeIngredients(raw);
  const parts = highlightSegments(raw, analysis);
  assert.equal(parts.map((p) => p.text).join(''), raw);
  assert.deepEqual(parts.filter((p) => p.level).map((p) => p.text), ['Farine de BLÉ', 'MALT', 'Épeautre']);
  assert.equal(parts.at(-1).level, 'traces');
});

test('ne compte pas deux fois le même mot', () => {
  assert.deepEqual(labels('petit épeautre'), ['Épeautre']);
  assert.deepEqual(labels('amidon modifié'), ['Amidon non précisé']);
});

test('valide les codes-barres', () => {
  assert.equal(isValidBarcode('3017620422003'), true);
  assert.equal(isValidBarcode('3017620422004'), false);
  assert.equal(isValidBarcode('96385074'), true);
  assert.equal(isValidBarcode('abc'), false);
  assert.equal(isValidBarcode('123'), false);
});
