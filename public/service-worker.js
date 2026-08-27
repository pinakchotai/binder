const CACHE_NAME = "binder-v2";
const STATIC_ASSETS = [
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function isNavigation(request) {
  return request.mode === "navigate";
}

function isStaticAsset(request) {
  if (!isSameOrigin(request)) return false;
  const url = new URL(request.url);
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|ico|woff2?)$/) !== null
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (isNavigation(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (!isStaticAsset(event.request)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetched;
    })
  );
});