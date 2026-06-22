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

// Story 1.5 — tap a region to mark it visited; the mark persists across reload.
const KYOTO = { source: "boundaries", sourceLayer: "regions", id: "JP-26" } as const;
const isVisited = () =>
  window.__mapsakeMap!.getFeatureState(KYOTO).visited === true;

test("tap marks a region visited and the mark survives reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  // Fly to Japan and wait until 京都府 (JP-26) is in the loaded regions tiles.
  await page.evaluate(() => window.__mapsakeMap!.jumpTo({ center: [135.75, 35.0], zoom: 6 }));
  await page.waitForFunction(() =>
    (window.__mapsakeMap?.querySourceFeatures("boundaries", { sourceLayer: "regions" }) ?? [])
      .some((f) => f.properties?.iso === "JP-26"),
  );

  // Tap its centroid → optimistic + ack write → visited feature-state.
  await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const p = m.project([135.75, 35.0]);
    m.fire("click", { point: p, lngLat: { lng: 135.75, lat: 35.0 } });
  });
  await page.waitForFunction(isVisited);

  // Reload → the saved mark re-applies (persisted to region_marks).
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.evaluate(() => window.__mapsakeMap!.jumpTo({ center: [135.75, 35.0], zoom: 6 }));
  await page.waitForFunction(isVisited);
});
