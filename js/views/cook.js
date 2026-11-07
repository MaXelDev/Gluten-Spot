import { dayKey, emptyState, formatDate, html, icon, on, setHtml, tabs, toast } from '../lib/dom.js';
import { analyzeIngredients, normalize } from '../lib/gluten.js';
import { RECIPE_CATEGORIES, RECIPES, SUBSTITUTIONS } from '../data/recipes.js';
import { ALLERGIES } from '../data/guides.js';
import { addShoppingItems, getProfile, load, newId, save } from '../lib/store.js';

const TABS = [
  { id: 'recettes', href: '#/cuisine/recettes', icon: 'chef-hat', label: 'Recettes' },
  { id: 'planning', href: '#/cuisine/planning', icon: 'calendar-days', label: 'Planning' },
  { id: 'courses', href: '#/cuisine/courses', icon: 'shopping-cart', label: 'Courses' },
  { id: 'remplacer', href: '#/cuisine/remplacer', icon: 'refresh-cw', label: 'Remplacer' },
];

const MEALS = [['midi', 'Midi'], ['soir', 'Soir']];
const memo = { query: '', category: '', weekOffset: 0, servings: {} };

export const title = (params) => {
  if (params[0] === 'recette') return RECIPES.find((r) => r.id === params[1])?.t ?? 'Recette';
  return 'Cuisine';
};

export function render({ params }) {
  if (params[0] === 'recette') return recipeView(params[1]);
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'recettes';
  const views = { recettes: recipesView, planning: planView, courses: shoppingView, remplacer: replaceView };
  return html`<h1 class="page-title">Cuisine et courses</h1>${tabs(TABS, tab)}${views[tab]()}`;
}

export function mount(page, { params, refresh }) {
  if (params[0] === 'recette') return mountRecipe(page, params[1], refresh);
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'recettes';
  const mounts = { recettes: mountRecipes, planning: mountPlan, courses: mountShopping, remplacer: mountReplace };
  return mounts[tab]?.(page, refresh);
}

const allergyLabel = (id) => ALLERGIES.find((a) => a.id === id)?.label ?? id;
const conflicts = (recipe) => recipe.a.filter((a) => getProfile().allergies.includes(a));

// ------- Recettes -------
function recipeCards() {
  const q = normalize(memo.query.trim());
  const list = RECIPES.filter((r) =>
    (!memo.category || r.c === memo.category) &&
    (!q || normalize(`${r.t} ${r.i.map((i) => i[2]).join(' ')}`).includes(q)),
  );
  if (!list.length) return emptyState('search', 'Aucune recette', 'Essaie un autre ingrédient ou une autre catégorie.');
  return html`<div class="recipe-grid">${list.map((r) => {
    const issue = conflicts(r);
    return html`<a class="recipe-card" href="#/cuisine/recette/${r.id}">
      <span class="muted small">${r.c}</span>
      <strong>${r.t}</strong>
      <span class="recipe-meta">${icon('timer', 15)} ${r.min} min · ${r.p} parts</span>
      ${issue.length ? html`<span class="badge tone-warn">${icon('triangle-alert', 14)}${issue.map(allergyLabel).join(', ')}</span>` : ''}
    </a>`;
  })}</div>`;
}

const recipesView = () => html`
  <div class="card">
    <label for="recipe-search"><strong>Recette ou ingrédient</strong></label>
    <input id="recipe-search" type="search" value="${memo.query}" placeholder="Ex. poulet, chocolat, lentilles" autocomplete="off">
    <div class="chips" role="group" aria-label="Catégorie">
      ${['', ...RECIPE_CATEGORIES].map((c) => html`<button class="chip" type="button" data-category="${c}" aria-pressed="${String(memo.category === c)}">${c || 'Toutes'}</button>`)}
    </div>
  </div>
  <div id="recipe-results">${recipeCards()}</div>`;

