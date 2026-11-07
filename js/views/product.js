import { emptyState, formatDate, html, icon, loading, on, safeUrl, setHtml, toast } from '../lib/dom.js';
import { fetchProduct, findAlternatives, recallsForBarcode } from '../lib/api.js';
import { highlightSegments, productVerdict } from '../lib/gluten.js';
import { ALLERGIES } from '../data/guides.js';
import { addShoppingItems, cachedProduct, getProfile, isFavorite, rememberProduct, toggleFavorite } from '../lib/store.js';

export const title = () => 'Produit';

export const badge = (verdict) =>
  html`<span class="badge tone-${verdict.tone}">${icon(verdict.icon, 14)}${verdict.short}</span>`;

export const productName = (p) => p.product_name_fr || p.product_name || 'Produit sans nom';

const thumb = (p) => {
  const src = safeUrl(p.image_front_small_url);
  return src
    ? html`<img class="thumb" src="${src}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : html`<span class="thumb thumb-empty">${icon('image', 20)}</span>`;
};

/** Ligne de produit réutilisée dans les recherches, l'historique et les alternatives. */
export function productRow(p, profile = getProfile()) {
  return html`<a class="row-card" href="#/produit/${p.code}">
    ${thumb(p)}
    <span class="row-main">
      <strong>${productName(p)}</strong>
      ${p.brands ? html`<small>${p.brands}</small>` : ''}
    </span>
    ${badge(productVerdict(p, profile))}
  </a>`;
}

export const highlightedText = (text, analysis) =>
  highlightSegments(text, analysis).map((part) =>
    part.level ? html`<mark class="mark-${part.level}" title="${part.why}">${part.text}</mark>` : part.text,
  );

const allergyLabel = (id) => ALLERGIES.find((a) => a.id === id)?.label ?? id;

function findingList(analysis) {
  const seen = new Set();
  const items = analysis.findings.filter((f) => {
    const key = `${f.label}|${f.inTraces}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (!items.length) return '';
  return html`<ul class="finding-list">
    ${items.map(
      (f) => html`<li><strong>${f.label}${f.inTraces ? ' (traces)' : ''}</strong><span>${f.why}</span></li>`,
    )}
  </ul>`;
}

function renderProduct(product, { offlineDate } = {}) {
  const profile = getProfile();
  const verdict = productVerdict(product, profile);
  const favorite = isFavorite(product.code);

  return html`
    <a class="back" href="#/verifier/scan">${icon('arrow-left', 18)} Vérifier un autre produit</a>

    ${offlineDate ? html`<div class="notice">${icon('info')}<div>Pas de connexion : voici la fiche enregistrée le ${formatDate(offlineDate)}.</div></div>` : ''}

    <section class="verdict tone-${verdict.tone}" aria-live="polite">
      <span class="verdict-icon">${icon(verdict.icon, 34)}</span>
      <div>
        <h1>${verdict.title}</h1>
        <p>${verdict.advice}</p>
      </div>
    </section>

    ${verdict.otherAllergens.length
      ? html`<div class="notice notice-warn">${icon('triangle-alert')}<div><strong>Tes autres allergies :</strong>
          ${verdict.otherAllergens.map((a) => `${allergyLabel(a.id)} (${a.contains ? 'présent' : 'traces'})`).join(', ')}</div></div>`
      : ''}

    <div id="recalls"></div>

    <section class="card product-head">
      ${thumb(product)}
      <div class="row-main">
        <h2>${productName(product)}</h2>
        ${product.brands ? html`<p class="muted">${product.brands}</p>` : ''}
        <p class="muted small">Code-barres ${product.code}</p>
      </div>
    </section>

    <div class="button-row">
      <button class="btn" id="fav" type="button" aria-pressed="${String(favorite)}">${icon('heart', 18)}<span>${favorite ? 'Dans mes favoris' : 'Ajouter aux favoris'}</span></button>
      <button class="btn" id="add-list" type="button">${icon('shopping-cart', 18)}<span>Ajouter aux courses</span></button>
    </div>

    <section class="card">
      <h2>Ingrédients</h2>
      ${verdict.text
        ? html`<p class="ingredients">${highlightedText(verdict.text, verdict.analysis)}</p>${findingList(verdict.analysis)}`
        : html`<p class="muted">Aucune liste d’ingrédients sur cette fiche.</p>`}
      ${verdict.analysis.exempted.length
        ? html`<p class="muted small">Exempté d’étiquetage allergène dans l’UE : ${verdict.analysis.exempted.map((e) => e.text).join(', ')}.</p>`
        : ''}
      <ul class="facts">
        <li>Allergène gluten déclaré : <strong>${verdict.declaresGluten ? 'oui' : 'non indiqué'}</strong></li>
        <li>Traces de gluten déclarées : <strong>${verdict.declaresTraces ? 'oui' : 'non indiqué'}</strong></li>
        <li>Mention sans gluten : <strong>${verdict.labelled ? 'oui' : 'non indiquée'}</strong></li>
      </ul>
      <p class="muted small">Données collaboratives d’Open Food Facts, parfois incomplètes ou anciennes. <strong>L’emballage fait toujours foi.</strong>
      <a href="https://world.openfoodfacts.org/product/${product.code}" target="_blank" rel="noopener">Voir ou corriger la fiche</a></p>
    </section>

    <section id="alternatives"></section>`;
}

