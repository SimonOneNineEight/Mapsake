import { test, expect } from "@playwright/test";

// Story 1.3 — the map renders the Story 1.2 PMTiles with zh-TW admin-1 labels.
// Run: pnpm exec playwright install chromium && pnpm test:e2e

declare global {
  interface Window {
    // exposed by features/map/components/MapCanvas.tsx for testing
    __mapsakeMap?: import("maplibre-gl").Map;
  }
}

test("renders the parchment atlas with zh-TW admin-1 labels", async ({ page }) => {
  await page.goto("/");

  // the map canvas mounts
  await expect(page.getByTestId("map-canvas")).toBeVisible();

  // the map instance becomes available
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  // fly to Japan so the regions layer is in view, then wait for the map to settle
  await page.evaluate(async () => {
    const m = window.__mapsakeMap!;
    m.jumpTo({ center: [136, 36], zoom: 5.2 });
    await new Promise<void>((resolve) => m.once("idle", () => resolve()));
  });

  // a known prefecture is present in the `regions` layer with its baked zh-Hant label
  const hasKyoto = await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const feats = m.querySourceFeatures("boundaries", { sourceLayer: "regions" });
    return feats.some((f) => f.properties?.name_zh === "京都府");
  });
  expect(hasKyoto).toBe(true);
});
