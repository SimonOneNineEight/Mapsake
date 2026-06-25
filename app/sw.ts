// Serwist service worker (Story 4.5). Precaches the app-shell (the Next build manifest exposed
// as self.__SW_MANIFEST) so a return visit loads the shell from cache. Runtime caching = the
// Next-tuned defaultCache. Base-map tile caching + offline write handling are Story 4.6 — NOT here.
// Excluded from the root tsconfig (WebWorker types); compiled by @serwist/next's webpack step.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, ExpirationPlugin, RangeRequestsPlugin, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Base-map tiles (Story 4.6): the PMTiles file is fetched via HTTP Range requests, so the
    // cache needs RangeRequestsPlugin to store/replay 206 responses correctly. CacheFirst so the
    // map renders offline; falls through to network on a miss, so online load is unaffected.
    // Capped so a large PMTiles file can't grow the cache unbounded. (Latin label glyphs are an
    // external host — not cached here; they degrade offline, CJK renders locally.)
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/tiles/"),
      handler: new CacheFirst({
        cacheName: "mapsake-tiles",
        plugins: [
          new RangeRequestsPlugin(),
          // PMTiles is one file fetched as MANY byte-Range entries (header, directories, per-tile
          // ranges) — each Range is its own cache entry. Cap by COUNT high enough to hold a real
          // browsing session offline (8 would evict the header/dirs mid-session → blank map +
          // pmtiles EtagMismatch on partial eviction), and lean on purgeOnQuotaError for bytes.
          new ExpirationPlugin({
            maxEntries: 512,
            maxAgeSeconds: 30 * 24 * 60 * 60,
            purgeOnQuotaError: true,
          }),
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();

// Memory notifications (Story 5.1). Serwist owns fetch/install/activate; push + notificationclick
// are independent native events added alongside. The send job (Story 5.3) POSTs a JSON payload
// { title, body, url }; we show it as a native OS notification. The real deep-link landing
// (fly-to + glow + open-memory) is Story 5.4 — here notificationclick just opens/focuses the url.
self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string } = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = { body: event.data?.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Mapsake", {
      body: payload.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: payload.url ?? "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data as { url?: string } | undefined;
  event.waitUntil(self.clients.openWindow(data?.url ?? "/"));
});