const STATUS_NEEDING_ALTERNATIVES = new Set(['contains', 'traces', 'conflict', 'check']);

async function loadExtras(page, product) {
  const recalls = page.querySelector('#recalls');
  try {
    const list = await recallsForBarcode(product.code);
    setHtml(recalls, list.length ? list.map((r) => {
      const url = safeUrl(r.url);
      return html`<div class="notice notice-bad" role="alert">${icon('bell')}<div>
        <strong>Rappel produit publié le ${formatDate(r.date)}</strong>
        <p>${r.reason}</p>
        ${url ? html`<a href="${url}" target="_blank" rel="noopener">Consulter la fiche officielle</a>` : ''}
      </div></div>`;
    }) : '');
  } catch {
    setHtml(recalls, html`<p class="muted small">Vérification des rappels officiels indisponible pour le moment.</p>`);
  }

  const verdict = productVerdict(product, getProfile());
  if (!STATUS_NEEDING_ALTERNATIVES.has(verdict.key)) return;
  const box = page.querySelector('#alternatives');
  setHtml(box, html`<div class="card"><h2>Alternatives sans gluten</h2>${loading('Recherche d’alternatives…')}</div>`);
  try {
    const list = await findAlternatives(product);
    setHtml(box, list.length
      ? html`<div class="card"><h2>Alternatives sans gluten</h2>
          <p class="muted small">Même catégorie, mention sans gluten sur la fiche. À vérifier sur l’emballage.</p>
          <div class="stack">${list.map((p) => productRow(p))}</div></div>`
      : '');
  } catch {
    setHtml(box, '');
  }
}

export function render({ params }) {
  return html`<div id="product-root">${loading('Recherche du produit…')}</div>`;
}

export function mount(page, { params }) {
  const code = (params[0] ?? '').replace(/\D/g, '');
  const root = page.querySelector('#product-root');
  let current = null;
  let alive = true;

  on(page, 'click', '#fav', (_e, button) => {
    const added = toggleFavorite(current);
    button.setAttribute('aria-pressed', String(added));
    button.querySelector('span').textContent = added ? 'Dans mes favoris' : 'Ajouter aux favoris';
    toast(added ? 'Ajouté aux favoris, consultable hors ligne.' : 'Retiré des favoris.');
  });

  on(page, 'click', '#add-list', () => {
    const verdict = productVerdict(current, getProfile());
    const added = addShoppingItems([productName(current)], verdict.short);
    toast(added ? 'Ajouté à ta liste de courses.' : 'Déjà dans ta liste de courses.');
  });

  on(page, 'click', '#retry', () => load());

  async function load() {
    setHtml(root, loading('Recherche du produit…'));
    try {
      const product = await fetchProduct(code);
      if (!alive) return;
      if (!product) {
        setHtml(root, html`
          <a class="back" href="#/verifier/scan">${icon('arrow-left', 18)} Vérifier un autre produit</a>
          ${emptyState('circle-help', 'Produit introuvable', `Le code ${code} n’est pas dans Open Food Facts. Absence de fiche ne veut pas dire sans gluten : vérifie l’étiquette.`, html`
            <div class="button-row center">
              <a class="btn btn-primary" href="#/verifier/ingredients">Analyser les ingrédients</a>
              <a class="btn" href="https://world.openfoodfacts.org/cgi/product.pl?code=${code}" target="_blank" rel="noopener">Ajouter la fiche</a>
            </div>`)}`);
        return;
      }
      current = product;
      rememberProduct(product);
      setHtml(root, renderProduct(product));
      loadExtras(page, product);
    } catch {
      if (!alive) return;
      const cached = cachedProduct(code);
      if (cached) {
        current = cached;
        setHtml(root, renderProduct(cached, { offlineDate: cached.savedAt }));
        return;
      }
      setHtml(root, html`
        <a class="back" href="#/verifier/scan">${icon('arrow-left', 18)} Vérifier un autre produit</a>
        ${emptyState('triangle-alert', 'Vérification impossible', 'Le service ne répond pas ou tu n’as pas de connexion. Vérifie l’étiquette du produit.', html`
          <button class="btn btn-primary" id="retry" type="button">${icon('refresh-cw', 18)}Réessayer</button>`)}`);
    }
  }

  load();
  return () => { alive = false; };
}
