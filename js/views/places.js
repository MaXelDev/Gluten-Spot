import { emptyState, errorState, html, icon, loading, on, safeUrl, setHtml, tabs, toast } from '../lib/dom.js';
import { geocode, glutenFreePlaces } from '../lib/api.js';
import { LANGUAGES, RESTAURANT_QUESTIONS } from '../data/phrases.js';
import { load, newId, save } from '../lib/store.js';

const TABS = [
  { id: 'adresses', href: '#/sorties/adresses', icon: 'map-pin', label: 'Adresses' },
  { id: 'carte-resto', href: '#/sorties/carte-resto', icon: 'languages', label: 'Carte de restaurant' },
  { id: 'questions', href: '#/sorties/questions', icon: 'clipboard-list', label: 'Questions à poser' },
  { id: 'voyage', href: '#/sorties/voyage', icon: 'globe', label: 'Mots à repérer' },
];

const SUPPORT = {
  only: { label: '100 % sans gluten', tone: 'good' },
  yes: { label: 'Options sans gluten', tone: 'soft' },
  limited: { label: 'Choix limité', tone: 'warn' },
};

// État de la recherche, conservé quand on change d'onglet.
const memo = { center: null, label: '', radius: 5, places: null, group: 'all' };

export const title = () => 'Sorties';

export function render({ params }) {
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'adresses';
  const views = { adresses: addressesView, 'carte-resto': cardView, questions: questionsView, voyage: wordsView };
  return html`<h1 class="page-title">Sorties et voyages</h1>${tabs(TABS, tab)}${views[tab]()}`;
}

export function mount(page, { params, refresh }) {
  const tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'adresses';
  const mounts = { adresses: mountAddresses, 'carte-resto': mountCard, questions: mountQuestions };
  return mounts[tab]?.(page, refresh);
}

// ------- Adresses -------
const addressesView = () => html`
  <form class="card" id="place-form" role="search">
    <label for="place-query"><strong>Où cherches-tu ?</strong></label>
    <div class="input-group">
      <input id="place-query" type="search" placeholder="Ville ou adresse" value="${memo.label.split(',')[0]}" autocomplete="off">
      <button class="btn btn-primary" type="submit">${icon('search', 18)}Chercher</button>
    </div>
    <div class="button-row">
      <button class="btn" id="locate" type="button">${icon('navigation', 18)}Autour de moi</button>
      <label class="inline-select">Rayon
        <select id="radius">${[2, 5, 10, 25].map((r) => html`<option value="${r}" ${r === memo.radius ? 'selected' : ''}>${r} km</option>`)}</select>
      </label>
    </div>
    <div class="chips" role="group" aria-label="Type de lieu">
      ${[['all', 'Tout'], ['eat', 'Où manger'], ['shop', 'Où acheter']].map(([id, label]) => html`<button class="chip" type="button" data-group="${id}" aria-pressed="${String(memo.group === id)}">${label}</button>`)}
    </div>
  </form>
  <div id="map" class="map" role="region" aria-label="Carte des adresses"></div>
  <p class="muted small">Adresses déclarées par les contributeurs d’OpenStreetMap, parfois incomplètes. <strong>Appelle avant de te déplacer</strong> pour confirmer les précautions prises.</p>
  <div id="place-results"></div>
  <section><h2>Mes adresses</h2><div id="my-places"></div>
    <details class="card"><summary><strong>Ajouter une adresse</strong></summary>
      <form id="custom-place" class="form-grid">
        <label>Nom<input id="custom-name" required maxlength="120"></label>
        <label>Adresse ou ville<input id="custom-address" maxlength="200"></label>
        <label>Note<textarea id="custom-note" rows="2" maxlength="500" placeholder="Ex. friteuse dédiée, serveur attentif"></textarea></label>
        <button class="btn btn-primary" type="submit">${icon('plus', 18)}Ajouter</button>
      </form>
    </details>
  </section>`;

let leafletPromise;
function loadLeaflet() {
  leafletPromise ??= new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'vendor/leaflet/leaflet.css';
    document.head.append(css);
    const script = document.createElement('script');
    script.src = 'vendor/leaflet/leaflet.js';
    script.onload = () => resolve(window.L);
    script.onerror = () => { leafletPromise = null; reject(new Error('Carte indisponible')); };
    document.head.append(script);
  });
  return leafletPromise;
}

