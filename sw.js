const CACHE_NAME = 'expense-splitter-v1';
const ASSETS_TO_CACHE = [
  '/',            // navigation
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); }))
    )
  );
  self.clients.claim();
});

// Fetch: navigation requests -> cache-first (fall back to network), other GETs -> cache-first then network
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Serve navigation requests with cached shell first
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          // Optionally cache HTML responses
          return resp;
        }).catch(() => {
          return new Response('<h1>Offline</h1><p>No cached version available.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }

  // For other GET requests, try cache first, then network, and cache responses
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(resp => {
          // Only cache successful responses
          if (resp && resp.status === 200) {
            const cloned = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, cloned));
          }
          return resp;
        }).catch(() => {
          // No network and nothing cached
        });
      })
    );
  }
});