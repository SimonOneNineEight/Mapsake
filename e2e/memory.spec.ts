import { test, expect } from "@playwright/test";

// Story 3.4 — open a pin → memory panel (desktop ≥840) / sheet (phone <840).
// Pins are per-anon-user under RLS, so each test seeds its own pin.

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

// Zoom in so the pin is an individual marker, then real-click it at its projected point.
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

test("desktop: tap a pin opens the right panel with its title; close clears it + the glow", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // ≥840 → panel
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await dropPin(page, "嵐山", 135.67, 35.01);
  await clickPin(page, 135.67, 35.01);

  await expect(page.getByRole("heading", { name: "嵐山" })).toBeVisible();
  // the glow layer now targets a real pin id (not the empty-string no-op filter)
  await page.waitForFunction(() => {
    const f = window.__mapsakeMap!.getFilter("pins-selected") as unknown[];
    return Array.isArray(f) && Array.isArray(f[2]) && (f[2] as unknown[])[2] !== "";
  });

  await page.getByRole("button", { name: "關閉" }).click();
  await expect(page.getByRole("heading", { name: "嵐山" })).toBeHidden();
  await page.waitForFunction(() => {
    const f = window.__mapsakeMap!.getFilter("pins-selected") as unknown[];
    return Array.isArray(f) && Array.isArray(f[2]) && (f[2] as unknown[])[2] === "";
  });
});

test("phone: tap a pin opens the bottom sheet, not the panel", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 }); // <840 → sheet
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await dropPin(page, "鴨川", 135.77, 35.02);
  await clickPin(page, 135.77, 35.02);

  await expect(page.getByRole("button", { name: "▾ 回到地圖" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "鴨川" })).toBeVisible();
});

test("in drop mode, tapping a pin places a new pin instead of opening", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await dropPin(page, "二条城", 135.74, 35.01);
  // zoom to the pin, enter drop mode, then click the pin
  await page.evaluate(() => window.__mapsakeMap!.jumpTo({ center: [135.74, 35.01], zoom: 15 }));
  await page.waitForFunction(() => window.__mapsakeMap!.queryRenderedFeatures({ layers: ["pins-marker"] }).length > 0);
  await page.getByRole("button", { name: "＋ 新增回憶" }).click();
  const pt = await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const f = m.queryRenderedFeatures({ layers: ["pins-marker"] })[0];
    const p = m.project((f.geometry as { coordinates: [number, number] }).coordinates);
    return { x: p.x, y: p.y };
  });
  const box = (await page.getByTestId("map-canvas").boundingBox())!;
  await page.mouse.click(box.x + pt.x, box.y + pt.y);

  // drop mode → the name input for a NEW pin appears; the memory panel does NOT open
  await expect(page.getByPlaceholder("例如：京都")).toBeVisible();
  await expect(page.getByRole("heading", { name: "二条城" })).toBeHidden();
});
