import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// PWA (Story 4.5): Serwist compiles the service worker via webpack, so the production build runs
// `next build --webpack` (see package.json). Disabled in development so `next dev` (Turbopack) and
// hot-reload are untouched — the SW only registers in production builds.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // Serwist's `reloadOnOnline` defaults ON, hard-reloading the page on reconnect — which would
  // wipe in-progress state (a note being typed, a photo upload) just as the offline write-disabled
  // banner recovers gracefully on the `online` event. Durability-first: let the app handle reconnect.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Serwist adds a `webpack` config; without a turbopack config, `next dev` (Turbopack default)
  // errors. An empty turbopack config silences it — dev runs on Turbopack (SW disabled), the
  // `next build --webpack` path uses Serwist's webpack step to emit the SW.
  turbopack: {},
};

export default withSerwist(nextConfig);