const favorites = () => load('placeFavorites', []);
const isSaved = (id) => favorites().some((p) => p.id === id);
const directionsUrl = (p) =>
  p.lat !== undefined
    ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address ?? ''}`)}`;
const telHref = (phone) => `tel:${phone.split(';')[0].replace(/[^\d+]/g, '')}`;

function placeLinks(p) {
  const website = safeUrl(p.website);
  return html`<div class="link-row">
    <a href="${directionsUrl(p)}" target="_blank" rel="noopener">${icon('navigation', 15)}Itinéraire</a>
    ${p.phone ? html`<a href="${telHref(p.phone)}">${icon('phone', 15)}Appeler</a>` : ''}
    ${website ? html`<a href="${website}" target="_blank" rel="noopener">${icon('globe', 15)}Site web</a>` : ''}
  </div>`;
}

function placeCard(p) {
  const support = SUPPORT[p.support];
  const saved = isSaved(p.id);
  return html`<article class="card place" data-place="${p.id}">
    <div class="place-head">
      <div><h3>${p.name}</h3><p class="muted small">${p.kind} · ${p.distance.toFixed(1).replace('.', ',')} km</p></div>
      <button class="icon-button" type="button" data-save="${p.id}" aria-pressed="${String(saved)}" aria-label="${saved ? 'Retirer de mes adresses' : 'Ajouter à mes adresses'}">${icon('heart', 20)}</button>
    </div>
    <span class="badge tone-${support.tone}">${support.label}</span>
    ${p.address ? html`<p class="small">${p.address}</p>` : ''}
    ${p.hours ? html`<p class="muted small">${icon('clock', 14)} ${p.hours}</p>` : ''}
    ${placeLinks(p)}
  </article>`;
}

function myPlaceCard(p) {
  return html`<article class="card place" data-mine="${p.id}">
    <div class="place-head">
      <div><h3>${p.name}</h3>${p.kind ? html`<p class="muted small">${p.kind}</p>` : ''}</div>
      <button class="icon-button" type="button" data-remove="${p.id}" aria-label="Retirer ${p.name}">${icon('trash-2', 18)}</button>
    </div>
    ${p.address ? html`<p class="small">${p.address}</p>` : ''}
    <div class="stars" role="group" aria-label="Ma note">
      ${[1, 2, 3, 4, 5].map((n) => html`<button type="button" data-rate="${n}" class="${n <= (p.rating ?? 0) ? 'on' : ''}" aria-label="${n} sur 5" aria-pressed="${String(n === p.rating)}">${icon('star', 20)}</button>`)}
    </div>
    <label class="small">Ma note personnelle<textarea data-note rows="2" maxlength="500" placeholder="Précautions, plats sûrs…">${p.note ?? ''}</textarea></label>
    ${placeLinks(p)}
  </article>`;
}

