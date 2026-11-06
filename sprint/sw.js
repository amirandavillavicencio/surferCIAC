// Saurabh's Sprint — Service Worker v5.9
// Network-First with Offline Cache Fallback Strategy
// This guarantees that any changes or fixes appear immediately in the browser,
// while still providing 100% offline gameplay when disconnected.

const CACHE_NAME = 'saurabhs-sprint-v5.9';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './css/style.css?v=5.9',
  './js/storage.js?v=5.9',
  './js/audio.js?v=5.9',
  './js/missions.js?v=5.9',
  './js/collectibles.js?v=5.9',
  './js/player.js?v=5.9',
  './js/chaser.js?v=5.9',
  './js/world.js?v=5.9',
  './js/input.js?v=5.9',
  './js/ui.js?v=5.9',
  './js/main.js?v=5.9',
  './lib/three.min.js',
  './manifest.json',
  './favicon.ico',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/favicon-32x32.png',
  './assets/icons/favicon-16x16.png'
];

// Install: Pre-cache all critical game assets & skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW v5.0] Pre-caching game assets for offline play...');
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
    }).catch(err => {
      console.warn('[SW v5.0] Pre-cache partial warning:', err);
    })
  );
});

// Activate: Purge ALL previous caches and take control of all open client tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW v5.0] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch Strategy: Network-First (Fresh updates immediately, fallback to cache if offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  // External web fonts
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Network-First for same-origin requests
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Network failed (Offline mode) — serve from Cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});
