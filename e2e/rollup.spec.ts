import { test, expect } from "@playwright/test";
import { computeVisitedKeys, pinsToVisitedMarks } from "../features/map/lib/visited";

// Story 1.6 — visited roll-up. These exercise the pure key-derivation in Node (no browser):
// a marked admin-1 region lights its parent country; a country mark never cascades down.

test.describe("computeVisitedKeys (roll-up)", () => {
  test("an admin-1 mark lights its region AND its parent country", () => {
    const keys = computeVisitedKeys([{ regionCode: "JP-26", countryCode: "JP", level: "admin1" }]);
    expect([...keys].sort()).toEqual(["countries|JP", "regions|JP-26"]);
  });

  test("a country mark lights only the country — no downward cascade", () => {
    const keys = computeVisitedKeys([{ regionCode: "MN", countryCode: "MN", level: "country" }]);
    expect([...keys]).toEqual(["countries|MN"]);
    expect([...keys].some((k) => k.startsWith("regions|"))).toBe(false);
  });

  test("two admin-1 marks in one country dedupe to a single country key", () => {
    const keys = computeVisitedKeys([
      { regionCode: "JP-26", countryCode: "JP", level: "admin1" },
      { regionCode: "JP-13", countryCode: "JP", level: "admin1" },
    ]);
    expect([...keys].filter((k) => k.startsWith("countries|"))).toEqual(["countries|JP"]); // exactly one country key
    expect(keys.size).toBe(3); // regions|JP-26, regions|JP-13, countries|JP
  });

  test("removing the last contributing admin-1 mark drops the country roll-up", () => {
    expect(computeVisitedKeys([{ regionCode: "JP-26", countryCode: "JP", level: "admin1" }]).has("countries|JP")).toBe(true);
    expect(computeVisitedKeys([]).size).toBe(0);
  });

  test("an admin-1 mark with no countryCode adds no malformed country key", () => {
    const keys = computeVisitedKeys([{ regionCode: "JP-26", level: "admin1" }]);
    expect([...keys]).toEqual(["regions|JP-26"]);
    expect([...keys].some((k) => k.startsWith("countries|"))).toBe(false);
  });
});

// Story 3.9 — pins roll up into visited. Pure derive (Node, no browser): a pin lights its
// region + country via the same computeVisitedKeys path as explicit marks.
test.describe("pinsToVisitedMarks (Story 3.9 roll-up)", () => {
  test("a pin with an admin-1 region lights its region AND country", () => {
    const keys = computeVisitedKeys(
      pinsToVisitedMarks([{ regionCode: "JP-26", countryCode: "JP" }]),
    );
    expect([...keys].sort()).toEqual(["countries|JP", "regions|JP-26"]);
  });

  test("a pin that resolved only a country lights just the country (no cascade)", () => {
    const keys = computeVisitedKeys(pinsToVisitedMarks([{ regionCode: null, countryCode: "MN" }]));
    expect([...keys]).toEqual(["countries|MN"]);
    expect([...keys].some((k) => k.startsWith("regions|"))).toBe(false);
  });

  test("a pin with neither code is skipped", () => {
    expect(pinsToVisitedMarks([{ regionCode: null, countryCode: null }])).toEqual([]);
  });

  test("removing the only contributing pin returns the region (and country) to bare (AC2)", () => {
    const withPin = computeVisitedKeys(pinsToVisitedMarks([{ regionCode: "JP-26", countryCode: "JP" }]));
    expect(withPin.has("regions|JP-26")).toBe(true);
    expect(withPin.has("countries|JP")).toBe(true);
    // pin removed, no explicit mark → bare
    expect(computeVisitedKeys(pinsToVisitedMarks([])).size).toBe(0);
  });

  test("a region backed by BOTH a mark and a pin stays visited when the pin is removed (AC3)", () => {
    const mark = { regionCode: "JP-26", countryCode: "JP", level: "admin1" as const };
    const withBoth = computeVisitedKeys([mark, ...pinsToVisitedMarks([{ regionCode: "JP-26", countryCode: "JP" }])]);
    expect(withBoth.has("regions|JP-26")).toBe(true);
    // pin gone, explicit mark remains → still visited
    expect(computeVisitedKeys([mark]).has("regions|JP-26")).toBe(true);
  });
});

