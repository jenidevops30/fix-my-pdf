/*
 * FixMyPDF offline service worker.
 * Strategy:
 *  - Precache the app shell ("/") on install.
 *  - Cache-first for immutable build assets + engine assets (static chunks,
 *    pdf.js cmaps/worker, icons, samples) so repeat visits and offline use
 *    never re-download the multi-MB PDF engine.
 *  - Network-first for navigations with cache fallback (fresh HTML when online).
 * Everything stays on-device — this SW never talks to third parties.
 */
const VERSION = "fixmypdf-v1";
const PRECACHE = ["/"];

const CACHE_FIRST_PREFIXES = [
  "/_next/static/",
  "/pdfjs/",
  "/pdf.worker.min.mjs",
  "/icons/",
  "/samples/",
  "/og-image.png",
  "/logo.svg",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin

  // Cache-first for immutable assets.
  if (CACHE_FIRST_PREFIXES.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-first for navigations, falling back to the cached shell offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/")))
    );
  }
});
