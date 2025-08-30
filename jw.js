const CACHE_NAME = "pushpop-cache-v1";
const urlsToCache = [
  "index.html",
  "manifest.json",
  "icon.png",
  "pop1.mp3","pop2.mp3","pop3.mp3","pop4.mp3","pop5.mp3",
  "pop6.mp3","pop7.mp3","pop8.mp3","pop9.mp3","pop10.mp3"
];

// インストール時キャッシュ
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// リクエストをキャッシュから返す
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});