// Browser flow: dropping a pin in an unmarked region fills that region (+ its country).
const dropPin = async (page: import("@playwright/test").Page, name: string, lng: number, lat: number) => {
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), { lng, lat });
  await page.getByRole("button", { name: "＋ 新增回憶" }).click();
  await page.evaluate((c) => {
    const m = window.__mapsakeMap!;
    m.fire("click", { point: m.project([c.lng, c.lat]), lngLat: { lng: c.lng, lat: c.lat } });
  }, { lng, lat });
  await page.getByPlaceholder("例如：京都").fill(name);
  await page.getByRole("button", { name: "儲存" }).click();
  await expect(page.getByText("已儲存")).toBeVisible({ timeout: 15_000 });
};

// NOTE: these run in the browser via page.evaluate/waitForFunction, so they must be
// self-contained — only the function body is serialized, not module-scope closures (hence
// the inlined layer list in each).

// How many boundary features are rendered under the point (the "tiles are actually rendered
// here" guard, so the not-visited precheck isn't vacuous while tiles still load).
const featuresUnder = (c: { lng: number; lat: number }) => {
  const m = window.__mapsakeMap;
  if (!m) return 0;
  return m.queryRenderedFeatures(m.project([c.lng, c.lat]), {
    layers: ["regions-fill", "countries-fill-base", "countries-fill-world"],
  }).length;
};

// True iff some boundary feature under the point has visited state.
const regionVisitedUnder = (c: { lng: number; lat: number }) => {
  const m = window.__mapsakeMap;
  if (!m) return false;
  const pt = m.project([c.lng, c.lat]);
  const feats = m.queryRenderedFeatures(pt, {
    layers: ["regions-fill", "countries-fill-base", "countries-fill-world"],
  });
  return feats.some((f) => {
    if (f.id == null) return false;
    const st = m.getFeatureState({ source: "boundaries", sourceLayer: f.sourceLayer, id: f.id });
    return Boolean(st && st.visited === true);
  });
};

test("dropping a pin rolls its region up to visited (Story 3.9 AC1)", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  const lng = 139.7, lat = 35.68; // Tokyo area — fresh anon user, no marks yet
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), { lng, lat });
  // Wait for boundary tiles to actually render under the point, so the not-visited
  // precheck reflects state (not an empty feature list while tiles are still loading).
  await page.waitForFunction(featuresUnder, { lng, lat }, { timeout: 15_000 });
  // Precondition: not visited before any pin.
  expect(await page.evaluate(regionVisitedUnder, { lng, lat })).toBe(false);

  await dropPin(page, "東京", lng, lat);

  // After the pin acks + refetches, the region under it rolls up to visited.
  await page.waitForFunction(regionVisitedUnder, { lng, lat }, { timeout: 15_000 });
});

// Zoom in so the pin is an individual marker, then real-click it to open its memory.
const clickPin = async (page: import("@playwright/test").Page, lng: number, lat: number) => {
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 15 }), { lng, lat });
  await page.waitForFunction(() => window.__mapsakeMap!.queryRenderedFeatures({ layers: ["pins-marker"] }).length > 0);
  const pt = await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const f = m.queryRenderedFeatures({ layers: ["pins-marker"] })[0];
    const p = m.project((f.geometry as { coordinates: [number, number] }).coordinates);
    return { x: p.x, y: p.y };
  });
  const box = (await page.getByTestId("map-canvas").boundingBox())!;
  await page.mouse.click(box.x + pt.x, box.y + pt.y);
};

test("deleting the only pin returns the region to bare (Story 3.8 AC3 / 3.9 AC2)", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  const lng = 139.7, lat = 35.68; // Tokyo — fresh anon user, no explicit mark
  await dropPin(page, "東京", lng, lat); // name-only → no confirm dialog on delete
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), { lng, lat });
  await page.waitForFunction(featuresUnder, { lng, lat }, { timeout: 15_000 });
  await page.waitForFunction(regionVisitedUnder, { lng, lat }, { timeout: 15_000 }); // rolled up

  // Open the pin and delete it (name-only → deletes with no dialog).
  await clickPin(page, lng, lat);
  await page.getByRole("button", { name: "刪除回憶" }).click();

  // The pin was the only contributor → the region returns to bare.
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), { lng, lat });
  await page.waitForFunction(featuresUnder, { lng, lat }, { timeout: 15_000 });
  await page.waitForFunction((c) => {
    const m = window.__mapsakeMap;
    if (!m) return false;
    const pt = m.project([c.lng, c.lat]);
    const feats = m.queryRenderedFeatures(pt, { layers: ["regions-fill", "countries-fill-base", "countries-fill-world"] });
    return feats.every((f) => {
      if (f.id == null) return true;
      const st = m.getFeatureState({ source: "boundaries", sourceLayer: f.sourceLayer, id: f.id });
      return !(st && st.visited === true);
    });
  }, { lng, lat }, { timeout: 15_000 });
});
