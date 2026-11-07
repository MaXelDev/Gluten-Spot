// Met l'application en cache pour un usage hors ligne.
// Modifier VERSION à chaque publication. test/app.test.js vérifie que la liste est complète.
const VERSION = 'v2';
const CACHE = `gluten-spot-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/app.js',
  './js/data/dictionary.js',
  './js/data/guides.js',
  './js/data/phrases.js',
  './js/data/recipes.js',
  './js/lib/api.js',
  './js/lib/dom.js',
  './js/lib/gluten.js',
  './js/lib/icons.js',
  './js/lib/insights.js',
  './js/lib/store.js',
  './js/views/check.js',
  './js/views/cook.js',
  './js/views/guides.js',
  './js/views/home.js',
  './js/views/places.js',
  './js/views/product.js',
  './js/views/settings.js',
  './js/views/track.js',
  './vendor/fonts/fraunces.woff2',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/zxing.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Réseau d'abord, pour recevoir les mises à jour ; cache si la connexion manque.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      }),
  );
});