function mountAddresses(page) {
  let map = null;
  let markers = null;
  let alive = true;
  let requestId = 0;
  const results = page.querySelector('#place-results');
  const mine = page.querySelector('#my-places');

  const renderMine = () => {
    const list = favorites();
    setHtml(mine, list.length
      ? html`<div class="stack">${list.map(myPlaceCard)}</div>`
      : emptyState('heart', 'Aucune adresse enregistrée', 'Garde tes adresses de confiance et tes notes, même sans connexion.'));
  };

  const visible = () => (memo.places ?? []).filter((p) => memo.group === 'all' || p.group === memo.group);

  const renderResults = () => {
    if (memo.places === null) {
      setHtml(results, emptyState('map-pin', 'Trouve une adresse', 'Cherche une ville ou utilise ta position.'));
      return;
    }
    const list = visible();
    setHtml(results, list.length
      ? html`<p class="muted small">${list.length} adresse${list.length > 1 ? 's' : ''} autour de ${memo.label.split(',')[0]}.</p><div class="stack">${list.map(placeCard)}</div>`
      : emptyState('circle-help', 'Aucune adresse trouvée', 'Essaie un rayon plus grand ou une autre catégorie.'));
    drawMarkers(list);
  };

  function drawMarkers(list) {
    if (!map || !window.L) return;
    const L = window.L;
    markers.clearLayers();
    for (const p of list) {
      const marker = L.marker([p.lat, p.lon], {
        title: p.name,
        icon: L.divIcon({ className: `pin pin-${p.support}`, iconSize: [18, 18], iconAnchor: [9, 9] }),
      });
      marker.bindPopup(html`<strong>${p.name}</strong><br>${SUPPORT[p.support].label}<br><a href="${directionsUrl(p)}" target="_blank" rel="noopener">Itinéraire</a>`.toString());
      markers.addLayer(marker);
    }
    if (memo.center) {
      if (list.length) map.fitBounds(L.latLngBounds(list.map((p) => [p.lat, p.lon])).pad(0.15), { maxZoom: 15 });
      else map.setView([memo.center.lat, memo.center.lon], 12);
    }
  }

  /** Avec `background`, les résultats enregistrés restent affichés pendant la mise à jour. */
  async function searchAround(center, label, { background = false } = {}) {
    const current = ++requestId;
    memo.center = center;
    memo.label = label;
    if (!background) setHtml(results, loading('Recherche des adresses… Cela peut prendre jusqu’à une minute.'));
    try {
      const places = await glutenFreePlaces(center, memo.radius);
      if (!alive || current !== requestId) return;
      memo.places = places;
      save('lastLocation', { center, label, radius: memo.radius, places });
      renderResults();
    } catch {
      if (!alive || current !== requestId || background) return;
      setHtml(results, html`${errorState('Les serveurs de la carte sont occupés. Réessaie dans un instant.')}
        <div class="button-row"><button class="btn" id="place-retry" type="button">${icon('refresh-cw', 18)}Réessayer</button></div>`);
    }
  }

  on(page, 'click', '#place-retry', () => searchAround(memo.center, memo.label));

  on(page, 'submit', '#place-form', async (event) => {
    event.preventDefault();
    const query = page.querySelector('#place-query').value.trim();
    if (!query) return;
    setHtml(results, loading('Recherche du lieu…'));
    try {
      const place = await geocode(query);
      if (!alive) return;
      if (!place) {
        setHtml(results, emptyState('circle-help', 'Lieu introuvable', 'Vérifie l’orthographe ou ajoute le pays.'));
        return;
      }
      await searchAround({ lat: place.lat, lon: place.lon }, place.label);
    } catch {
      if (alive) setHtml(results, errorState('La recherche de lieu ne répond pas. Vérifie ta connexion.'));
    }
  });

  on(page, 'click', '#locate', () => {
    if (!navigator.geolocation) {
      toast('La géolocalisation n’est pas disponible ici.');
      return;
    }
    setHtml(results, loading('Recherche de ta position…'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (alive) searchAround({ lat: pos.coords.latitude, lon: pos.coords.longitude }, 'ta position');
      },
      () => {
        if (!alive) return;
        renderResults();
        toast('Position indisponible. Vérifie l’autorisation ou cherche une ville.');
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  });

  on(page, 'change', '#radius', (_e, select) => {
    memo.radius = Number(select.value);
    if (memo.center) searchAround(memo.center, memo.label);
  });

  on(page, 'click', '[data-group]', (_e, chip) => {
    memo.group = chip.dataset.group;
    page.querySelectorAll('[data-group]').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    renderResults();
  });

  on(page, 'click', '[data-save]', (_e, button) => {
    const id = button.dataset.save;
    if (isSaved(id)) {
      save('placeFavorites', favorites().filter((p) => p.id !== id));
      toast('Retiré de tes adresses.');
    } else {
      const place = memo.places.find((p) => p.id === id);
      const { distance, group, ...kept } = place;
      save('placeFavorites', [{ ...kept, note: '', rating: 0 }, ...favorites()]);
      toast('Ajouté à tes adresses.');
    }
    renderResults();
    renderMine();
  });

  on(page, 'click', '[data-remove]', (_e, button) => {
    const before = favorites();
    const removed = before.find((p) => p.id === button.dataset.remove);
    save('placeFavorites', before.filter((p) => p.id !== removed.id));
    renderMine();
    if (memo.places) renderResults();
    toast(`${removed.name} retiré.`, {
      label: 'Annuler',
      run: () => {
        save('placeFavorites', before);
        renderMine();
        if (memo.places) renderResults();
      },
    });
  });

  const updateMine = (id, changes) => save('placeFavorites', favorites().map((p) => (p.id === id ? { ...p, ...changes } : p)));

  on(page, 'click', '[data-rate]', (_e, star) => {
    const id = star.closest('[data-mine]').dataset.mine;
    const rating = Number(star.dataset.rate);
    updateMine(id, { rating });
    star.parentElement.querySelectorAll('[data-rate]').forEach((s) => {
      const n = Number(s.dataset.rate);
      s.classList.toggle('on', n <= rating);
      s.setAttribute('aria-pressed', String(n === rating));
    });
  });

  on(page, 'change', '[data-note]', (_e, area) => {
    updateMine(area.closest('[data-mine]').dataset.mine, { note: area.value });
    toast('Note enregistrée.');
  });

  on(page, 'submit', '#custom-place', (event) => {
    event.preventDefault();
    const name = page.querySelector('#custom-name').value.trim();
    if (!name) return;
    save('placeFavorites', [{
      id: `custom/${newId()}`,
      name,
      address: page.querySelector('#custom-address').value.trim(),
      note: page.querySelector('#custom-note').value.trim(),
      rating: 0,
      custom: true,
    }, ...favorites()]);
    event.target.reset();
    event.target.closest('details').open = false;
    renderMine();
    toast('Adresse ajoutée.');
  });

  renderMine();
  renderResults();

  const last = load('lastLocation', null);
  if (!memo.center && last?.center) {
    page.querySelector('#place-query').value = last.label === 'ta position' ? '' : last.label.split(',')[0];
    memo.radius = last.radius ?? memo.radius;
    page.querySelector('#radius').value = String(memo.radius);
    memo.center = last.center;
    memo.label = last.label;
    memo.places = last.places ?? null;
    renderResults();
    searchAround(last.center, last.label, { background: Boolean(last.places) });
  }

  loadLeaflet().then((L) => {
    if (!alive) return;
    map = L.map(page.querySelector('#map'), { scrollWheelZoom: false }).setView([46.6, 2.5], 5);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);
    markers = L.layerGroup().addTo(map);
    if (memo.places) drawMarkers(visible());
  }).catch(() => {
    if (alive) setHtml(page.querySelector('#map'), errorState('Carte indisponible hors connexion.'));
  });

  return () => {
    alive = false;
    map?.remove();
  };
}

// ------- Carte de restaurant -------
const currentLanguage = () => LANGUAGES.find((l) => l.code === load('cardLanguage', 'en')) ?? LANGUAGES[0];

const cardText = (lang) => [lang.title, lang.intro, lang.avoid, lang.safe, lang.contamination, lang.ask].join('\n\n');

function restaurantCard(lang) {
  return html`<article class="rest-card" id="rest-card" lang="${lang.code}" dir="${lang.dir ?? 'ltr'}">
    <button class="icon-button card-close" id="card-close" type="button" aria-label="Fermer le plein écran" hidden>${icon('x', 26)}</button>
    <h2>${lang.title}</h2>
    <p class="rest-intro">${lang.intro}</p>
    <p>${lang.avoid}</p>
    <p>${lang.safe}</p>
    <p>${lang.contamination}</p>
    <p class="rest-ask">${lang.ask}</p>
  </article>`;
}

const cardView = () => {
  const lang = currentLanguage();
  return html`
    <div class="card">
      <label for="card-lang"><strong>Langue du pays</strong></label>
      <select id="card-lang">${[...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((l) => html`<option value="${l.code}" ${l.code === lang.code ? 'selected' : ''}>${l.flag} ${l.name} — ${l.native}</option>`)}</select>
    </div>
    <div id="card-holder">${restaurantCard(lang)}</div>
    <div class="button-row">
      <button class="btn btn-primary" id="card-full" type="button">${icon('maximize', 18)}Plein écran</button>
      <button class="btn" id="card-share" type="button">${icon('share-2', 18)}Partager</button>
      <button class="btn" id="card-copy" type="button">${icon('copy', 18)}Copier</button>
    </div>
    <p class="muted small">Cette carte est disponible hors ligne une fois l’application chargée. Ces traductions n’ont pas été relues par des traducteurs professionnels : fais-les vérifier par un locuteur si possible, et ne t’y fie pas seule en cas de maladie grave.</p>`;
};

function mountCard(page) {
  const leaveFull = () => {
    page.querySelector('#rest-card')?.classList.remove('is-full');
    const close = page.querySelector('#card-close');
    if (close) close.hidden = true;
    document.body.classList.remove('no-scroll');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };

  on(page, 'change', '#card-lang', (_e, select) => {
    save('cardLanguage', select.value);
    setHtml(page.querySelector('#card-holder'), restaurantCard(currentLanguage()));
  });

  on(page, 'click', '#card-full', () => {
    const card = page.querySelector('#rest-card');
    card.classList.add('is-full');
    page.querySelector('#card-close').hidden = false;
    document.body.classList.add('no-scroll');
    card.requestFullscreen?.().catch(() => {});
  });

  on(page, 'click', '#card-close', leaveFull);

  const onFullscreenChange = () => {
    if (!document.fullscreenElement) leaveFull();
  };
  document.addEventListener('fullscreenchange', onFullscreenChange);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast('Texte copié.');
    } catch {
      toast('Copie impossible sur cet appareil.');
    }
  };

  on(page, 'click', '#card-copy', () => copy(cardText(currentLanguage())));
  on(page, 'click', '#card-share', async () => {
    const text = cardText(currentLanguage());
    if (!navigator.share) return copy(text);
    try {
      await navigator.share({ title: currentLanguage().title, text });
    } catch {
      // Partage annulé par l'utilisateur.
    }
  });

  return () => {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    leaveFull();
  };
}

