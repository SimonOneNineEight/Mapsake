import { test, expect } from "./fixtures";

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

// Story 4.3 — rapid backfill marking rhythm. After the view question, onboarding drops into a
// backfill step: a non-blocking prompt while the user tap-marks; "完成" drops into the map.
const BACKFILL_PROMPT = "輕觸你去過的地方來上色";

// In-browser: is a boundary feature rendered under the point (tiles ready) / visited?
const featuresUnder = (c: { lng: number; lat: number }) =>
  Boolean(window.__mapsakeMap) &&
  window.__mapsakeMap!.queryRenderedFeatures(window.__mapsakeMap!.project([c.lng, c.lat]), {
    layers: ["regions-fill", "countries-fill-base", "countries-fill-world"],
  }).length > 0;

test("backfill: a land tap opens no panel; 完成 drops into the map (Story 4.3)", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 800 });
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await page.getByRole("button", { name: "看整個世界" }).click();
  await expect(page.getByText(BACKFILL_PROMPT)).toBeVisible(); // backfill step

  // Tap a region during backfill (the existing 1.5 rhythm, reused — pickCountry is off here).
  const lng = 78.9, lat = 22.6;
  await page.evaluate((c) => window.__mapsakeMap!.jumpTo({ center: [c.lng, c.lat], zoom: 7 }), { lng, lat });
  await page.waitForFunction(featuresUnder, { lng, lat }, { timeout: 15_000 });
  await page.evaluate((c) => {
    const m = window.__mapsakeMap!;
    m.fire("click", { point: m.project([c.lng, c.lat]), lngLat: { lng: c.lng, lat: c.lat } });
  }, { lng, lat });

  // AC2: marks-only — a region tap never opens the memory panel/sheet (no "add details" push).
  // (The fill/persist of the mark itself is the 1.5/3.9 path, covered by rollup/map specs;
  // it's session-gated, so it's not re-asserted here to keep this test session-free.)
  // The phone sheet is role="dialog"; the ≥840px panel is an <aside> (no dialog role) whose only
  // marker is its 關閉 close button — assert both so the guard has signal at this viewport.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "關閉" })).toHaveCount(0);
  await expect(page.getByText(BACKFILL_PROMPT)).toBeVisible(); // still in backfill, no nav away

  // Finish backfill → drop into the filled map.
  await page.getByRole("button", { name: "完成" }).click();
  await expect(page.getByText(BACKFILL_PROMPT)).toBeHidden();
});

test("a returning user sees no backfill prompt (Story 4.3)", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("mapsake.defaultView", JSON.stringify({ kind: "world" })),
  );
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await expect(page.getByText(BACKFILL_PROMPT)).toHaveCount(0);
});

// Story 4.4 — onboarding payoff hand-off. After 完成 ends backfill, one gentle skippable line
// invites adding depth later; dismissing it drops into the freshly colored map (the payoff).
const HANDOFF_LINE = "用 ＋ 新增回憶 加入圖釘、照片和回憶";

test("hand-off: 完成 shows the gentle line; 開始探索 drops into the filled map (Story 4.4)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));

  await page.getByRole("button", { name: "看整個世界" }).click();
  await expect(page.getByText(BACKFILL_PROMPT)).toBeVisible(); // backfill step
  await expect(page.getByText(HANDOFF_LINE)).toHaveCount(0); // not shown during marking

  // End backfill → the gentle hand-off line appears; the backfill prompt is gone.
  await page.getByRole("button", { name: "完成" }).click();
  await expect(page.getByText(BACKFILL_PROMPT)).toBeHidden();
  await expect(page.getByText(HANDOFF_LINE)).toBeVisible();
  // The payoff: the filled map stays visible behind the (non-blocking) hand-off card.
  await expect(page.getByTestId("map-canvas")).toBeVisible();

  // Dismiss → drop into the map; no onboarding overlay remains.
  await page.getByRole("button", { name: "開始探索" }).click();
  await expect(page.getByText(HANDOFF_LINE)).toBeHidden();
  await expect(page.getByRole("button", { name: "完成" })).toHaveCount(0);
});

test("a returning user sees no hand-off line (Story 4.4)", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("mapsake.defaultView", JSON.stringify({ kind: "world" })),
  );
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await expect(page.getByText(HANDOFF_LINE)).toHaveCount(0);
});

// Story 4.5 — PWA install affordance folded into the hand-off card. On installable Chromium a
// beforeinstallprompt is captured and the card offers 安裝到主畫面; with no install path the card
// still shows the line + 開始探索. (The iOS Share→Add-to-Home-Screen branch is UA-gated; the
// chromium project covers prompt/none, the iOS branch is verified by inspection.)
const INSTALL_BUTTON = "安裝到主畫面";

const finishToHandoff = async (page: import("@playwright/test").Page) => {
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  await page.getByRole("button", { name: "看整個世界" }).click();
  await page.getByRole("button", { name: "完成" }).click();
  await expect(page.getByText(HANDOFF_LINE)).toBeVisible();
};

test("hand-off folds in the install affordance when installable (Story 4.5)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("map-canvas")).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__mapsakeMap));
  // Simulate an installable Chromium: fire the deferred beforeinstallprompt the hook captures.
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt");
    Object.assign(e, {
      prompt: () => Promise.resolve(),
      userChoice: Promise.resolve({ outcome: "accepted" }),
    });
    window.dispatchEvent(e);
  });

  await page.getByRole("button", { name: "看整個世界" }).click();
  await page.getByRole("button", { name: "完成" }).click();
  await expect(page.getByText(HANDOFF_LINE)).toBeVisible();
  await expect(page.getByRole("button", { name: INSTALL_BUTTON })).toBeVisible();

  // 開始探索 still closes onboarding into the map.
  await page.getByRole("button", { name: "開始探索" }).click();
  await expect(page.getByText(HANDOFF_LINE)).toBeHidden();
});

test("hand-off shows no install affordance when not installable (Story 4.5)", async ({ page }) => {
  await page.goto("/");
  await finishToHandoff(page); // plain Chromium, no beforeinstallprompt fired → mode "none"
  await expect(page.getByRole("button", { name: INSTALL_BUTTON })).toHaveCount(0);
  // The card is still valid: gentle line + 開始探索.
  await expect(page.getByRole("button", { name: "開始探索" })).toBeVisible();
});

test("the web manifest is served with the PWA fields (Story 4.5)", async ({ page }) => {
  const res = await page.request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  const m = await res.json();
  expect(m.name).toBe("Mapsake");
  expect(m.display).toBe("standalone");
  const sizes = (m.icons ?? []).map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect((m.icons ?? []).some((i: { purpose?: string }) => i.purpose === "maskable")).toBeTruthy();
});
