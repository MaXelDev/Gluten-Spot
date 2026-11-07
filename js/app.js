import { applyTheme, html, icon, setHtml } from './lib/dom.js';
import { getProfile, hasPersonalData, onUnsavedChange, protectStorage } from './lib/store.js';
import * as home from './views/home.js';
import * as check from './views/check.js';
import * as product from './views/product.js';
import * as places from './views/places.js';
import * as cook from './views/cook.js';
import * as track from './views/track.js';
import * as guides from './views/guides.js';
import * as settings from './views/settings.js';

const ROUTES = {
  '': home,
  verifier: check,
  produit: product,
  sorties: places,
  cuisine: cook,
  suivi: track,
  guides,
  reglages: settings,
};

const NAV = [
  { id: '', href: '#/', icon: 'house', label: 'Accueil' },
  { id: 'verifier', href: '#/verifier', icon: 'scan-barcode', label: 'Vérifier', also: ['produit'] },
  { id: 'sorties', href: '#/sorties', icon: 'map-pin', label: 'Sorties' },
  { id: 'cuisine', href: '#/cuisine', icon: 'chef-hat', label: 'Cuisine' },
  { id: 'suivi', href: '#/suivi', icon: 'activity', label: 'Suivi' },
];

const main = document.getElementById('main');
let cleanup = null;

function renderNav(section) {
  const links = (extra = []) =>
    [...NAV, ...extra].map((item) => {
      const active = item.id === section || item.also?.includes(section);
      return html`<a href="${item.href}" ${active ? html`aria-current="page"` : ''}>${icon(item.icon, 22)}<span>${item.label}</span></a>`;
    });
  setHtml(document.getElementById('bottom-nav'), links());
  setHtml(document.getElementById('side-nav'), links([
    { id: 'guides', href: '#/guides', icon: 'book-open', label: 'Guides' },
    { id: 'reglages', href: '#/reglages', icon: 'settings', label: 'Réglages' },
  ]));
}

function parseHash() {
  const [section = '', ...params] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  return { section: section in ROUTES ? section : '', params };
}

/** Affiche la vue courante. `keepScroll` conserve la position lors d'une simple mise à jour. */
function renderRoute({ keepScroll = false } = {}) {
  cleanup?.();
  cleanup = null;

  const { section, params } = parseHash();
  const view = ROUTES[section];
  const activeId = document.activeElement?.id;

  const page = document.createElement('div');
  page.className = 'page';
  setHtml(page, view.render({ params }));
  main.replaceChildren(page);

  renderNav(section);
  document.title = view.title ? `${view.title(params)} · Gluten Spot` : 'Gluten Spot';
  cleanup = view.mount?.(page, { params, refresh: () => renderRoute({ keepScroll: true }) }) ?? null;

  if (keepScroll) {
    if (activeId) document.getElementById(activeId)?.focus({ preventScroll: true });
  } else {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}

const storageAlert = document.getElementById('storage-alert');
setHtml(storageAlert, html`${icon('triangle-alert')}<div><strong>Tes dernières modifications ne sont pas enregistrées.</strong> Le stockage du navigateur est plein ou bloqué : <a href="#/reglages">exporte une sauvegarde</a> avant de fermer la page.</div>`);
onUnsavedChange((unsaved) => {
  storageAlert.hidden = !unsaved;
});

// Sans donnée personnelle, inutile de solliciter le navigateur (Firefox affiche une demande).
if (hasPersonalData()) protectStorage();

applyTheme(getProfile().theme);
setHtml(document.getElementById('settings-link'), icon('settings', 22));
window.addEventListener('hashchange', () => renderRoute());
renderRoute();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => console.warn('Mode hors ligne indisponible', error));
  });
}
