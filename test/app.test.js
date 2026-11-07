import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RECIPES, RECIPE_CATEGORIES } from '../js/data/recipes.js';
import { LANGUAGES } from '../js/data/phrases.js';
import { analyzeIngredients } from '../js/lib/gluten.js';

const root = fileURLToPath(new URL('..', import.meta.url));

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [relative(root, path)];
  });

test('le service worker met en cache chaque fichier de l’application', () => {
  const source = readFileSync(join(root, 'sw.js'), 'utf8');
  const listed = new Set([...source.matchAll(/'\.\/([^']+)'/g)].map((m) => m[1]));
  const files = ['css', 'icons', 'js', 'vendor'].flatMap((dir) => walk(join(root, dir)));
  for (const file of files) assert.ok(listed.has(file), `${file} manque dans sw.js`);
  const existing = new Set([...files, 'index.html', 'manifest.webmanifest']);
  for (const file of listed) assert.ok(existing.has(file), `${file} n'existe pas`);
});

test('aucun ingrédient de recette ne contient de terme à risque', () => {
  for (const recipe of RECIPES) {
    for (const [, , name] of recipe.i) {
      assert.deepEqual(analyzeIngredients(name).findings.map((f) => f.text), [], `${recipe.id} : ${name}`);
    }
  }
});

test('les recettes sont complètes et cohérentes', () => {
  const ids = new Set();
  for (const recipe of RECIPES) {
    assert.ok(!ids.has(recipe.id), `identifiant en double : ${recipe.id}`);
    ids.add(recipe.id);
    assert.ok(RECIPE_CATEGORIES.includes(recipe.c), recipe.id);
    assert.ok(recipe.i.length && recipe.s.length && recipe.p > 0 && recipe.min > 0, recipe.id);
  }
});

test('chaque carte de restaurant est entièrement traduite', () => {
  const fields = ['title', 'intro', 'avoid', 'safe', 'contamination', 'ask'];
  const words = ['wheat', 'barley', 'rye', 'oats', 'flour', 'free'];
  for (const lang of LANGUAGES) {
    for (const field of fields) assert.ok(lang[field], `${lang.code}.${field}`);
    for (const word of words) assert.ok(lang.words[word], `${lang.code}.words.${word}`);
  }
});
