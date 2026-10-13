const CACHE = "zed-flows-v6";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("zed-flows-") && key !== CACHE)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" })
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put("./index.html", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match("./index.html")) || Response.error())
    );
    return;
  }

  if (url.pathname.endsWith("/manifest.json") || url.pathname.endsWith("/sw.js")) {
    event.respondWith(fetch(request, { cache: "no-store" }));
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
