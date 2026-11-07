import { emptyState, errorState, formatDate, html, icon, loading, on, safeUrl, setHtml, tabs } from '../lib/dom.js';
import { recentGlutenRecalls, searchProducts } from '../lib/api.js';
import { analyzeIngredients, isValidBarcode, normalize } from '../lib/gluten.js';
import { DICTIONARY, STATUS_LABELS } from '../data/dictionary.js';
import { load } from '../lib/store.js';
import { highlightedText, productRow } from './product.js';

const TABS = [
  { id: 'scan', href: '#/verifier/scan', icon: 'scan-barcode', label: 'Scanner' },
  { id: 'recherche', href: '#/verifier/recherche', icon: 'search', label: 'Rechercher' },
  { id: 'ingredients', href: '#/verifier/ingredients', icon: 'list-checks', label: 'Ingrédients' },
  { id: 'dictionnaire', href: '#/verifier/dictionnaire', icon: 'book-open', label: 'Dictionnaire' },
  { id: 'produits', href: '#/verifier/produits', icon: 'heart', label: 'Mes produits' },
  { id: 'rappels', href: '#/verifier/rappels', icon: 'bell', label: 'Rappels' },
];

// Conservé entre deux navigations pour retrouver sa recherche au retour d'une fiche.
const memo = { query: '', onlyGlutenFree: false, results: null, runSearch: false, ingredients: '', recalls: null, recallsAt: 0 };

/** Ouvre l'onglet Recherche et lance directement cette requête. */
export function openSearch(query) {
  memo.query = query;
  memo.runSearch = true;
  location.hash = '#/verifier/recherche';
}

export const title = () => 'Vérifier';

export function render({ params }) {
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'scan';
  const views = { scan: scanView, recherche: searchView, ingredients: ingredientsView, dictionnaire: dictionaryView, produits: productsView, rappels: recallsView };
  return html`<h1 class="page-title">Vérifier un produit</h1>${tabs(TABS, tab)}${views[tab]()}`;
}

export function mount(page, { params }) {
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'scan';
  const mounts = { scan: mountScan, recherche: mountSearch, ingredients: mountIngredients, dictionnaire: mountDictionary, rappels: mountRecalls };
  return mounts[tab]?.(page);
}

const openProduct = (code) => {
  location.hash = `#/produit/${code}`;
};

// ------- Scanner -------
const scanView = () => html`
  <section class="card scanner-card">
    <div class="scanner" id="scanner" hidden>
      <video id="scan-video" playsinline muted></video>
      <div class="scan-frame" aria-hidden="true"></div>
    </div>
    <div class="button-row center" id="scan-actions">
      <button class="btn btn-primary btn-large" id="scan-start" type="button">${icon('camera', 20)}Activer la caméra</button>
      <button class="btn" id="scan-stop" type="button" hidden>${icon('x', 18)}Arrêter</button>
      <label class="btn">${icon('image', 18)}Importer une photo<input id="scan-file" class="visually-hidden" type="file" accept="image/*"></label>
    </div>
    <p id="scan-status" class="muted small center-text" role="status">Place le code-barres dans le cadre. La caméra n’envoie aucune image : tout se passe sur ton appareil.</p>
  </section>

  <form class="card" id="manual-form">
    <label for="manual-code"><strong>Saisir le code-barres</strong></label>
    <div class="input-group">
      <input id="manual-code" inputmode="numeric" autocomplete="off" placeholder="Ex. 3017620422003" maxlength="14">
      <button class="btn btn-primary" type="submit">Vérifier</button>
    </div>
    <p id="manual-error" class="field-error" hidden></p>
  </form>`;

let zxingPromise;
function loadZxing() {
  zxingPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'vendor/zxing.min.js';
    script.onload = () => resolve(window.ZXing);
    script.onerror = () => { zxingPromise = null; reject(new Error('Chargement du lecteur impossible')); };
    document.head.append(script);
  });
  return zxingPromise;
}

function createReader(ZXing) {
  const hints = new Map([
    [ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E]],
    [ZXing.DecodeHintType.TRY_HARDER, true],
  ]);
  return new ZXing.BrowserMultiFormatReader(hints, 250);
}

async function nativeDetector() {
  if (!('BarcodeDetector' in window)) return null;
  try {
    const formats = await window.BarcodeDetector.getSupportedFormats();
    if (!formats.includes('ean_13')) return null;
    return new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  } catch {
    return null;
  }
}

