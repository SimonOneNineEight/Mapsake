import { test, expect } from "@playwright/test";

// Story 4.1 — first-run default-view question. The choice lives in localStorage
// (`mapsake.defaultView`); a fresh Playwright context starts with clean storage, so the
// question shows by default. Onboarding is independent of the anon session.

const getZoom = () => window.__mapsakeMap!.getZoom();
const storedView = (page: import("@playwright/test").Page) =>
  page.evaluate(() => localStorage.getItem("mapsake.defaultView"));

test("first run asks the question; picking 'whole world' stays on the world view", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await expect(page.getByRole("button", { name: "看整個世界" })).toBeVisible();
  await page.getByRole("button", { name: "看整個世界" }).click();

  // Question dismissed, choice stored, still at the world framing (~z1.5).
  await expect(page.getByRole("button", { name: "看整個世界" })).toHaveCount(0);
  expect(await storedView(page)).toContain('"world"');
  expect(await page.evaluate(getZoom)).toBeLessThan(3);
});

test("picking 'focus on a country' then tapping a country flies into its regions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await page.getByRole("button", { name: "先看一個國家" }).click();
  await expect(page.getByText("輕觸地圖上的一個國家")).toBeVisible(); // pick-mode hint

  // Tap a country near the world-view center (India, ~lat 22 vs center lat 20) so it's
  // reliably on-screen at the world zoom. Wait for the country fill to actually render under
  // the point first (cold map), so the tap resolves a country and flies in.
  await page.waitForFunction(
    () =>
      Boolean(window.__mapsakeMap) &&
      window.__mapsakeMap!.queryRenderedFeatures(window.__mapsakeMap!.project([78.9, 22.6]), {
        layers: ["countries-fill-base", "countries-fill-world", "regions-fill"],
      }).length > 0,
    { timeout: 10_000 },
  );
  await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const lngLat = { lng: 78.9, lat: 22.6 };
    m.fire("click", { point: m.project([lngLat.lng, lngLat.lat]), lngLat });
  });

  await expect.poll(() => page.evaluate(getZoom), { timeout: 10_000 }).toBeGreaterThan(3);
  expect(await storedView(page)).toContain('"focus"');
  await expect(page.getByText("輕觸地圖上的一個國家")).toBeHidden();
});

test("focus pick mode can be escaped with 返回 (no ocean-tap dead-end)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await page.getByRole("button", { name: "先看一個國家" }).click();
  await expect(page.getByText("輕觸地圖上的一個國家")).toBeVisible();
  await page.getByRole("button", { name: "← 返回" }).click();

  // Back at the question — both choices available again; nothing was stored.
  await expect(page.getByRole("button", { name: "看整個世界" })).toBeVisible();
  await expect(page.getByRole("button", { name: "先看一個國家" })).toBeVisible();
  expect(await storedView(page)).toBeNull();
});

test("a returning 'world' user lands on the world view, no question (Story 4.2)", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("mapsake.defaultView", JSON.stringify({ kind: "world" })),
  );
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await expect(page.getByRole("button", { name: "看整個世界" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "先看一個國家" })).toHaveCount(0);
  expect(await page.evaluate(getZoom)).toBeLessThan(3); // world framing
});

test("a returning 'focus' user opens framed on their country (Story 4.2)", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "mapsake.defaultView",
      JSON.stringify({ kind: "focus", countryCode: "IN", center: [78.9, 22.6] }),
    ),
  );
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  // No question, and the map opens at the focus zoom centered near the stored center.
  await expect(page.getByRole("button", { name: "看整個世界" })).toHaveCount(0);
  expect(await page.evaluate(getZoom)).toBeGreaterThan(3);
  const c = await page.evaluate(() => {
    const { lng, lat } = window.__mapsakeMap!.getCenter();
    return { lng, lat };
  });
  expect(Math.abs(c.lng - 78.9)).toBeLessThan(1);
  expect(Math.abs(c.lat - 22.6)).toBeLessThan(1);
});
