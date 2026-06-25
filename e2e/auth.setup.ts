import { test as setup, expect } from "@playwright/test";

// Shared anonymous session (test-infra, pulled ahead of Epic 6 6-5). Every Playwright context
// used to mint its OWN anonymous Supabase user, so repeated full-suite runs hit Supabase's per-IP
// hourly anon-sign-in cap and failed at setup. This setup project signs in ONCE, saves the session
// (the @supabase/ssr auth cookie minted by the middleware) to storageState, and every test reuses
// it — one sign-in per run instead of one per test. Per-test data isolation is handled by the
// reset fixture in e2e/fixtures.ts (RLS-safe delete of this user's own rows).
const authFile = "e2e/.auth/anon.json";

setup("create the shared anonymous session", async ({ page }) => {
  // The middleware (lib/supabase/proxy.ts) mints the anonymous session cookie on the first request.
  await page.goto("/");
  await page.waitForFunction(() => Boolean(window.__mapsakeMap), null, { timeout: 30_000 });
  // Confirm the anon session cookie actually landed before snapshotting.
  await expect
    .poll(async () => (await page.context().cookies()).some((c) => c.name.includes("auth-token")), {
      timeout: 15_000,
    })
    .toBeTruthy();
  await page.context().storageState({ path: authFile });
});
