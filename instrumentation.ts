// Next 16 instrumentation hook (Story 6.5). register() pulls in the matching Sentry runtime config;
// onRequestError forwards Server Component / Route Handler / Server Action errors to Sentry. All
// no-op when NEXT_PUBLIC_SENTRY_DSN is unset.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
