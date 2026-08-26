/**
 * Minimal shared service worker for Sales + Admin PWA installability.
 * Does NOT cache authenticated APIs, payments, orders, or sensitive data.
 * Socket.IO and printing remain in the page context — not here.
 */
const ICON_CACHE = "tastybites-pwa-icons-v1";
const ICON_PATH_PREFIX = "/icons/";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("tastybites-pwa-") && key !== ICON_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // Never intercept API / auth / realtime — network only, no cache
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("socket.io")
  ) {
    return;
  }

  // Safe: cache PWA icons only
  if (url.pathname.startsWith(ICON_PATH_PREFIX)) {
    event.respondWith(cacheFirstIcons(request));
    return;
  }

  // Default: network only (installability fetch handler present; no HTML/API caching)
});

async function cacheFirstIcons(request) {
  const cache = await caches.open(ICON_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}
