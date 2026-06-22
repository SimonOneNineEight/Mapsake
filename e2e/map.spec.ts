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

  // fly to Japan so the regions layer is in view
  await page.evaluate(() => {
    window.__mapsakeMap!.jumpTo({ center: [136, 36], zoom: 5.2 });
  });

  // Poll until 京都府's baked zh-Hant label is present in the `regions` source.
  // querySourceFeatures only returns tiles already loaded AND in view, so a single
  // `idle` right after jumpTo can race tile loading on a cold cache — poll instead.
  await page.waitForFunction(() => {
    const m = window.__mapsakeMap;
    if (!m) return false;
    const feats = m.querySourceFeatures("boundaries", { sourceLayer: "regions" });
    return feats.some((f) => f.properties?.name_zh === "京都府");
  });
});
