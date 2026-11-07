// Accès aux services publics : Open Food Facts, RappelConso, OpenStreetMap.
import { isNoGlutenLabel, isGlutenTag, normalize } from './gluten.js';

const PRODUCT_FIELDS = [
  'code', 'product_name', 'product_name_fr', 'brands', 'image_front_small_url', 'allergens_tags',
  'traces_tags', 'labels_tags', 'ingredients_text_fr', 'ingredients_text', 'categories_tags',
].join(',');

const OFF_MIRRORS = ['https://fr.openfoodfacts.org', 'https://world.openfoodfacts.org'];

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const RECALLS_URL = 'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso-v2-gtin-espaces/records';

export class ServiceError extends Error {}

async function fetchJson(url, { timeout = 15000, accept404 = false, signal, ...options } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  signal?.addEventListener('abort', () => controller.abort());
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok && !(accept404 && response.status === 404)) throw new ServiceError(`HTTP ${response.status}`);
    // Les serveurs saturés renvoient parfois une page HTML avec un statut 200.
    return JSON.parse(await response.text());
  } catch (error) {
    throw new ServiceError(error.message);
  } finally {
    clearTimeout(timer);
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Essaie chaque serveur à tour de rôle, sur plusieurs tours espacés :
 * ces services publics renvoient souvent une erreur passagère quand ils sont chargés.
 */
async function firstSuccessful(urls, attempt, { rounds = 3, delay = 700 } = {}) {
  let lastError;
  for (let round = 0; round < rounds; round += 1) {
    if (round > 0) await wait(delay * round);
    for (const url of urls) {
      try {
        return await attempt(url);
      } catch (error) {
        lastError = error;
      }
    }
  }
  throw lastError ?? new ServiceError('Service indisponible');
}

/**
 * Sollicite les serveurs de façon échelonnée et garde la première réponse.
 * Un serveur qui refuse (souvent juste après une autre requête) est réessayé plus tard.
 * L'attente totale reste bornée, même quand tous les serveurs sont saturés.
 */
function fastestResponse(urls, request, { stagger = 5000, retryAfter = 10000, timeout = 55000 } = {}) {
  if (navigator.onLine === false) return Promise.reject(new ServiceError('Hors ligne'));
  const controller = new AbortController();
  const timers = [];
  const later = (run, ms) => timers.push(setTimeout(run, ms));

  return new Promise((resolve, reject) => {
    let next = 0;
    let lastError = new ServiceError('Service indisponible');
    later(() => reject(lastError), timeout);

    const run = (url) => request(url, controller.signal).then(resolve, (error) => {
      if (controller.signal.aborted) return;
      lastError = error;
      launchNext();
      later(() => run(url), retryAfter);
    });
    const launchNext = () => {
      if (next < urls.length) run(urls[next++]);
    };

    launchNext();
    urls.slice(1).forEach((_, i) => later(launchNext, stagger * (i + 1)));
  }).finally(() => {
    timers.forEach(clearTimeout);
    controller.abort();
  });
}

/** Renvoie la fiche, null si le produit n'existe pas, ou une erreur si le service ne répond pas. */
export function fetchProduct(code) {
  return firstSuccessful(OFF_MIRRORS, async (base) => {
    // Un produit inconnu répond 404 avec { status: 0 } : ce n'est pas une panne du service.
    const data = await fetchJson(`${base}/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`, { accept404: true });
    return data.status === 1 && data.product ? { ...data.product, code } : null;
  });
}

export function searchProducts(query, { onlyGlutenFree = false, pageSize = 24 } = {}) {
  const params = new URLSearchParams({ json: '1', fields: PRODUCT_FIELDS, sort_by: 'unique_scans_n', search_terms: query, page_size: String(pageSize) });
  if (onlyGlutenFree) {
    params.set('tagtype_0', 'labels');
    params.set('tag_contains_0', 'contains');
    params.set('tag_0', 'en:no-gluten');
  }
  return firstSuccessful(OFF_MIRRORS, async (base) => {
    const data = await fetchJson(`${base}/cgi/search.pl?${params}`, { timeout: 20000 });
    return data.products ?? [];
  });
}

/** Produits de la même catégorie, avec mention sans gluten et sans contradiction dans la fiche. */
export function findAlternatives(product) {
  const category = (product.categories_tags ?? []).at(-1);
  if (!category) return Promise.resolve([]);
  const params = new URLSearchParams({ categories_tags: category, labels_tags: 'en:no-gluten', page_size: '12', sort_by: 'unique_scans_n', fields: PRODUCT_FIELDS });
  return firstSuccessful(OFF_MIRRORS, async (base) => {
    const data = await fetchJson(`${base}/api/v2/search?${params}`, { timeout: 20000 });
    return (data.products ?? [])
      .filter((p) => p.code !== product.code)
      .filter((p) => (p.labels_tags ?? []).some(isNoGlutenLabel))
      .filter((p) => !(p.allergens_tags ?? []).some(isGlutenTag) && !(p.traces_tags ?? []).some(isGlutenTag))
      .slice(0, 6);
  });
}

// --- RappelConso ---
export const normalizeRecall = (r) => ({
  id: r.rappel_guid || r.numero_fiche,
  date: r.date_publication,
  brand: r.marque_produit || '',
  product: r.modeles_ou_references || r.libelle || '',
  reason: r.motif_rappel || '',
  advice: r.conduites_a_tenir_par_le_consommateur || '',
  image: (r.liens_vers_les_images || '').split('|')[0],
  url: r.lien_vers_la_fiche_rappel || '',
});

const recallsQuery = (params) => `${RECALLS_URL}?${new URLSearchParams(params)}`;

export async function recallsForBarcode(code) {
  const where = `identification_produits like "${code.replace(/\D/g, '')}"`;
  const data = await fetchJson(recallsQuery({ where, limit: '5', order_by: 'date_publication desc' }));
  return (data.results ?? []).map(normalizeRecall);
}

const GLUTEN_REASON_WORDS = ['gluten', 'blé', 'froment', 'seigle', 'orge', 'épeautre', 'avoine'];
const GLUTEN_REASON = /(?:^|[^\p{L}])(?:gluten|ble|froment|seigle|orge|epeautre|avoine)(?:[^\p{L}]|$)/u;

/** Rappels des 12 derniers mois dont le motif mentionne le gluten ou une céréale à gluten. */
export async function recentGlutenRecalls() {
  const since = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  const words = GLUTEN_REASON_WORDS.map((w) => `motif_rappel like "${w}"`).join(' OR ');
  const where = `categorie_produit="alimentation" AND date_publication >= date'${since}' AND (${words})`;
  const data = await fetchJson(recallsQuery({ where, limit: '40', order_by: 'date_publication desc' }));
  const seen = new Set();
  return (data.results ?? [])
    .map(normalizeRecall)
    .filter((r) => GLUTEN_REASON.test(normalize(r.reason)))
    .filter((r) => {
      const key = `${r.brand}|${r.product}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

// --- OpenStreetMap ---
const PLACE_KINDS = {
  restaurant: 'Restaurant', fast_food: 'Restauration rapide', cafe: 'Café', bar: 'Bar', pub: 'Pub',
  ice_cream: 'Glacier', bakery: 'Boulangerie', pastry: 'Pâtisserie', confectionery: 'Confiserie',
  supermarket: 'Supermarché', convenience: 'Épicerie', health_food: 'Magasin bio', greengrocer: 'Primeur', deli: 'Traiteur',
};

const distanceKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

const addressOf = (t) =>
  [[t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '), t['addr:city']].filter(Boolean).join(', ');

const SUPPORT_ORDER = { only: 0, yes: 1, limited: 2 };

export async function glutenFreePlaces(center, radiusKm = 5) {
  // Une zone rectangulaire est plus rapide à calculer ; le rayon exact est appliqué ensuite.
  const dLat = radiusKm / 111;
  const dLon = radiusKm / (111 * Math.max(Math.cos((center.lat * Math.PI) / 180), 0.1));
  const bbox = [center.lat - dLat, center.lon - dLon, center.lat + dLat, center.lon + dLon].map((v) => v.toFixed(5)).join(',');
  const query = `[out:json][timeout:45];nwr["diet:gluten_free"~"^(yes|only|limited)$"]["name"](${bbox});out center tags 200;`;
  const data = await fastestResponse(OVERPASS_MIRRORS, (url, signal) =>
    fetchJson(url, { method: 'POST', body: new URLSearchParams({ data: query }), timeout: 50000, signal }),
  );
  return (data.elements ?? [])
    .map((el) => {
      const t = el.tags ?? {};
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (lat === undefined || lon === undefined) return null;
      return {
        id: `${el.type}/${el.id}`,
        name: t.name,
        lat, lon,
        support: t['diet:gluten_free'],
        kind: PLACE_KINDS[t.amenity] ?? PLACE_KINDS[t.shop] ?? 'Commerce',
        group: t.amenity ? 'eat' : 'shop',
        address: addressOf(t),
        phone: t.phone ?? t['contact:phone'] ?? '',
        website: t.website ?? t['contact:website'] ?? '',
        hours: t.opening_hours ?? '',
        distance: distanceKm(center, { lat, lon }),
      };
    })
    .filter((place) => place && place.distance <= radiusKm)
    .sort((a, b) => SUPPORT_ORDER[a.support] - SUPPORT_ORDER[b.support] || a.distance - b.distance);
}

export async function geocode(query) {
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', 'accept-language': 'fr' });
  const results = await fetchJson(`https://nominatim.openstreetmap.org/search?${params}`);
  const first = results[0];
  return first ? { lat: Number(first.lat), lon: Number(first.lon), label: first.display_name } : null;
}
