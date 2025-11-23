const CACHE_NAME = 'idd-usep-v7-final';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(key => {
    if (key !== CACHE_NAME) return caches.delete(key);
  }))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  
  if (url.href.includes('script.google.com')) {
    // API: Network First -> Cache Fallback
    event.respondWith(fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, clone));
      return res;
    }).catch(() => caches.match(req)));
  } else {
    // Assets: Cache First -> Network Fallback
    event.respondWith(caches.match(req).then(res => res || fetch(req)));
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
