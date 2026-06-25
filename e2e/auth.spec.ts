import { test, expect } from "./fixtures";
import { bypassOnboarding } from "./onboarding-bypass";

// Story 2.1 — email magic-link sign-in. We can't click a real magic link in e2e (needs an inbox),
// so we cover the SURFACE + the send call: intercept Supabase's updateUser (PUT /auth/v1/user) to
// assert it fires with the email + redirect, and to drive the sent / error / taken states without
// sending real mail or hitting the rate limit. The confirm route's token exchange is verified
// manually (documented in the story). Onboarding is bypassed so the account button is mounted.
test.beforeEach(({ page }) => bypassOnboarding(page));

const openAccountSheet = async (page: import("@playwright/test").Page) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.getByRole("button", { name: "帳號" }).click();
  await expect(page.getByText("保存你的地圖")).toBeVisible();
};

test("the account button opens the sign-in surface — desktop modal (Story 2.1)", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 }); // ≥840 → centered modal
  await openAccountSheet(page);
  await expect(page.getByRole("button", { name: "寄送登入連結" })).toBeVisible();
});

test("the account button opens the sign-in surface — phone sheet (Story 2.1)", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 800 }); // <840 → bottom sheet
  await openAccountSheet(page);
  await expect(page.getByRole("button", { name: "寄送登入連結" })).toBeVisible();
});

test("an invalid email shows a calm error, no send (Story 2.1)", async ({ page }) => {
  await openAccountSheet(page);
  await page.getByLabel("email").fill("not-an-email");
  await page.getByRole("button", { name: "寄送登入連結" }).click();
  await expect(page.getByText("無法寄送，請確認 email 後再試一次")).toBeVisible();
});

test("a valid email links the account and shows the sent state (Story 2.1)", async ({ page }) => {
  // Intercept the anon→permanent link call so no real email is sent and it's deterministic.
  let sawEmail = false;
  let sawRedirect = false;
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") return route.continue(); // only intercept updateUser
    const req = route.request();
    const body = req.postData() ?? "";
    if (body.includes("kyoto@example.com")) sawEmail = true;
    // emailRedirectTo rides as `redirect_to` (query param or body, depending on supabase-js).
    if (decodeURIComponent(req.url() + body).includes("/auth/confirm")) sawRedirect = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await openAccountSheet(page);
  await page.getByLabel("email").fill("kyoto@example.com");
  await page.getByRole("button", { name: "寄送登入連結" }).click();

  await expect(page.getByText("查收你的信箱")).toBeVisible();
  await expect(page.getByText(/kyoto@example\.com/)).toBeVisible();
  expect(sawEmail).toBeTruthy();
  expect(sawRedirect).toBeTruthy();
});

test("both Google and email sign-in are offered — no single-OAuth lock-in (Story 2.2 AC2)", async ({ page }) => {
  await openAccountSheet(page);
  await expect(page.getByRole("button", { name: "用 Google 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "寄送登入連結" })).toBeVisible();
});

test("Google sign-in initiates the OAuth redirect to /auth/callback (Story 2.2)", async ({ page }) => {
  // Don't actually go to Google — capture the authorize navigation and abort it.
  let authorizeUrl = "";
  // linkIdentity navigates to .../auth/v1/user/identities/authorize?provider=google&redirect_to=…
  await page.route("**/authorize**", async (route) => {
    authorizeUrl = route.request().url();
    await route.abort();
  });
  await openAccountSheet(page);
  await page.getByRole("button", { name: "用 Google 登入" }).click();
  await expect.poll(() => authorizeUrl).toContain("provider=google");
  expect(decodeURIComponent(authorizeUrl)).toContain("/auth/callback");
});

test("returning from Google with an already-registered email opens a calm sign-in prompt (Story 2.2)", async ({ page }) => {
  // The /auth/callback route maps Supabase's error_code=email_exists to ?auth_error=existing.
  await page.goto("/?auth_error=existing");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  // The sheet auto-opens with the calm "you already have an account" message…
  await expect(page.getByText("這個信箱已經有帳號了，用原本的方式登入就能回到你的地圖。")).toBeVisible();
  // …and both sign-in methods stay available (never a hard wall).
  await expect(page.getByRole("button", { name: "用 Google 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "寄送登入連結" })).toBeVisible();
  // The flag is scrubbed from the URL so a refresh/back won't re-trigger it.
  await expect.poll(() => new URL(page.url()).search).toBe("");
});

test("an already-registered email shows the calm 'taken' message (Story 2.1)", async ({ page }) => {
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") return route.continue(); // only intercept updateUser
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ msg: "Email address already registered by another user" }),
    });
  });
  await openAccountSheet(page);
  await page.getByLabel("email").fill("taken@example.com");
  await page.getByRole("button", { name: "寄送登入連結" }).click();
  await expect(page.getByText("此信箱已有帳號")).toBeVisible();
});
