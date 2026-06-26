// Sentry browser init (Story 6.5). Loaded by Next on the client. With NEXT_PUBLIC_SENTRY_DSN
// unset (local dev, CI, any build before Simon wires the DSN), Sentry.init is a no-op — no
// network, no overhead — so the app behaves identically until monitoring is switched on in prod.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Light trace sampling in prod (this is a private, low-traffic keepsake app); full in dev.
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
});

// Instruments App Router client-side navigations (Next 16).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
