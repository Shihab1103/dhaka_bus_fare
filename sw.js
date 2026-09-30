// Offline cache for the bus fare page.
// Bump VERSION whenever index.html changes so users get the new copy.
const VERSION = 'v24';
const APP_CACHE = 'bus-fare-app-' + VERSION;
const FONT_CACHE = 'bus-fare-fonts-v1';
const APP_FILES = ['./', './index.html', './manifest.json', './icon.svg',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(APP_CACHE).then(async (c) => {
      await c.addAll(APP_FILES);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(k => k.startsWith('bus-fare-app-') && k !== APP_CACHE)
        .map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache on first use, serve from cache afterwards
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(req).then(hit => hit || fetch(req).then(res => {
          cache.put(req, res.clone());
          return res;
        }))
      )
    );
    return;
  }

  // Our own files: network first (fresh when online), cache when offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
  }
  // Everything else (e.g. location lookup) goes straight to the network
});
