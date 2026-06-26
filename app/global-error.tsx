"use client";

// App Router global error boundary (Story 6.5). Only renders if the root layout itself throws —
// it replaces <html>/<body>, so they're declared here. Reports to Sentry (no-op without a DSN) and
// shows a calm zh-TW fallback (the app is single-locale zh-TW; no next-intl provider exists this
// high up). Not the deferred Lamplight theme — app chrome stays light.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-TW">
      <body style={{ display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p style={{ fontSize: "1.05rem", marginBottom: "1rem" }}>出了一點問題，你的回憶都還在。</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ padding: "0.5rem 1.25rem", borderRadius: "9999px", border: "1px solid currentColor", background: "transparent", cursor: "pointer" }}
          >
            重新整理
          </button>
        </div>
      </body>
    </html>
  );
}
