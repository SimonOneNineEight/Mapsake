import { test, expect } from "@playwright/test";
import { pinsToGeoJSON } from "../features/map/lib/pins";
import type { Pin } from "../data/pins";

// Story 3.1 — pins. Pure tests for the pins→GeoJSON builder run in Node (no browser).
// The browser drop-a-pin e2e is skipped until the `pins` migration is applied to the
// linked Supabase project (supabase db push + regen types) — un-skip it then.

const pin = (over: Partial<Pin>): Pin => ({
  id: "p1",
  userId: "u1",
  name: "京都",
  lat: 35.0,
  lng: 135.75,
  countryCode: "JP",
  regionCode: "JP-26",
  note: null,
  memoryDate: null,
  exifTakenAt: null,
  muted: false,
  createdAt: "2026-06-22T00:00:00Z",
  updatedAt: "2026-06-22T00:00:00Z",
  ...over,
});

test.describe("pinsToGeoJSON", () => {
  test("empty pins → empty FeatureCollection", () => {
    expect(pinsToGeoJSON([])).toEqual({ type: "FeatureCollection", features: [] });
  });

  test("a pin → a Point feature at [lng, lat] carrying id + name", () => {
    const fc = pinsToGeoJSON([pin({ id: "abc", name: "京都", lng: 135.75, lat: 35.0 })]);
    expect(fc.features).toHaveLength(1);
    expect(fc.features[0]).toEqual({
      type: "Feature",
      id: "abc",
      geometry: { type: "Point", coordinates: [135.75, 35.0] },
      properties: { id: "abc", name: "京都" },
    });
  });

  test("multiple pins in one region each render at their own coords", () => {
    const fc = pinsToGeoJSON([
      pin({ id: "a", lng: 135.5, lat: 34.7 }),
      pin({ id: "b", lng: 139.7, lat: 35.7 }),
    ]);
    expect(fc.features.map((f) => f.id)).toEqual(["a", "b"]);
    expect(fc.features.map((f) => f.geometry.coordinates)).toEqual([
      [135.5, 34.7],
      [139.7, 35.7],
    ]);
  });
});

// Full drop → name → persist flow (the `pins` table is live as of the 3.1 migration).
// (Drop mode never calls addMark, so it can't mark the region; the pure roll-up tests
// cover that pins don't cascade. We don't assert "region unvisited" here because prior
// suites mark JP-26 in the shared test DB.)
test("dropping a named pin places it and persists across reload", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.evaluate(() => window.__mapsakeMap!.jumpTo({ center: [135.75, 35.0], zoom: 7 }));

  // Enter drop mode, then tap to land a pin.
  await page.getByRole("button", { name: "＋ 新增回憶" }).click();
  await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const p = m.project([135.75, 35.0]);
    m.fire("click", { point: p, lngLat: { lng: 135.75, lat: 35.0 } });
  });

  // Name it and save.
  await page.getByPlaceholder("例如：京都").fill("京都");
  await page.getByRole("button", { name: "儲存" }).click();

  // The pin renders in the `pins` source and persists across reload.
  await page.waitForFunction(
    () => (window.__mapsakeMap!.querySourceFeatures("pins") ?? []).length > 0,
  );
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.evaluate(() => window.__mapsakeMap!.jumpTo({ center: [135.75, 35.0], zoom: 7 }));
  await page.waitForFunction(
    () => (window.__mapsakeMap!.querySourceFeatures("pins") ?? []).length > 0,
  );
});
