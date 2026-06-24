// Serwist service worker (Story 4.5). Precaches the app-shell (the Next build manifest exposed
// as self.__SW_MANIFEST) so a return visit loads the shell from cache. Runtime caching = the
// Next-tuned defaultCache. Base-map tile caching + offline write handling are Story 4.6 — NOT here.
// Excluded from the root tsconfig (WebWorker types); compiled by @serwist/next's webpack step.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

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
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
