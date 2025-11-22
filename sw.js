const CACHE_NAME = 'idd-usep-v2'; // Increment this to force cache clear on next deploy
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// 1. Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// 2. Activate (Clean old caches)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

// 3. Fetch (Network First for Data, Cache First for Assets)
self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.href.includes('script.google.com')) {
    // API: Network First -> Fallback to Cache
    event.respondWith(
      fetch(req).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
  } else {
    // Assets: Cache First -> Fallback to Network
    event.respondWith(
      caches.match(req).then(res => res || fetch(req))
    );
  }
});

// 4. Listen for "Skip Waiting" message from frontend
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