function mountRecipes(page) {
  const update = () => setHtml(page.querySelector('#recipe-results'), recipeCards());
  page.querySelector('#recipe-search').addEventListener('input', (event) => {
    memo.query = event.target.value;
    update();
  });
  on(page, 'click', '[data-category]', (_e, chip) => {
    memo.category = chip.dataset.category;
    page.querySelectorAll('[data-category]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    update();
  });
}

// ------- Détail d'une recette -------
const scaleNumber = (value) => {
  const rounded = value >= 100 ? Math.round(value / 5) * 5 : value >= 10 ? Math.round(value) : Math.round(value * 4) / 4;
  return String(rounded || value).replace('.', ',');
};

const quantityLabel = ([q, unit], factor) => {
  if (!q) return unit ? `1 ${unit}` : 'selon le goût';
  return `${scaleNumber(q * factor)}${unit ? ` ${unit}` : ''}`;
};

const nextDays = () =>
  Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

function recipeView(id) {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) return emptyState('circle-help', 'Recette introuvable', null, html`<a class="btn" href="#/cuisine/recettes">Toutes les recettes</a>`);
  const servings = memo.servings[id] ?? recipe.p;
  const factor = servings / recipe.p;
  const issue = conflicts(recipe);
  return html`
    <a class="back" href="#/cuisine/recettes">${icon('arrow-left', 18)} Recettes</a>
    <p class="muted small">${recipe.c} · ${recipe.min} min</p>
    <h1 class="page-title">${recipe.t}</h1>

    ${issue.length ? html`<div class="notice notice-warn">${icon('triangle-alert')}<div><strong>Contient : ${issue.map(allergyLabel).join(', ')}</strong> d’après tes allergies.</div></div>` : ''}

    <div class="recipe-layout">
      <section class="card">
        <div class="section-head"><h2>Ingrédients</h2>
          <div class="stepper" role="group" aria-label="Nombre de parts">
            <button class="icon-button" id="less" type="button" aria-label="Moins de parts">${icon('minus', 18)}</button>
            <span><strong>${servings}</strong> parts</span>
            <button class="icon-button" id="more" type="button" aria-label="Plus de parts">${icon('plus', 18)}</button>
          </div>
        </div>
        <ul class="ingredient-list">
          ${recipe.i.map((item) => html`<li><span class="qty">${quantityLabel(item, factor)}</span><span>${item[2]}</span></li>`)}
        </ul>
        <button class="btn" id="to-list" type="button">${icon('shopping-cart', 18)}Ajouter aux courses</button>
        <p class="muted small">Vérifie l’étiquette de chaque produit : les recettes et les fabricants peuvent changer.</p>
      </section>

      <div class="stack-lg">
        <section class="card">
          <h2>Préparation</h2>
          <ol class="steps">${recipe.s.map((step) => html`<li>${step}</li>`)}</ol>
        </section>
        <form class="card" id="to-plan">
          <h2>Ajouter au planning</h2>
          <div class="form-grid two">
            <label>Jour<select id="plan-day">${nextDays().map((d) => html`<option value="${dayKey(d)}">${formatDate(d, { weekday: 'long', day: 'numeric', month: 'short' })}</option>`)}</select></label>
            <label>Repas<select id="plan-meal">${MEALS.map(([value, label]) => html`<option value="${value}">${label}</option>`)}</select></label>
          </div>
          <button class="btn" type="submit">${icon('calendar-days', 18)}Planifier</button>
        </form>
      </div>
    </div>`;
}

function mountRecipe(page, id, refresh) {
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) return;
  const change = (delta) => {
    memo.servings[id] = Math.max(1, Math.min(40, (memo.servings[id] ?? recipe.p) + delta));
    refresh();
  };
  on(page, 'click', '#less', () => change(-1));
  on(page, 'click', '#more', () => change(1));
  on(page, 'click', '#to-list', () => {
    const factor = (memo.servings[id] ?? recipe.p) / recipe.p;
    const added = addShoppingItems(recipe.i.map((item) => shoppingText(item, factor)), recipe.t);
    toast(added ? `${added} ingrédients ajoutés aux courses.` : 'Déjà dans ta liste de courses.');
  });
  on(page, 'submit', '#to-plan', (event) => {
    event.preventDefault();
    const key = `${page.querySelector('#plan-day').value}:${page.querySelector('#plan-meal').value}`;
    save('plan', { ...load('plan', {}), [key]: { recipeId: id, servings: memo.servings[id] ?? recipe.p } });
    toast('Ajouté au planning.');
  });
}

const shoppingText = (item, factor) => {
  const [q, unit, name] = item;
  if (!q) return name;
  return `${name} (${quantityLabel(item, factor)})`;
};

