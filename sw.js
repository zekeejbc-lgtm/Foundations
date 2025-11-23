const CACHE_NAME = 'idd-usep-v8-absolute-final';
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
  
  // API: Network First (Get fresh data), fallback to Cache
  if (url.href.includes('script.google.com')) {
    event.respondWith(fetch(req).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, clone));
      return res;
    }).catch(() => caches.match(req)));
  } 
  // Static Assets: Cache First (Fast load), fallback to Network
  else {
    event.respondWith(caches.match(req).then(res => res || fetch(req)));
  }
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
