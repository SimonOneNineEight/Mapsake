import type { Page } from "@playwright/test";

/**
 * Seed the default-view choice so the Story 4.1 first-run onboarding question does NOT appear.
 * Every Playwright context starts with clean localStorage, so without this the question overlay
 * covers the map for specs that aren't testing onboarding. Call in a `beforeEach` (before goto).
 */
export const bypassOnboarding = (page: Page) =>
  page.addInitScript(() =>
    localStorage.setItem("mapsake.defaultView", JSON.stringify({ kind: "world" })),
  );
