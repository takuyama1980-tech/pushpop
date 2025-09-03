const CACHE_NAME = 'push-pop-cache-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon-180.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => (k !== CACHE_NAME) ? caches.delete(k) : null)
    ))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then(resp => {
      return resp || fetch(e.request).then(fetchResp => {
        const copy = fetchResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return fetchResp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});