const CACHE_NAME = 'neon-defense-v3';

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/js/main.js',
  '/js/game.js',
  '/js/ui.js',
  '/js/renderer.js',
  '/js/config.js',
  '/js/enemy.js',
  '/js/tower.js',
  '/js/projectile.js',
  '/js/waves.js',
  '/js/economy.js',
  '/js/input.js',
  '/js/audio.js',
  '/js/grid.js',
  '/js/pathfinding.js',
  '/js/particles.js',
  '/js/i18n.js',
  '/js/tutorial.js',
  '/js/utils.js',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for the scores API; only cache successful GET responses
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (request.method === 'GET' && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for all static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return res;
      });
    })
  );
});
