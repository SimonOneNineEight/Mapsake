import { test, expect } from "./fixtures";
import { bypassOnboarding } from "./onboarding-bypass";

// Story 2.4 — cross-device sync (verify-and-document). The machinery already shipped: a signed-in
// user's RLS-scoped pins/marks load under their uid (AC1, enabled by the 2-7 sign-in), and the
// react-query config (refetchOnWindowFocus:true + staleTime 30s, app/providers.tsx) refreshes them
// (AC2 — refetch-based; NO live Realtime in v1). This locks the cross-device behavior by faking the
// account's server-side pins (as if built on another device) and asserting (1) they load and (2) a
// reload (the web-first "pull-to-refresh") surfaces a newly-added one. No production code; the sync
// model is documented in the story.
test.beforeEach(({ page }) => bypassOnboarding(page));

// A snake_case `pins` row as PostgREST returns it (listPins maps it to the domain Pin).
const pinRow = (id: string, name: string, lng: number, lat: number) => ({
  id,
  user_id: "acct",
  name,
  lat,
  lng,
  country_code: "JP",
  region_code: "JP-26",
  note: null,
  memory_date: null,
  exif_taken_at: null,
  muted: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
});

test("the account's pins load on this device, and a reload surfaces another device's new pin (Story 2.4)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  // Stand in for the account's server-side pins; mutable so we can add one between loads.
  let serverPins = [pinRow("p1", "京都", 135.75, 35.0)];
  await page.route("**/rest/v1/pins**", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(serverPins) });
  });

  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  // AC1: the account's existing pin loads (appears in the "Places visited" list).
  await page.getByRole("button", { name: "去過的地方" }).click();
  await expect(page.getByRole("button", { name: "京都", exact: true })).toBeVisible();

  // AC2: another device adds a pin → on reload (pull-to-refresh) this device shows it (refetch-based).
  serverPins = [...serverPins, pinRow("p2", "奈良", 135.83, 34.68)];
  await page.reload();
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.getByRole("button", { name: "去過的地方" }).click();
  await expect(page.getByRole("button", { name: "奈良", exact: true })).toBeVisible();
});
