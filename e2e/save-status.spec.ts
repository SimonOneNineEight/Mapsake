import { test, expect } from "./fixtures";
import { bypassOnboarding } from "./onboarding-bypass";

// Story 2.5 — durable-write posture. These force a transient write failure (intercept the PostgREST
// endpoint) and assert the contract: the edit is RETAINED with a calm retry (never silently dropped),
// "saved" shows only AFTER the ack, and the retry persists. Onboarding is bypassed; the shared anon
// session provides the user, so region writes are RLS-scoped to it.
test.beforeEach(({ page }) => bypassOnboarding(page));

// A reliable land point (reused from onboarding.spec — India, on-screen at the world view).
const LAND = { lng: 78.9, lat: 22.6 };

const tilesReadyUnder = (c: { lng: number; lat: number }) =>
  Boolean(window.__mapsakeMap) &&
  window.__mapsakeMap!.queryRenderedFeatures(window.__mapsakeMap!.project([c.lng, c.lat]), {
    layers: ["regions-fill", "countries-fill-base", "countries-fill-world"],
  }).length > 0;

const openMapAtLand = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), LAND);
  await page.waitForFunction(tilesReadyUnder, LAND, { timeout: 15_000 });
};

const tapLand = (page: import("@playwright/test").Page) =>
  page.evaluate((c) => {
    const m = window.__mapsakeMap!;
    m.fire("click", { point: m.project([c.lng, c.lat]), lngLat: { lng: c.lng, lat: c.lat } });
  }, LAND);

test("a failed region mark is retained with a calm retry that then persists (Story 2.5 AC2)", async ({
  page,
}) => {
  let failWrites = true; // fail the mark upsert (both the initial + the retry:1) until we flip it
  await page.route("**/rest/v1/region_marks**", async (route) => {
    if (route.request().method() === "POST" && failWrites) {
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    }
    return route.continue();
  });

  await openMapAtLand(page);
  await tapLand(page);

  // The write failed → a calm retry (the optimistic fill is retained; marks never roll back).
  await expect(page.getByRole("button", { name: "無法儲存，重試" })).toBeVisible();

  // Let it succeed; tapping retry clears the pill (the mark is now durably persisted).
  failWrites = false;
  await page.getByRole("button", { name: "無法儲存，重試" }).click();
  await expect(page.getByRole("button", { name: "無法儲存，重試" })).toHaveCount(0);
});

test("\"已儲存\" shows only after the server ack, not on the optimistic fill (Story 2.5 AC1)", async ({
  page,
}) => {
  // Delay the mark write so the in-flight 「儲存中…」 is observable before the ack.
  await page.route("**/rest/v1/region_marks**", async (route) => {
    if (route.request().method() === "POST") await new Promise((r) => setTimeout(r, 700));
    return route.continue();
  });

  await openMapAtLand(page);
  await tapLand(page);

  // While the write is in flight: 「儲存中…」 (NOT 「已儲存」).
  await expect(page.getByText("儲存中…")).toBeVisible();
  // After the ack: 「已儲存」.
  await expect(page.getByText("已儲存")).toBeVisible();
});

test("a failed region unmark is retained with a calm retry (Story 2.5 / 3.10 gap)", async ({
  page,
}) => {
  // First mark the region for real (let the POST through), then long-press to unmark with the
  // DELETE forced to fail — the unmark must surface a calm retry (it had none before 2.5).
  let failDelete = false;
  await page.route("**/rest/v1/region_marks**", async (route) => {
    if (route.request().method() === "DELETE" && failDelete) {
      return route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    }
    return route.continue();
  });

  await openMapAtLand(page);
  await tapLand(page); // mark it (succeeds)
  await expect(page.getByText("已儲存")).toBeVisible();

  // Long-press (contextmenu) the bare mark → unmark; force the delete to fail.
  failDelete = true;
  await page.evaluate((c) => {
    const m = window.__mapsakeMap!;
    m.fire("contextmenu", {
      point: m.project([c.lng, c.lat]),
      lngLat: { lng: c.lng, lat: c.lat },
      preventDefault() {},
    });
  }, LAND);

  await expect(page.getByRole("button", { name: "無法移除，重試" })).toBeVisible();

  // Allow the delete; retry clears the pill.
  failDelete = false;
  await page.getByRole("button", { name: "無法移除，重試" }).click();
  await expect(page.getByRole("button", { name: "無法移除，重試" })).toHaveCount(0);
});
