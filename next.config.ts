import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

// next-intl (Story 6.1): the request config lives at the non-default lib/i18n path, so pass it
// explicitly (the no-arg default only finds ./i18n or ./src/i18n).
const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

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

// Sentry (Story 6.5) wraps OUTERMOST so its source-map step sees Serwist's + next-intl's output.
// Source-map upload + log noise are gated on SENTRY_AUTH_TOKEN: with the token unset (local dev, CI,
// any pre-DSN build) nothing uploads and the build stays green; Vercel's prod build sets the token
// and uploads. NEXT_PUBLIC_SENTRY_DSN being unset makes the runtime SDK a no-op (see the init files).
const hasSentryAuth = Boolean(process.env.SENTRY_AUTH_TOKEN);

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !hasSentryAuth,
  sourcemaps: { disable: !hasSentryAuth },
  widenClientFileUpload: true,
});