// ------- Planning -------
function weekDays(offset) {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export const plannedToday = () => {
  const plan = load('plan', {});
  const today = dayKey();
  return MEALS.map(([id, label]) => ({ label, recipe: RECIPES.find((r) => r.id === plan[`${today}:${id}`]?.recipeId) })).filter((m) => m.recipe);
};

const recipeOptions = (selected) => RECIPE_CATEGORIES.map((category) => html`
  <optgroup label="${category}">
    ${RECIPES.filter((r) => r.c === category).map((r) => html`<option value="${r.id}" ${r.id === selected ? 'selected' : ''}>${r.t}</option>`)}
  </optgroup>`);

function planView() {
  const days = weekDays(memo.weekOffset);
  const plan = load('plan', {});
  const today = dayKey();
  return html`
    <div class="week-nav">
      <button class="icon-button" id="week-prev" type="button" aria-label="Semaine précédente">${icon('arrow-left', 20)}</button>
      <strong>Semaine du ${formatDate(days[0], { day: 'numeric', month: 'long' })}</strong>
      <button class="icon-button flip" id="week-next" type="button" aria-label="Semaine suivante">${icon('arrow-left', 20)}</button>
    </div>
    <div class="button-row">
      <button class="btn btn-primary" id="plan-list" type="button">${icon('shopping-cart', 18)}Créer la liste de courses</button>
      <button class="btn" id="plan-fill" type="button">${icon('lightbulb', 18)}Compléter avec des idées</button>
      <button class="btn" id="plan-clear" type="button">${icon('trash-2', 18)}Vider la semaine</button>
    </div>
    <div class="plan-grid">
      ${days.map((day) => {
        const key = dayKey(day);
        return html`<section class="card plan-day ${key === today ? 'is-today' : ''}">
          <h3>${formatDate(day, { weekday: 'long', day: 'numeric' })}${key === today ? html` <span class="badge tone-soft">Aujourd’hui</span>` : ''}</h3>
          ${MEALS.map(([meal, label]) => {
            const slot = plan[`${key}:${meal}`];
            return html`<label class="plan-slot"><span class="muted small">${label}</span>
              <select data-slot="${key}:${meal}"><option value="">À choisir</option>${recipeOptions(slot?.recipeId)}</select>
              ${slot ? html`<a class="small" href="#/cuisine/recette/${slot.recipeId}">Voir la recette</a>` : ''}
            </label>`;
          })}
        </section>`;
      })}
    </div>`;
}

function mountPlan(page, refresh) {
  const keysOfWeek = () =>
    weekDays(memo.weekOffset).flatMap((day) => MEALS.map(([meal]) => `${dayKey(day)}:${meal}`));

  on(page, 'click', '#week-prev', () => { memo.weekOffset -= 1; refresh(); });
  on(page, 'click', '#week-next', () => { memo.weekOffset += 1; refresh(); });

  on(page, 'change', '[data-slot]', (_e, select) => {
    const plan = load('plan', {});
    if (select.value) {
      const recipe = RECIPES.find((r) => r.id === select.value);
      plan[select.dataset.slot] = { recipeId: recipe.id, servings: recipe.p };
    } else {
      delete plan[select.dataset.slot];
    }
    save('plan', plan);
    refresh();
  });

  on(page, 'click', '#plan-fill', () => {
    const allergies = getProfile().allergies;
    const pool = RECIPES.filter((r) => r.c === 'Plat' && !r.a.some((a) => allergies.includes(a)));
    if (!pool.length) {
      toast('Aucune recette compatible avec tes allergies.');
      return;
    }
    const plan = load('plan', {});
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    let index = 0;
    for (const key of keysOfWeek()) {
      if (plan[key]) continue;
      const recipe = shuffled[index % shuffled.length];
      plan[key] = { recipeId: recipe.id, servings: recipe.p };
      index += 1;
    }
    save('plan', plan);
    refresh();
    toast('Semaine complétée.');
  });

  on(page, 'click', '#plan-clear', () => {
    const before = load('plan', {});
    const plan = { ...before };
    keysOfWeek().forEach((key) => delete plan[key]);
    save('plan', plan);
    refresh();
    toast('Semaine vidée.', { label: 'Annuler', run: () => { save('plan', before); refresh(); } });
  });

  on(page, 'click', '#plan-list', () => {
    const plan = load('plan', {});
    const totals = new Map();
    for (const key of keysOfWeek()) {
      const slot = plan[key];
      const recipe = RECIPES.find((r) => r.id === slot?.recipeId);
      if (!recipe) continue;
      const factor = (slot.servings ?? recipe.p) / recipe.p;
      for (const [q, unit, name] of recipe.i) {
        const id = `${name}|${unit}`;
        const total = totals.get(id) ?? { q: 0, unit, name };
        total.q += q * factor;
        totals.set(id, total);
      }
    }
    if (!totals.size) {
      toast('Aucune recette planifiée cette semaine.');
      return;
    }
    const added = addShoppingItems([...totals.values()].map((t) => shoppingText([t.q, t.unit, t.name], 1)), 'Planning');
    toast(`${added} ingrédients ajoutés aux courses.`);
  });
}

// ------- Courses -------
function itemWarning(text) {
  if (/sans gluten/i.test(normalize(text))) return null;
  const { findings } = analyzeIngredients(text);
  return findings.length ? [...new Set(findings.map((f) => f.label))].join(', ') : null;
}

function shoppingItems() {
  const items = load('shopping', []);
  if (!items.length) {
    return emptyState('shopping-cart', 'Ta liste est vide', 'Ajoute un article, une recette ou ton planning.');
  }
  const sorted = [...items.filter((i) => !i.done), ...items.filter((i) => i.done)];
  const doneCount = items.filter((i) => i.done).length;
  return html`
    <ul class="shopping-list">
      ${sorted.map((item) => {
        const warning = item.done ? null : itemWarning(item.text);
        return html`<li class="${item.done ? 'is-done' : ''}">
          <label class="check-line"><input type="checkbox" data-item="${item.id}" ${item.done ? 'checked' : ''}><span class="row-main">
            <span>${item.text}</span>
            ${warning ? html`<small class="warn-text">${icon('triangle-alert', 13)} Choisis une version sans gluten (${warning})</small>` : ''}
          </span></label>
          <button class="icon-button" type="button" data-remove="${item.id}" aria-label="Supprimer ${item.text}">${icon('x', 18)}</button>
        </li>`;
      })}
    </ul>
    ${doneCount ? html`<div class="button-row"><button class="btn" id="clear-done" type="button">${icon('trash-2', 18)}Retirer les articles cochés (${doneCount})</button></div>` : ''}`;
}

const shoppingView = () => html`
  <form class="card" id="item-form">
    <label for="item-text"><strong>Ajouter un article</strong></label>
    <div class="input-group">
      <input id="item-text" autocomplete="off" placeholder="Ex. pâtes sans gluten" maxlength="150" required>
      <button class="btn btn-primary" type="submit">${icon('plus', 18)}Ajouter</button>
    </div>
  </form>
  <div id="shopping">${shoppingItems()}</div>`;

function mountShopping(page) {
  const redraw = () => setHtml(page.querySelector('#shopping'), shoppingItems());

  on(page, 'submit', '#item-form', (event) => {
    event.preventDefault();
    const input = page.querySelector('#item-text');
    const text = input.value.trim();
    if (!text) return;
    save('shopping', [...load('shopping', []), { id: newId(), text, done: false }]);
    input.value = '';
    input.focus();
    redraw();
  });

  on(page, 'change', '[data-item]', (_e, box) => {
    save('shopping', load('shopping', []).map((i) => (i.id === box.dataset.item ? { ...i, done: box.checked } : i)));
    redraw();
  });

  on(page, 'click', '[data-remove]', (_e, button) => {
    const before = load('shopping', []);
    save('shopping', before.filter((i) => i.id !== button.dataset.remove));
    redraw();
    toast('Article supprimé.', { label: 'Annuler', run: () => { save('shopping', before); redraw(); } });
  });

  on(page, 'click', '#clear-done', () => {
    const before = load('shopping', []);
    save('shopping', before.filter((i) => !i.done));
    redraw();
    toast('Articles retirés.', { label: 'Annuler', run: () => { save('shopping', before); redraw(); } });
  });
}

// ------- Remplacer -------
const blend = (grams) => [
  ['Farine de riz', Math.round(grams * 0.6)],
  ['Fécule de maïs ou de pomme de terre', Math.round(grams * 0.2)],
  ['Poudre d’amande ou farine de sarrasin', Math.round(grams * 0.2)],
];

const blendResult = (grams) => {
  if (!(grams > 0)) return html`<p class="muted">Indique une quantité.</p>`;
  return html`<ul class="ingredient-list">${blend(grams).map(([name, g]) => html`<li><span class="qty">${g} g</span><span>${name}</span></li>`)}</ul>`;
};

const replaceView = () => html`
  <section class="card">
    <h2>Calculateur de farine pour gâteaux</h2>
    <label for="flour">Farine de blé dans la recette (g)</label>
    <input id="flour" type="number" min="1" max="5000" inputmode="numeric" value="250">
    <div id="flour-result" aria-live="polite">${blendResult(250)}</div>
    <p class="muted small">Point de départ pour gâteaux et biscuits. La texture peut varier : ajoute un peu de liquide si la pâte est trop épaisse.</p>
  </section>
  <section class="card">
    <h2>Par quoi remplacer ?</h2>
    <dl class="substitutions">${SUBSTITUTIONS.map((s) => html`<div><dt>${s.from}</dt><dd>${s.to}</dd></div>`)}</dl>
  </section>`;

function mountReplace(page) {
  page.querySelector('#flour').addEventListener('input', (event) => {
    setHtml(page.querySelector('#flour-result'), blendResult(Number(event.target.value)));
  });
}
