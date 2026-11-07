import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dailySeverity, daysSinceExposure, foodInsights, mealFoods, summarize } from '../js/lib/insights.js';

const at = (day, hour = 12) => new Date(2026, 10, day, hour).toISOString();
const meal = (day, text) => ({ type: 'meal', at: at(day), text });
const symptom = (day, intensity = 3, symptoms = ['Fatigue'], hour = 18) => ({ type: 'symptom', at: at(day, hour), intensity, symptoms });

test('découpe un repas en aliments', () => {
  assert.deepEqual(mealFoods('Du riz, poulet et une salade'), ['riz', 'poulet', 'salade']);
  assert.deepEqual(mealFoods('Pâtes + Pâtes'), ['pates']);
  // Un mot qui commence comme un article reste entier.
  assert.deepEqual(mealFoods('lait, dessert, légumes, de l’eau'), ['lait', 'dessert', 'legumes', 'eau']);
});

test('signale un aliment suivi de symptômes plus souvent que la moyenne', () => {
  const entries = [
    meal(1, 'riz, yaourt'), symptom(1),
    meal(4, 'riz, yaourt'), symptom(4),
    meal(7, 'riz, yaourt'), symptom(7),
    meal(10, 'poulet'), meal(13, 'poulet'), meal(16, 'poulet'),
    meal(19, 'poire'), meal(22, 'poire'), meal(25, 'poire'),
  ];
  const { foods, baseline } = foodInsights(entries);
  assert.ok(Math.abs(baseline - 3 / 9) < 1e-9);
  assert.equal(foods.find((f) => f.food === 'yaourt').notable, true);
  assert.equal(foods.find((f) => f.food === 'poulet').notable, false);
});

test('ignore les symptômes antérieurs au repas ou trop éloignés', () => {
  const entries = [symptom(1), meal(2, 'riz'), meal(10, 'riz'), meal(20, 'riz'), symptom(25)];
  const riz = foodInsights(entries).foods.find((f) => f.food === 'riz');
  assert.equal(riz.followed, 0);
});

test('demande au moins 3 repas pour un aliment', () => {
  const { foods } = foodInsights([meal(1, 'riz'), symptom(1), meal(2, 'riz'), symptom(2)]);
  assert.deepEqual(foods, []);
});

test('sans symptôme ni repas, aucune tendance', () => {
  assert.deepEqual(foodInsights([]).foods, []);
  assert.deepEqual(foodInsights([meal(1, 'riz')]).foods, []);
});

test('garde l’intensité maximale de chaque jour', () => {
  const now = new Date(2026, 10, 6, 15);
  const days = dailySeverity([symptom(6, 2), symptom(6, 4, ['Nausées']), symptom(4, 1)], 3, now);
  assert.deepEqual(days.map((d) => d.value), [1, 0, 4]);
  assert.deepEqual(days[2].symptoms, ['Fatigue', 'Nausées']);
});

test('résume une période sans compter le reste', () => {
  const now = new Date(2026, 10, 10, 20);
  const s = summarize([symptom(10), symptom(10), symptom(1), meal(9, 'riz'), { type: 'exposure', at: at(9), text: 'x' }], 7, now);
  assert.equal(s.symptomCount, 2);
  assert.equal(s.daysWithSymptoms, 1);
  assert.equal(s.daysWithoutSymptoms, 6);
  assert.equal(s.exposures, 1);
  assert.equal(s.meals, 1);
});

test('compte les jours depuis la dernière exposition', () => {
  const now = new Date(2026, 10, 10, 8);
  assert.equal(daysSinceExposure([], now), null);
  assert.equal(daysSinceExposure([{ type: 'exposure', at: at(7, 23) }], now), 3);
});
