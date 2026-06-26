import { test, expect } from "./fixtures";
import { bypassOnboarding } from "./onboarding-bypass";

// Story 6.3 — the Settings surface (full-screen sheet, reached from the account sheet's 設定 entry).
// Anon-coverable: opening Settings, the sections render, the default-view choice persists, and the
// muted-places manager lists + un-mutes. (The signed-in 帳號 / notification controls are signed-in-only
// — the recurring anon-harness gap — verified manually.)

async function openSettings(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "帳號" }).click(); // the account trigger
  await page.getByRole("button", { name: "設定" }).click(); // the 設定 entry → closes account sheet, opens Settings
  await expect(page.getByText("語言", { exact: true })).toBeVisible({ timeout: 10_000 }); // a Settings-only section
}

async function dropPin(page: import("@playwright/test").Page, name: string, lng: number, lat: number) {
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), { lng, lat });
  await page.getByRole("button", { name: "＋ 新增回憶" }).click();
  await page.evaluate(
    (c) => {
      const m = window.__mapsakeMap!;
      m.fire("click", { point: m.project([c.lng, c.lat]), lngLat: { lng: c.lng, lat: c.lat } });
    },
    { lng, lat },
  );
  await page.getByPlaceholder("例如：京都").fill(name);
  await page.getByRole("button", { name: "儲存" }).click();
  await expect(page.getByText("已儲存")).toBeVisible({ timeout: 15_000 });
  const id = await page.evaluate((n) => {
    const f = (window.__mapsakeMap!.querySourceFeatures("pins") ?? []).find(
      (x) => x.properties?.name === n && !x.properties?.point_count,
    );
    return (f?.properties?.id as string | undefined) ?? null;
  }, name);
  expect(id).toBeTruthy();
  return id as string;
}

test.describe("Settings surface (Story 6.3)", () => {
  test("opens from the account sheet; sections render; default-view choice persists", async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto("/");
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    await openSettings(page);
    // Key sections present.
    await expect(page.getByText("預設視圖", { exact: true })).toBeVisible();
    await expect(page.getByText("靜音的地方", { exact: true })).toBeVisible();
    // 看整個世界 persists the default view to localStorage.
    await page.getByRole("button", { name: "看整個世界" }).click();
    await expect
      .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("mapsake.defaultView") || "{}").kind))
      .toBe("world");
  });

  test("muted places list + 恢復通知 (unmute) (Story 5.6 ↔ 6.3)", async ({ page }) => {
    await bypassOnboarding(page);
    const NAME = "靜音設定測試";
    await page.goto("/");
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    await page.waitForFunction(() => Boolean(window.__mapsakeMap));
    const id = await dropPin(page, NAME, 135.4, 35.2);

    // Mute it via its memory (deep-link open).
    await page.goto(`/?pin=${id}`);
    await page.getByRole("button", { name: /讓這個地方少出現/ }).click();
    await expect(page.getByRole("button", { name: /已靜音/ })).toBeVisible({ timeout: 15_000 });

    // Reload to close the open memory (so the name appears only in the Settings list), then it
    // shows under 靜音的地方; 恢復通知 removes it.
    await page.goto("/");
    await expect(page.getByTestId("map-canvas")).toBeVisible();
    await page.waitForFunction(() => Boolean(window.__mapsakeMap));
    await openSettings(page);
    const row = page.getByText(NAME);
    await expect(row).toBeVisible();
    await page.getByRole("button", { name: "恢復通知" }).first().click();
    await expect(page.getByText(NAME)).toHaveCount(0, { timeout: 10_000 });
  });
});
