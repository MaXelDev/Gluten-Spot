import { dateTimeLocal, dayKey, emptyState, formatDate, formatDateTime, html, icon, on, setHtml, tabs, toast } from '../lib/dom.js';
import { analyzeIngredients } from '../lib/gluten.js';
import { dailySeverity, daysSinceExposure, foodInsights, summarize, SYMPTOM_WINDOW_HOURS } from '../lib/insights.js';
import { SYMPTOMS } from '../data/guides.js';
import { load, newId, save } from '../lib/store.js';

const TABS = [
  { id: 'journal', href: '#/suivi/journal', icon: 'clipboard-list', label: 'Journal' },
  { id: 'tendances', href: '#/suivi/tendances', icon: 'activity', label: 'Tendances' },
  { id: 'rapport', href: '#/suivi/rapport', icon: 'file-text', label: 'Rapport médecin' },
];

const TYPE = {
  meal: { label: 'Repas', icon: 'utensils' },
  symptom: { label: 'Symptôme', icon: 'activity' },
  exposure: { label: 'Exposition au gluten', icon: 'triangle-alert' },
};

const PAGE_SIZE = 30;
const memo = { formType: 'meal', shown: PAGE_SIZE, reportDays: 30 };

const journal = () => load('journal', []).slice().sort((a, b) => new Date(b.at) - new Date(a.at));
const intensityLabel = (n) => ['', 'très légère', 'légère', 'modérée', 'forte', 'très forte'][n] ?? '';

/** Enregistre le journal. En cas d'échec, l'avertissement remplace le message de réussite. */
function saveJournal(entries, message, action) {
  if (save('journal', entries)) {
    toast(message, action);
    return;
  }
  toast('Non enregistré : le stockage du navigateur est plein ou bloqué. Exporte une sauvegarde avant de fermer la page.', {
    label: 'Réglages',
    run: () => { location.hash = '#/reglages'; },
  });
}

export const title = () => 'Suivi';

export function render({ params }) {
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'journal';
  const views = { journal: journalView, tendances: trendsView, rapport: reportView };
  return html`<h1 class="page-title no-print">Suivi santé</h1><div class="no-print">${tabs(TABS, tab)}</div>${views[tab]()}`;
}

export function mount(page, { params, refresh }) {
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'journal';
  const mounts = { journal: mountJournal, tendances: mountChart, rapport: mountReport };
  return mounts[tab]?.(page, refresh);
}

// ------- Journal -------
function entryBody(entry) {
  if (entry.type === 'symptom') {
    return html`<strong>${(entry.symptoms ?? []).join(', ') || 'Symptôme'}</strong>
      <span class="muted small">Intensité ${entry.intensity}/5, ${intensityLabel(entry.intensity)}</span>`;
  }
  const risky = entry.type === 'meal' && analyzeIngredients(entry.text ?? '').findings.filter((f) => !/sans gluten/i.test(entry.text));
  return html`<strong>${entry.text || TYPE[entry.type].label}</strong>
    ${risky?.length ? html`<span class="badge tone-warn">${icon('triangle-alert', 14)}À vérifier : ${[...new Set(risky.map((f) => f.label))].join(', ')}</span>` : ''}`;
}

