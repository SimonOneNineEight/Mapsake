import { test, expect } from "./fixtures";
import { bypassOnboarding } from "./onboarding-bypass";

// Story 5.4 — deep-link re-live landing. Arriving at /?pin={id} opens that pin's memory (fly + glow
// are MapLibre internals, not asserted here), scrubs the URL, and is not interrupted by first-run
// onboarding. A missing pin lands calmly. (The shared-anon session can drop a pin and own it.)

const NAME = "重溫京都標記"; // distinctive so the memory heading is unambiguous

async function dropNamedPin(page: import("@playwright/test").Page): Promise<string> {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.evaluate(() => window.__mapsakeMap!.jumpTo({ center: [135.75, 35.0], zoom: 7 }));

  await page.getByRole("button", { name: "＋ 新增回憶" }).click();
  await page.evaluate(() => {
    const m = window.__mapsakeMap!;
    const p = m.project([135.75, 35.0]);
    m.fire("click", { point: p, lngLat: { lng: 135.75, lat: 35.0 } });
  });
  await page.getByPlaceholder("例如：京都").fill(NAME);
  await page.getByRole("button", { name: "儲存" }).click();
  // Wait for the durable ack so the source carries the real server id (not the temp optimistic one).
  await expect(page.getByText("已儲存")).toBeVisible({ timeout: 15_000 });

  const pinId = await page.evaluate((name) => {
    const feats = window.__mapsakeMap!.querySourceFeatures("pins") ?? [];
    const f = feats.find((x) => x.properties?.name === name && !x.properties?.point_count);
    return (f?.properties?.id as string | undefined) ?? null;
  }, NAME);
  expect(pinId).toBeTruthy();
  return pinId as string;
}

test.describe("deep-link re-live landing (Story 5.4)", () => {
  test("a /?pin= deep-link opens that pin's memory and scrubs the URL", async ({ page }) => {
    await bypassOnboarding(page); // not testing onboarding here; drop the pin cleanly
    const pinId = await dropNamedPin(page);

    await page.goto(`/?pin=${pinId}`);
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    // The memory card (its name heading) opens from the deep-link.
    await expect(page.getByRole("heading", { name: NAME })).toBeVisible({ timeout: 15_000 });
    // The ?pin= param is scrubbed so a refresh/back won't re-trigger.
    await expect.poll(() => new URL(page.url()).search).toBe("");
  });

  test("a deep-link arrival is not interrupted by first-run onboarding", async ({ page }) => {
    // Force a genuine first-run (no saved default view), then arrive via a deep-link.
    await page.addInitScript(() => localStorage.removeItem("mapsake.defaultView"));
    await page.goto("/?pin=00000000-0000-0000-0000-000000000000");
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    // The first-run question must NOT appear (the deep-link skips onboarding).
    await expect(page.getByText("先從哪裡開始看？")).toHaveCount(0);
  });

  test("a missing/deleted pin lands calmly — no memory, no error", async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto("/?pin=00000000-0000-0000-0000-000000000000");
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    // No memory card opens for an unknown pin.
    await expect(page.getByRole("heading", { name: NAME })).toHaveCount(0);
  });
});