// ------- Questions à poser -------
const questionsView = () => {
  const checked = new Set(load('questionsChecked', []));
  return html`
    <p class="muted">À utiliser pour appeler un restaurant ou commander sur place. Les réponses hésitantes sont un signal d’alerte.</p>
    ${RESTAURANT_QUESTIONS.map((group, g) => html`
      <section class="card"><h2>${group.group}</h2>
        <ul class="checklist">
          ${group.items.map((q, i) => {
            const id = `q${g}-${i}`;
            return html`<li><label class="check-line"><input type="checkbox" data-question="${id}" ${checked.has(id) ? 'checked' : ''}><span>${q}</span></label></li>`;
          })}
        </ul>
      </section>`)}
    <div class="button-row"><button class="btn" id="questions-reset" type="button">${icon('refresh-cw', 18)}Tout décocher</button></div>`;
};

function mountQuestions(page, refresh) {
  on(page, 'change', '[data-question]', (_e, box) => {
    const checked = new Set(load('questionsChecked', []));
    if (box.checked) checked.add(box.dataset.question);
    else checked.delete(box.dataset.question);
    save('questionsChecked', [...checked]);
  });
  on(page, 'click', '#questions-reset', () => {
    save('questionsChecked', []);
    refresh();
  });
}

// ------- Mots à repérer -------
const wordsView = () => html`
  <p class="muted">Les mots utiles sur les étiquettes et les menus à l’étranger. L’analyseur d’ingrédients reconnaît aussi plusieurs langues.</p>
  <div class="table-wrap card">
    <table class="data-table">
      <thead><tr><th>Langue</th><th>Blé</th><th>Orge</th><th>Seigle</th><th>Avoine</th><th>Farine</th><th>Sans gluten</th></tr></thead>
      <tbody>
        ${[...LANGUAGES].sort((a, b) => a.name.localeCompare(b.name, 'fr')).map((l) => html`
          <tr lang="${l.code}"><th scope="row" lang="fr">${l.flag} ${l.name}</th><td>${l.words.wheat}</td><td>${l.words.barley}</td><td>${l.words.rye}</td><td>${l.words.oats}</td><td>${l.words.flour}</td><td>${l.words.free}</td></tr>`)}
      </tbody>
    </table>
  </div>
  <a class="btn" href="#/guides/voyage">${icon('book-open', 18)}Lire le guide du voyage</a>`;
