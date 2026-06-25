import { test, expect } from "./fixtures";

// Story 2.3 — the post-payoff "keep your map" prompt. After the onboarding payoff lands (4-4
// hand-off dismissed), the account sheet opens ONCE as a quiet keepsake invitation, never a gate or
// nag, then never re-nags. These DRIVE onboarding (no bypass) so the finishHandoff trigger fires;
// the shared session is anonymous, so the prompt's "not signed in" condition holds.

// World path (no map interaction): 看整個世界 → 完成 → 開始探索. Desktop viewport so the sheet is the
// centered modal (the × close button exists at ≥840px).
const finishOnboarding = async (page: import("@playwright/test").Page) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.getByRole("button", { name: "看整個世界" }).click();
  await page.getByRole("button", { name: "完成" }).click();
  await page.getByRole("button", { name: "開始探索" }).click();
};

test("the keep-your-map prompt opens once after the onboarding payoff (Story 2.3)", async ({ page }) => {
  await finishOnboarding(page);
  // The account sheet opens as the post-payoff keepsake invitation (reuses the 2-1/2-2 surface).
  await expect(page.getByText("保存你的地圖")).toBeVisible();
  // Never a gate — the filled map stays visible behind it.
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  // Both sign-in methods are offered.
  await expect(page.getByRole("button", { name: "用 Google 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "寄送登入連結" })).toBeVisible();
});

test("the prompt is skippable and does not re-nag on reload (Story 2.3)", async ({ page }) => {
  await finishOnboarding(page);
  await expect(page.getByText("保存你的地圖")).toBeVisible();
  // Dismiss via the modal × — the map remains usable, no gate.
  await page.getByRole("button", { name: "關閉" }).click();
  await expect(page.getByText("保存你的地圖")).toHaveCount(0);
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  // Reload: onboarding doesn't replay (default view stored) AND the seen flag suppresses — no re-open.
  await page.reload();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await expect(page.getByText("保存你的地圖")).toHaveCount(0);
});

test("a returning user gets no auto-prompt (Story 2.3)", async ({ page }) => {
  // Returning user: a default view is already chosen, so onboarding doesn't run and the prompt
  // trigger (finishHandoff) never fires.
  await page.addInitScript(() =>
    localStorage.setItem("mapsake.defaultView", JSON.stringify({ kind: "world" })),
  );
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  // The account button is present, but the sheet did NOT auto-open.
  await expect(page.getByRole("button", { name: "帳號" })).toBeVisible();
  await expect(page.getByText("保存你的地圖")).toHaveCount(0);
});
