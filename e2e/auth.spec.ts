import { test, expect } from "./fixtures";
import { bypassOnboarding } from "./onboarding-bypass";

// Story 2.1 — email magic-link sign-in. We can't click a real magic link in e2e (needs an inbox),
// so we cover the SURFACE + the send call: intercept Supabase's updateUser (PUT /auth/v1/user) to
// assert it fires with the email + redirect, and to drive the sent + error states without
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
  // signInWithOAuth navigates to .../auth/v1/authorize?provider=google&redirect_to=… (a true sign-in
  // + sign-up, not linkIdentity — so a returning Google user lands in their existing account).
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
  await expect(page.getByText("已用此信箱註冊，使用信箱登入回到你的地圖。")).toBeVisible();
  // …and both sign-in methods stay available (never a hard wall).
  await expect(page.getByRole("button", { name: "用 Google 登入" })).toBeVisible();
  await expect(page.getByRole("button", { name: "寄送登入連結" })).toBeVisible();
  // The flag is scrubbed from the URL so a refresh/back won't re-trigger it.
  await expect.poll(() => new URL(page.url()).search).toBe("");
});

test("a taken email AUTOMATICALLY signs IN to the existing account via signInWithOtp (Story 2.7)", async ({ page }) => {
  // updateUser (link) returns 422 taken → the surface auto-sends the returning-user sign-in magic
  // link (POST /auth/v1/otp, shouldCreateUser:false), NOT updateUser again, with NO second tap. The
  // user sees the same "check your inbox" as a new sign-up, so we never leak whether the email exists.
  let sawOtpForEmail = false;
  await page.route("**/auth/v1/user**", async (route) => {
    if (route.request().method() !== "PUT") return route.continue(); // only intercept updateUser
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ msg: "Email address already registered by another user" }),
    });
  });
  await page.route("**/auth/v1/otp**", async (route) => {
    if (decodeURIComponent(route.request().url() + (route.request().postData() ?? "")).includes("returning@example.com"))
      sawOtpForEmail = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });

  await openAccountSheet(page);
  await page.getByLabel("email").fill("returning@example.com");
  await page.getByRole("button", { name: "寄送登入連結" }).click();
  // One tap → it auto-fired signInWithOtp and shows the shared "check your inbox" state (no dead-end,
  // no second button).
  await expect(page.getByText("查收你的信箱")).toBeVisible();
  expect(sawOtpForEmail).toBeTruthy();
});
