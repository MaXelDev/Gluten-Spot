import { dayKey, formatDate, html, icon, on, setHtml } from '../lib/dom.js';
import { daysSinceExposure } from '../lib/insights.js';
import { TIPS } from '../data/guides.js';
import { backupReminderDue, getProfile, lastBackupAt, load, saveProfile, snoozeBackupReminder } from '../lib/store.js';
import { getCachedGlutenRecalls, openSearch } from './check.js';
import { plannedToday } from './cook.js';
import { canShareBackup, downloadBackup, shareBackup } from './settings.js';

export const title = () => 'Accueil';

const TILES = [
  { href: '#/sorties/carte-resto', icon: 'languages', label: 'Carte de restaurant', hint: '15 langues, hors ligne' },
  { href: '#/sorties/adresses', icon: 'map-pin', label: 'Adresses', hint: 'Où manger et acheter' },
  { href: '#/verifier/ingredients', icon: 'list-checks', label: 'Analyser une liste', hint: 'Termes à risque surlignés' },
  { href: '#/verifier/dictionnaire', icon: 'book-open', label: 'Dictionnaire', hint: 'Cet ingrédient est-il sûr ?' },
  { href: '#/cuisine/recettes', icon: 'chef-hat', label: 'Recettes', hint: '20 idées sans gluten' },
  { href: '#/cuisine/courses', icon: 'shopping-cart', label: 'Courses', hint: 'Avec alertes' },
  { href: '#/suivi/journal', icon: 'clipboard-list', label: 'Journal', hint: 'Repas et symptômes' },
  { href: '#/guides', icon: 'lightbulb', label: 'Guides', hint: 'Étiquettes, cuisine, proches' },
];

const dailyTip = () => {
  const day = Math.floor(new Date(`${dayKey()}T12:00`).getTime() / 86400000);
  return TIPS[day % TIPS.length];
};

const onboarding = () => html`
  <section class="card onboarding">
    <h2>Quel est ton niveau de précaution ?</h2>
    <p>Il adapte les conseils en cas de traces possibles. Tu pourras le modifier dans les réglages.</p>
    <div class="choice-grid">
      <button class="choice" type="button" data-strictness="strict"><strong>Strict</strong><span>Maladie cœliaque ou forte réaction : même les traces sont à éviter.</span></button>
      <button class="choice" type="button" data-strictness="moderate"><strong>Modéré</strong><span>Sensibilité plus légère : les traces sont signalées, à toi de décider.</span></button>
    </div>
    <p class="muted small">Sans diagnostic, choisis « Strict » par prudence et parles-en à ton médecin. N’arrête pas le gluten avant un test de dépistage de la maladie cœliaque.</p>
  </section>`;

function backupReminder() {
  if (!backupReminderDue()) return '';
  const at = lastBackupAt();
  return html`<section class="notice notice-warn">${icon('triangle-alert')}
    <div>
      <strong>Pense à sauvegarder tes données</strong>
      <p class="small">${at ? `Ta dernière sauvegarde date du ${formatDate(new Date(at))}.` : 'Tu n’as encore fait aucune sauvegarde.'} Tes données n’existent que sur cet appareil.</p>
      <div class="button-row">
        <button class="btn" id="backup-now" type="button">${icon('download', 18)}Sauvegarder</button>
        <button class="btn" id="backup-later" type="button">Plus tard</button>
      </div>
    </div>
  </section>`;
}

function todayCard() {
  const meals = plannedToday();
  const entries = load('journal', []);
  const since = daysSinceExposure(entries);
  const shopping = load('shopping', []).filter((i) => !i.done).length;
  if (!meals.length && since === null && !shopping) return '';
  return html`<section class="card today">
    <h2>Aujourd’hui</h2>
    <ul class="today-list">
      ${meals.map((m) => html`<li>${icon('utensils', 18)}<a href="#/cuisine/recette/${m.recipe.id}"><span class="muted">${m.label} :</span> ${m.recipe.t}</a></li>`)}
      ${shopping ? html`<li>${icon('shopping-cart', 18)}<a href="#/cuisine/courses">${shopping} article${shopping > 1 ? 's' : ''} à acheter</a></li>` : ''}
      ${since !== null ? html`<li>${icon('shield-check', 18)}<a href="#/suivi/tendances">${since === 0 ? 'Exposition notée aujourd’hui' : `${since} jour${since > 1 ? 's' : ''} depuis la dernière exposition notée`}</a></li>` : ''}
    </ul>
  </section>`;
}

export function render() {
  const profile = getProfile();
  return html`
    <section class="hero">
      <h1>Sans gluten, sans deviner.</h1>
      <p>Scanne un produit avant de l’acheter ou de le manger.</p>
      <a class="btn btn-hero" href="#/verifier/scan">${icon('scan-barcode', 24)}Scanner un produit</a>
      <form id="quick-search" class="hero-search" role="search">
        <label class="visually-hidden" for="quick-input">Chercher un produit</label>
        <input id="quick-input" type="search" placeholder="Ou cherche un produit" autocomplete="off">
        <button class="icon-button" type="submit" aria-label="Chercher">${icon('search', 20)}</button>
      </form>
    </section>

    ${profile.onboarded ? '' : onboarding()}
    ${backupReminder()}
    <div id="recall-alert"></div>
    ${todayCard()}

    <section>
      <h2 class="visually-hidden">Raccourcis</h2>
      <div class="tile-grid">
        ${TILES.map((t) => html`<a class="tile" href="${t.href}"><span class="tile-icon">${icon(t.icon, 22)}</span><strong>${t.label}</strong><small>${t.hint}</small></a>`)}
      </div>
    </section>

    <aside class="tip">${icon('lightbulb', 22)}<div><strong>Le savais-tu ?</strong><p>${dailyTip()}</p></div></aside>

    <p class="muted small disclaimer">Gluten Spot aide à repérer les risques, sans remplacer l’étiquette du produit ni l’avis d’un professionnel de santé.</p>`;
}

const RECENT_MS = 30 * 86400000;

export function mount(page, { refresh }) {
  let alive = true;

  on(page, 'click', '[data-strictness]', (_e, button) => {
    saveProfile({ strictness: button.dataset.strictness, onboarded: true });
    refresh();
  });

  on(page, 'click', '#backup-now', async () => {
    const done = canShareBackup() ? await shareBackup() : downloadBackup();
    if (done && alive) refresh();
  });

  on(page, 'click', '#backup-later', () => {
    snoozeBackupReminder();
    refresh();
  });

  on(page, 'submit', '#quick-search', (event) => {
    event.preventDefault();
    const query = page.querySelector('#quick-input').value.trim();
    if (query) openSearch(query);
  });

  getCachedGlutenRecalls()
    .then((recalls) => {
      if (!alive) return;
      const recent = recalls.filter((r) => Date.now() - new Date(r.date).getTime() < RECENT_MS);
      if (!recent.length) return;
      setHtml(page.querySelector('#recall-alert'), html`
        <a class="notice notice-warn notice-link" href="#/verifier/rappels">${icon('bell')}
          <div><strong>${recent.length} rappel${recent.length > 1 ? 's' : ''} lié${recent.length > 1 ? 's' : ''} au gluten ce mois-ci</strong>
          <span class="small">Dernier : ${recent[0].product || recent[0].brand}, le ${formatDate(recent[0].date, { day: 'numeric', month: 'short' })}</span></div>
          ${icon('chevron-right', 18)}
        </a>`);
    })
    .catch(() => {
      // Ces alertes sont un complément : l'accueil reste utilisable sans connexion.
    });

  return () => { alive = false; };
}
