const CACHE_NAME = 'expense-splitter-v1';
const ASSETS_TO_CACHE = [
  '/',          // index.html
  '/index.html',
  '/manifest.json'
  // If you host additional static files (icons, css), add them here:
  // '/icons/icon-192.png', '/icons/icon-512.png'
];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        // Individual servers may refuse some cached entries (e.g., 404). Ignore such errors.
        console.warn('Cache addAll failed:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) return caches.delete(k);
        return Promise.resolve();
      }));
    })
  );
  self.clients.claim();
});

// Fetch: cache-first for app shell, network-first for others with fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // For navigation requests, prefer cached shell, then network
  if (req.mode === 'navigate' || (req.method === 'GET' && req.headers.get('accept') && req.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      caches.match('/index.html').then(cached => {
        return cached || fetch(req).then(resp => {
          // optionally cache navigation responses
          return resp;
        }).catch(() => {
          return new Response('<h1>Offline</h1><p>The app is offline and no cached version is available.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
    );
    return;
  }

  // For other requests, try cache first, then network, and put into cache
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        // Only cache GET successful responses
        if (req.method === 'GET' && resp && resp.status === 200 && resp.type !== 'opaque') {
          caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
        }
        return resp;
      }).catch(() => {
        // nothing found
      });
    })
  );
});