const CAMERA_CONSTRAINTS = { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };

function cameraErrorMessage(error) {
  if (!navigator.mediaDevices) return 'La caméra nécessite une connexion sécurisée (HTTPS). Importe une photo ou saisis le code.';
  if (error?.name === 'NotAllowedError') return 'Accès à la caméra refusé. Autorise-la dans ton navigateur, importe une photo ou saisis le code.';
  if (error?.name === 'NotFoundError') return 'Aucune caméra trouvée. Importe une photo ou saisis le code.';
  return 'Impossible de démarrer la caméra. Importe une photo ou saisis le code.';
}

function mountScan(page) {
  const box = page.querySelector('#scanner');
  const video = page.querySelector('#scan-video');
  const status = page.querySelector('#scan-status');
  const start = page.querySelector('#scan-start');
  const stopButton = page.querySelector('#scan-stop');
  let stopCamera = null;
  let session = 0;

  const showRunning = (running) => {
    box.hidden = !running;
    start.hidden = running;
    stopButton.hidden = !running;
  };

  const stop = () => {
    session += 1;
    stopCamera?.();
    stopCamera = null;
    showRunning(false);
  };

  const found = (code) => {
    stop();
    navigator.vibrate?.(60);
    openProduct(code);
  };

  async function startNative(detector, current) {
    const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
    if (current !== session) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    video.srcObject = stream;
    await video.play();
    let timer;
    stopCamera = () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    };
    const tick = async () => {
      if (current !== session) return;
      try {
        const [hit] = await detector.detect(video);
        if (hit?.rawValue && current === session) return found(hit.rawValue);
      } catch {
        // Une image illisible n'est pas une erreur : on passe à la suivante.
      }
      timer = setTimeout(tick, 200);
    };
    tick();
  }

  async function startZxing(current) {
    const reader = createReader(await loadZxing());
    if (current !== session) return;
    stopCamera = () => reader.reset();
    await reader.decodeFromConstraints(CAMERA_CONSTRAINTS, video, (result) => {
      if (result && current === session) found(result.getText());
    });
  }

  on(page, 'click', '#scan-start', async () => {
    const current = ++session;
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = cameraErrorMessage();
      return;
    }
    showRunning(true);
    status.textContent = 'Recherche d’un code-barres…';
    try {
      const detector = await nativeDetector();
      if (detector) await startNative(detector, current);
      else await startZxing(current);
    } catch (error) {
      if (current !== session) return;
      stop();
      status.textContent = cameraErrorMessage(error);
    }
  });

  on(page, 'click', '#scan-stop', () => {
    stop();
    status.textContent = 'Caméra arrêtée.';
  });

  on(page, 'change', '#scan-file', async (_e, input) => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    status.textContent = 'Lecture de la photo…';
    const url = URL.createObjectURL(file);
    try {
      const reader = createReader(await loadZxing());
      const result = await reader.decodeFromImageUrl(url);
      found(result.getText());
    } catch {
      status.textContent = 'Aucun code-barres lisible. Essaie une photo plus nette et bien cadrée, ou saisis le code.';
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  on(page, 'submit', '#manual-form', (event) => {
    event.preventDefault();
    const code = page.querySelector('#manual-code').value.replace(/\s/g, '');
    const errorBox = page.querySelector('#manual-error');
    if (!isValidBarcode(code)) {
      errorBox.textContent = 'Ce code n’est pas valide. Vérifie les chiffres sous le code-barres.';
      errorBox.hidden = false;
      return;
    }
    openProduct(code);
  });

  return stop;
}

// ------- Recherche -------
const searchResults = () => {
  if (memo.results === null) return emptyState('search', 'Cherche un produit', 'Par exemple : « pâtes », « biscuits » ou une marque.');
  if (!memo.results.length) return emptyState('circle-help', 'Aucun résultat', 'Essaie un autre mot ou retire le filtre.');
  return html`<p class="muted small">${memo.results.length} résultats. Le résultat reste à confirmer sur l’emballage.</p>
    <div class="stack">${memo.results.map((p) => productRow(p))}</div>`;
};

const searchView = () => html`
  <form class="card" id="search-form" role="search">
    <label for="search-input"><strong>Nom ou marque</strong></label>
    <div class="input-group">
      <input id="search-input" type="search" value="${memo.query}" placeholder="Ex. biscuits au chocolat" autocomplete="off" required>
      <button class="btn btn-primary" type="submit">${icon('search', 18)}Chercher</button>
    </div>
    <label class="check-line"><input type="checkbox" id="search-gf" ${memo.onlyGlutenFree ? 'checked' : ''}> Uniquement les produits indiqués sans gluten</label>
  </form>
  <div id="search-results">${searchResults()}</div>`;

function mountSearch(page) {
  const results = page.querySelector('#search-results');
  let requestId = 0;
  on(page, 'submit', '#search-form', async (event) => {
    event.preventDefault();
    memo.query = page.querySelector('#search-input').value.trim();
    memo.onlyGlutenFree = page.querySelector('#search-gf').checked;
    if (!memo.query) return;
    const current = ++requestId;
    setHtml(results, loading('Recherche en cours…'));
    try {
      const found = await searchProducts(memo.query, { onlyGlutenFree: memo.onlyGlutenFree });
      if (current !== requestId) return;
      memo.results = found.filter((p) => p.code);
      setHtml(results, searchResults());
    } catch {
      if (current !== requestId) return;
      setHtml(results, errorState('La recherche ne répond pas pour le moment. Réessaie dans quelques instants ou scanne le code-barres.'));
    }
  });
  if (memo.runSearch) {
    memo.runSearch = false;
    page.querySelector('#search-form').requestSubmit();
  }
  return () => { requestId = -1; };
}

// ------- Analyse d'ingrédients -------
function ingredientResult(text) {
  if (!text.trim()) return '';
  const analysis = analyzeIngredients(text);
  let summary;
  if (analysis.contains) summary = { tone: 'bad', icon: 'x', title: 'Contient du gluten' };
  else if (analysis.traces) summary = { tone: 'warn', icon: 'triangle-alert', title: 'Traces possibles de gluten' };
  else if (analysis.caution) summary = { tone: 'warn', icon: 'triangle-alert', title: 'À vérifier' };
  else summary = { tone: 'soft', icon: 'check', title: 'Aucun terme à risque repéré' };

  const seen = new Set();
  const unique = analysis.findings.filter((f) => !seen.has(f.label + f.inTraces) && seen.add(f.label + f.inTraces));
  return html`
    <section class="verdict tone-${summary.tone}" aria-live="polite">
      <span class="verdict-icon">${icon(summary.icon, 30)}</span>
      <div><h2>${summary.title}</h2>
      <p>${analysis.contains || analysis.traces || analysis.caution ? 'Détail ci-dessous.' : 'Ce n’est pas une garantie : la contamination et certains ingrédients n’apparaissent pas toujours dans le texte.'}</p></div>
    </section>
    <section class="card">
      <h3>Texte analysé</h3>
      <p class="ingredients">${highlightedText(text, analysis)}</p>
      ${unique.length ? html`<ul class="finding-list">${unique.map((f) => html`<li><strong>${f.label}${f.inTraces ? ' (traces)' : ''}</strong><span>${f.why}</span></li>`)}</ul>` : ''}
      ${analysis.exempted.length ? html`<p class="muted small">Exempté d’étiquetage allergène dans l’UE : ${analysis.exempted.map((e) => e.text).join(', ')}.</p>` : ''}
    </section>`;
}

const ingredientsView = () => html`
  <form class="card" id="ingredients-form">
    <label for="ingredients-input"><strong>Liste d’ingrédients</strong></label>
    <textarea id="ingredients-input" rows="5" placeholder="Colle ici la liste. Reconnaît le français, l’anglais, l’espagnol, l’italien, l’allemand et le néerlandais.">${memo.ingredients}</textarea>
    <div class="button-row"><button class="btn btn-primary" type="submit">${icon('list-checks', 18)}Analyser</button></div>
    <p class="muted small">Sur téléphone, l’appareil photo ou Google Lens permet souvent de copier le texte d’une étiquette.</p>
  </form>
  <div id="ingredients-result">${ingredientResult(memo.ingredients)}</div>`;

function mountIngredients(page) {
  on(page, 'submit', '#ingredients-form', (event) => {
    event.preventDefault();
    memo.ingredients = page.querySelector('#ingredients-input').value;
    setHtml(page.querySelector('#ingredients-result'), ingredientResult(memo.ingredients));
  });
}

// ------- Dictionnaire -------
const dictionaryRows = (query, status) => {
  const q = normalize(query.trim());
  const rows = DICTIONARY.filter((d) => (!status || d.s === status) && (!q || normalize(`${d.n} ${d.w}`).includes(q)));
  if (!rows.length) return emptyState('circle-help', 'Ingrédient non répertorié', 'En cas de doute, considère-le comme à vérifier.');
  return html`<ul class="dict-list">${rows.map((d) => {
    const s = STATUS_LABELS[d.s];
    return html`<li class="card dict-item"><div class="dict-head"><strong>${d.n}</strong><span class="badge tone-${s.tone}">${icon(s.icon, 14)}${s.label}</span></div><p>${d.w}</p></li>`;
  })}</ul>`;
};

const dictionaryView = () => html`
  <div class="card">
    <label for="dict-search"><strong>Chercher un ingrédient</strong></label>
    <input id="dict-search" type="search" placeholder="Ex. malt, amidon, sarrasin" autocomplete="off">
    <div class="chips" role="group" aria-label="Filtrer par statut">
      <button class="chip" type="button" data-status="" aria-pressed="true">Tous</button>
      ${Object.entries(STATUS_LABELS).map(([id, s]) => html`<button class="chip" type="button" data-status="${id}" aria-pressed="false">${s.label}</button>`)}
    </div>
  </div>
  <div id="dict-results">${dictionaryRows('', '')}</div>`;

function mountDictionary(page) {
  let status = '';
  const input = page.querySelector('#dict-search');
  const update = () => setHtml(page.querySelector('#dict-results'), dictionaryRows(input.value, status));
  input.addEventListener('input', update);
  on(page, 'click', '[data-status]', (_e, chip) => {
    status = chip.dataset.status;
    page.querySelectorAll('[data-status]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    update();
  });
}

// ------- Mes produits -------
function productsView() {
  const favorites = load('favorites', []);
  const history = load('history', []);
  return html`
    <section><h2>Favoris</h2>
      ${favorites.length ? html`<div class="stack">${favorites.map((p) => productRow(p))}</div>`
        : emptyState('heart', 'Aucun favori', 'Les favoris restent disponibles sans connexion.')}
    </section>
    <section><h2>Derniers produits vérifiés</h2>
      ${history.length ? html`<div class="stack">${history.map((p) => productRow(p))}</div>`
        : emptyState('clock', 'Aucun produit vérifié', null, html`<a class="btn btn-primary" href="#/verifier/scan">Scanner un produit</a>`)}
    </section>`;
}

// ------- Rappels -------
const RECALLS_TTL = 30 * 60 * 1000;

const recallsView = () => html`
  <p class="muted">Rappels officiels français des 12 derniers mois dont le motif mentionne le gluten ou une céréale à gluten. Source : RappelConso.</p>
  <div id="recalls-list">${loading('Recherche des rappels…')}</div>`;

function recallCard(r) {
  const url = safeUrl(r.url);
  return html`<article class="card recall">
    <p class="muted small">${formatDate(r.date)}${r.brand ? ` · ${r.brand}` : ''}</p>
    <h3>${r.product || 'Produit rappelé'}</h3>
    <p>${r.reason}</p>
    ${url ? html`<a href="${url}" target="_blank" rel="noopener">Fiche officielle ${icon('external-link', 14)}</a>` : ''}
  </article>`;
}

export async function getCachedGlutenRecalls() {
  if (memo.recalls && Date.now() - memo.recallsAt < RECALLS_TTL) return memo.recalls;
  memo.recalls = await recentGlutenRecalls();
  memo.recallsAt = Date.now();
  return memo.recalls;
}

function mountRecalls(page) {
  const box = page.querySelector('#recalls-list');
  let alive = true;
  getCachedGlutenRecalls()
    .then((list) => {
      if (!alive) return;
      setHtml(box, list.length
        ? html`<div class="stack">${list.map(recallCard)}</div>`
        : emptyState('shield-check', 'Aucun rappel trouvé', 'Aucun rappel lié au gluten sur cette période.'));
    })
    .catch(() => {
      if (alive) setHtml(box, errorState('Les rappels sont indisponibles pour le moment. Vérifie ta connexion ou rappel.conso.gouv.fr.'));
    });
  return () => { alive = false; };
}