function entriesList() {
  const entries = journal();
  if (!entries.length) {
    return emptyState('clipboard-list', 'Ton journal est vide', 'Note tes repas et tes symptômes pour repérer des tendances et préparer tes rendez-vous.');
  }
  const visible = entries.slice(0, memo.shown);
  const days = new Map();
  for (const entry of visible) {
    const key = dayKey(entry.at);
    days.set(key, [...(days.get(key) ?? []), entry]);
  }
  return html`
    ${[...days.entries()].map(([key, list]) => html`
      <section class="day-group">
        <h3>${formatDate(`${key}T12:00`, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <ul class="entry-list">
          ${list.map((e) => html`<li class="card entry entry-${e.type}">
            <span class="entry-icon">${icon(TYPE[e.type].icon, 18)}</span>
            <div class="row-main">
              <span class="muted small">${new Date(e.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${TYPE[e.type].label}</span>
              ${entryBody(e)}
              ${e.note ? html`<span class="small">${e.note}</span>` : ''}
            </div>
            <button class="icon-button" type="button" data-delete="${e.id}" aria-label="Supprimer">${icon('trash-2', 18)}</button>
          </li>`)}
        </ul>
      </section>`)}
    ${entries.length > memo.shown ? html`<div class="button-row center"><button class="btn" id="show-more" type="button">Afficher plus</button></div>` : ''}`;
}

const journalView = () => html`
  <form class="card" id="entry-form">
    <fieldset class="segmented">
      <legend class="visually-hidden">Type d’entrée</legend>
      ${Object.entries(TYPE).map(([id, t]) => html`
        <label><input type="radio" name="entry-type" value="${id}" ${memo.formType === id ? 'checked' : ''}><span>${icon(t.icon, 16)}${id === 'exposure' ? 'Exposition' : t.label}</span></label>`)}
    </fieldset>

    <label id="field-text"><span id="text-label">Qu’as-tu mangé ?</span>
      <textarea id="entry-text" rows="2" maxlength="500"></textarea>
      <small class="muted">Sépare les aliments par des virgules pour de meilleures tendances.</small>
    </label>

    <div id="field-symptoms" hidden>
      <fieldset class="chip-field"><legend>Symptômes</legend>
        <div class="chips">${SYMPTOMS.map((s) => html`<label class="chip chip-check"><input type="checkbox" name="symptom" value="${s}"><span>${s}</span></label>`)}</div>
      </fieldset>
      <label>Intensité : <output id="intensity-value">3/5, modérée</output>
        <input id="entry-intensity" type="range" min="1" max="5" value="3">
      </label>
    </div>

    <div class="form-grid two">
      <label>Date et heure<input id="entry-at" type="datetime-local" value="${dateTimeLocal()}" required></label>
      <label>Note (facultatif)<input id="entry-note" maxlength="300"></label>
    </div>
    <p id="entry-error" class="field-error" hidden></p>
    <button class="btn btn-primary" type="submit">${icon('plus', 18)}Ajouter au journal</button>
  </form>
  <div id="entries">${entriesList()}</div>`;

function mountJournal(page) {
  const entries = page.querySelector('#entries');
  const redraw = () => setHtml(entries, entriesList());

  const applyType = () => {
    const type = memo.formType;
    page.querySelector('#field-symptoms').hidden = type !== 'symptom';
    page.querySelector('#field-text').hidden = type === 'symptom';
    page.querySelector('#text-label').textContent = type === 'exposure' ? 'Que s’est-il passé ?' : 'Qu’as-tu mangé ?';
    page.querySelector('#field-text small').hidden = type !== 'meal';
    page.querySelector('#entry-error').hidden = true;
  };

  on(page, 'change', 'input[name="entry-type"]', (_e, radio) => {
    memo.formType = radio.value;
    applyType();
  });

  on(page, 'input', '#entry-intensity', (_e, range) => {
    page.querySelector('#intensity-value').textContent = `${range.value}/5, ${intensityLabel(Number(range.value))}`;
  });

  on(page, 'submit', '#entry-form', (event) => {
    event.preventDefault();
    const form = event.target;
    const errorBox = page.querySelector('#entry-error');
    const type = memo.formType;
    const text = page.querySelector('#entry-text').value.trim();
    const symptoms = [...form.querySelectorAll('input[name="symptom"]:checked')].map((c) => c.value);
    const at = page.querySelector('#entry-at').value;

    const problem =
      (type === 'symptom' && !symptoms.length && 'Choisis au moins un symptôme.') ||
      (type === 'meal' && !text && 'Décris ce que tu as mangé.') ||
      (type === 'exposure' && !text && 'Décris ce qui s’est passé.') ||
      (Number.isNaN(new Date(at).getTime()) && 'Indique une date valide.');
    if (problem) {
      errorBox.textContent = problem;
      errorBox.hidden = false;
      return;
    }

    const entry = {
      id: newId(), type, at: new Date(at).toISOString(),
      note: page.querySelector('#entry-note').value.trim(),
      ...(type === 'symptom' ? { symptoms, intensity: Number(page.querySelector('#entry-intensity').value) } : { text }),
    };
    saveJournal([...load('journal', []), entry], 'Ajouté au journal.');

    form.reset();
    form.querySelector(`input[name="entry-type"][value="${type}"]`).checked = true;
    page.querySelector('#entry-at').value = dateTimeLocal();
    page.querySelector('#intensity-value').textContent = '3/5, modérée';
    applyType();
    redraw();
  });

  on(page, 'click', '[data-delete]', (_e, button) => {
    const before = load('journal', []);
    saveJournal(before.filter((e) => e.id !== button.dataset.delete), 'Entrée supprimée.', {
      label: 'Annuler',
      run: () => {
        saveJournal(before, 'Entrée restaurée.');
        redraw();
      },
    });
    redraw();
  });

  on(page, 'click', '#show-more', () => {
    memo.shown += PAGE_SIZE;
    redraw();
  });

  applyType();
}

// ------- Graphique -------
function severityChart(days) {
  const short = (d) => formatDate(d, { day: 'numeric', month: 'short' });
  return html`
    <figure class="chart" id="severity-chart">
      <figcaption>Intensité maximale des symptômes par jour</figcaption>
      <div class="chart-plot">
        <div class="chart-axis" aria-hidden="true">${[5, 3, 1].map((n) => html`<span style="bottom:${(n / 5) * 100}%">${n}</span>`)}</div>
        <div class="chart-bars" role="img" aria-label="Graphique de ${days.length} jours. Les valeurs sont disponibles dans le tableau ci-dessous.">
          ${days.map((d) => html`<div class="chart-col" data-tip="${short(d.date)} : ${d.value ? `${d.value}/5${d.symptoms.length ? ` (${d.symptoms.join(', ')})` : ''}` : 'aucun symptôme'}">
            <span class="chart-bar" style="height:${(d.value / 5) * 100}%"></span>
          </div>`)}
        </div>
        <div class="chart-tip" id="chart-tip" hidden></div>
      </div>
      <div class="chart-dates" aria-hidden="true"><span>${short(days[0].date)}</span><span>${short(days.at(-1).date)}</span></div>
    </figure>
    <details class="chart-table no-print-summary">
      <summary>Voir sous forme de tableau</summary>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Date</th><th>Intensité</th><th>Symptômes</th></tr></thead>
        <tbody>${days.filter((d) => d.value).map((d) => html`<tr><td>${short(d.date)}</td><td>${d.value}/5</td><td>${d.symptoms.join(', ')}</td></tr>`)}</tbody>
      </table></div>
    </details>`;
}

function mountChart(page) {
  const show = (_e, col) => {
    const tip = page.querySelector('#chart-tip');
    if (!tip) return;
    tip.textContent = col.dataset.tip;
    tip.hidden = false;
    const plot = tip.parentElement.getBoundingClientRect();
    const rect = col.getBoundingClientRect();
    const half = tip.offsetWidth / 2;
    const center = rect.left - plot.left + rect.width / 2;
    tip.style.left = `${Math.min(Math.max(half, center), plot.width - half)}px`;
  };
  on(page, 'mouseover', '.chart-col', show);
  on(page, 'click', '.chart-col', show);
  page.addEventListener('mouseout', (event) => {
    if (!event.relatedTarget?.closest?.('.chart-col')) {
      const tip = page.querySelector('#chart-tip');
      if (tip) tip.hidden = true;
    }
  });
}

// ------- Tendances -------
const stat = (value, label) => html`<div class="stat"><strong>${value}</strong><span>${label}</span></div>`;

function trendsView() {
  const entries = load('journal', []);
  if (!entries.length) {
    return emptyState('activity', 'Pas encore de tendances', 'Commence par noter tes repas et tes symptômes.', html`<a class="btn btn-primary" href="#/suivi/journal">Ouvrir le journal</a>`);
  }
  const summary = summarize(entries, 30);
  const since = daysSinceExposure(entries);
  const insights = foodInsights(entries);
  const notable = insights.foods.filter((f) => f.notable);

  return html`
    <div class="stats">
      ${stat(`${summary.daysWithoutSymptoms}/30`, 'jours sans symptôme')}
      ${stat(since === null ? '—' : since, since === null ? 'aucune exposition notée' : `${since > 1 ? 'jours' : 'jour'} depuis la dernière exposition`)}
      ${stat(summary.topSymptoms[0]?.name ?? '—', 'symptôme le plus fréquent')}
    </div>
    <section class="card">${severityChart(dailySeverity(entries, 30))}</section>
    <section class="card">
      <h2>Aliments à surveiller</h2>
      ${insights.foods.length === 0
        ? html`<p class="muted">Pas encore assez de données. Il faut au moins 3 repas contenant le même aliment, ainsi que des symptômes notés.</p>`
        : html`
          ${notable.length
            ? html`<p>Ces aliments sont suivis de symptômes plus souvent que tes repas en général (${Math.round(insights.baseline * 100)} %).</p>`
            : html`<p>Aucun aliment ne se distingue nettement de ta moyenne (${Math.round(insights.baseline * 100)} % des repas sont suivis de symptômes).</p>`}
          <div class="table-wrap"><table class="data-table">
            <thead><tr><th>Aliment</th><th>Repas</th><th>Suivis de symptômes sous ${SYMPTOM_WINDOW_HOURS} h</th></tr></thead>
            <tbody>${insights.foods.slice(0, 12).map((f) => html`<tr class="${f.notable ? 'row-notable' : ''}">
              <td>${f.notable ? html`${icon('triangle-alert', 14)} ` : ''}${f.food}</td><td>${f.count}</td><td>${f.followed} (${Math.round(f.rate * 100)} %)</td></tr>`)}</tbody>
          </table></div>`}
      <p class="muted small">Ce sont des pistes à discuter avec un professionnel de santé, pas un diagnostic. Une coïncidence reste possible.</p>
    </section>`;
}

// ------- Rapport -------
function reportBody(days) {
  const entries = load('journal', []);
  const summary = summarize(entries, days);
  const notable = foodInsights(summary.entries).foods.filter((f) => f.notable);
  return html`
    <header class="report-head">
      <h2>Journal alimentaire et symptômes</h2>
      <p class="muted">${days} derniers jours, jusqu’au ${formatDate(new Date())}. Données saisies par la personne, générées avec Gluten Spot.</p>
    </header>
    <div class="stats">
      ${stat(summary.daysWithSymptoms, summary.daysWithSymptoms > 1 ? 'jours avec symptômes' : 'jour avec symptômes')}
      ${stat(summary.symptomCount, summary.symptomCount > 1 ? 'symptômes notés' : 'symptôme noté')}
      ${stat(summary.exposures, summary.exposures > 1 ? 'expositions notées' : 'exposition notée')}
      ${stat(summary.meals, summary.meals > 1 ? 'repas notés' : 'repas noté')}
    </div>
    ${days <= 90 ? html`<section class="report-section">${severityChart(dailySeverity(entries, days))}</section>` : ''}
    <section class="report-section"><h3>Symptômes les plus fréquents</h3>
      ${summary.topSymptoms.length
        ? html`<ul>${summary.topSymptoms.map((s) => html`<li>${s.name} : ${s.count} fois</li>`)}</ul>`
        : html`<p class="muted">Aucun symptôme noté sur la période.</p>`}
    </section>
    ${notable.length ? html`<section class="report-section"><h3>Associations à discuter</h3>
      <ul>${notable.map((f) => html`<li>${f.food} : ${f.followed} repas sur ${f.count} suivis de symptômes sous ${SYMPTOM_WINDOW_HOURS} h</li>`)}</ul></section>` : ''}
    <section class="report-section"><h3>Détail</h3>
      ${summary.entries.length ? html`<div class="table-wrap"><table class="data-table report-table">
        <thead><tr><th>Date</th><th>Type</th><th>Détail</th></tr></thead>
        <tbody>${summary.entries.map((e) => html`<tr>
          <td>${formatDateTime(e.at)}</td><td>${TYPE[e.type].label}</td>
          <td>${e.type === 'symptom' ? `${(e.symptoms ?? []).join(', ')} (${e.intensity}/5)` : e.text}${e.note ? ` — ${e.note}` : ''}</td></tr>`)}</tbody>
      </table></div>` : html`<p class="muted">Aucune entrée sur la période.</p>`}
    </section>`;
}

const reportView = () => html`
  <div class="card no-print">
    <label for="report-days"><strong>Période</strong></label>
    <select id="report-days">${[7, 14, 30, 90].map((d) => html`<option value="${d}" ${d === memo.reportDays ? 'selected' : ''}>${d} derniers jours</option>`)}</select>
    <div class="button-row"><button class="btn btn-primary" id="report-print" type="button">${icon('printer', 18)}Imprimer ou enregistrer en PDF</button></div>
    <p class="muted small">Dans la fenêtre d’impression, choisis « Enregistrer au format PDF ».</p>
  </div>
  <article class="report card" id="report">${reportBody(memo.reportDays)}</article>`;

function mountReport(page) {
  on(page, 'change', '#report-days', (_e, select) => {
    memo.reportDays = Number(select.value);
    setHtml(page.querySelector('#report'), reportBody(memo.reportDays));
  });
  on(page, 'click', '#report-print', () => window.print());
  mountChart(page);
}
