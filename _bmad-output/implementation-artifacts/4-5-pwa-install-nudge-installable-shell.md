---
baseline_commit: 6ab9976
---

# Story 4.5: PWA install nudge + installable shell

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to install Mapsake to my home screen,
so that memory notifications can reach me later (incl. iPhone).

## Acceptance Criteria

1. **Installable PWA with a cached app-shell.** Serwist (`@serwist/next`) + a web manifest are configured so Mapsake is installable as a PWA: a valid manifest (name, icons incl. 192/512 + maskable, `display: standalone`, theme/background color from DESIGN tokens), a registered service worker, and the app-shell precached so a return visit loads the shell from cache. Lighthouse/devtools "installable" criteria pass. [epics 4.5 AC1; architecture lines 99 (Serwist `@serwist/next`), 252 (`sw.ts`), 237 (manifest/icons)]
2. **Install affordance folded into the onboarding payoff hand-off (not nagging).** The install nudge lives INSIDE the Story 4.4 hand-off card (resolved with Simon, Q2): the same calm payoff card that shows 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 + 開始探索 also offers a calm 安裝到主畫面 affordance. It is platform-aware: on Android/desktop Chromium it captures `beforeinstallprompt` and the 安裝到主畫面 control calls `prompt()`; on iOS Safari (no `beforeinstallprompt`) it shows the 分享 → 加入主畫面 instruction line (this unlocks iOS web-push on 16.4+). If already installed (`display-mode: standalone`) OR no install path is available, the install affordance is simply omitted — the card still shows the gentle line + 開始探索. Because it rides the once-per-first-run hand-off, it never nags on later visits. [epics 4.5 AC2; architecture line 60 (install nudge gates retention), line 44 (web push needs installed PWA on iOS 16.4+); Q2]
3. **No regression; SW does not disrupt dev or the durable-write/online flows.** The service worker is DISABLED in development (`disable: NODE_ENV === "development"`) so `next dev --turbopack` and hot-reload are unaffected. The production build still succeeds with `cacheComponents` intact (see the build-tooling note — Serwist needs webpack to emit the SW). No write/read behavior changes: 4.5 caches the app-shell only; base-map tile caching + the offline write-disabled banner are **Story 4.6**. Onboarding (4.1–4.4), map, pins, and memories all still work. [architecture lines 59-60, 160, 205; scope boundary vs 4.6]

## Tasks / Subtasks

- [x] **Task 0 — Pre-flight: build-tooling decision + dependency (AC: 1, 3)**
  - [x] RESOLVED (Q1): use `@serwist/next` and switch the **build** script to `next build --webpack` (keep `dev` on Turbopack, SW disabled in dev). **VERIFY FIRST** that `next build --webpack` still succeeds with `cacheComponents: true` in `next.config.ts` BEFORE writing the SW. If the webpack build rejects `cacheComponents`, STOP and report to Simon (do NOT silently drop `cacheComponents`) — that's the pivot back to a Turbopack approach.
  - [x] Add deps: `pnpm add @serwist/next` + `pnpm add -D serwist`. (Pre-approved — the AC names Serwist; not a dev-story HALT.) Pin versions in the File List.
- [x] **Task 1 — Web manifest + icons (AC: 1)** [app/manifest.ts, app/icon.tsx / public/icons]
  - [x] Add `app/manifest.ts` (Next `MetadataRoute.Manifest`): `name: "Mapsake"`, `short_name: "Mapsake"`, `start_url: "/"`, `display: "standalone"`, `background_color` + `theme_color` from DESIGN tokens (the parchment surface / terracotta — use the resolved hex, NOT `rgb(var(--…))`, manifests can't read CSS vars), `lang: "zh-Hant"`, and `icons` (192, 512, plus a 512 `purpose: "maskable"`).
  - [x] Icons (RESOLVED Q3 — Simon supplies brand PNGs): reference `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png` (purpose maskable), and `public/apple-touch-icon.png` from the manifest + apple touch link. ⚠️ DEPENDENCY: these 4 PNG files must be dropped in by Simon for the installability check to pass — build/manifest structure can land first, but flag in Completion Notes if the files are not yet present (the prod build still succeeds; Lighthouse installability needs the real icons). Add `apple-mobile-web-app-capable` meta so iOS install works.
  - [x] Wire the manifest + `theme-color` into `app/layout.tsx` metadata (`metadata.manifest`, `viewport.themeColor`) — extend the existing `metadata` export, don't replace it.
- [x] **Task 2 — Serwist service worker + app-shell precache (AC: 1, 3)** [app/sw.ts, next.config.ts]
  - [x] Add `app/sw.ts` (Serwist SW entry: `defaultCache` precaching the build manifest = the app-shell). Keep the runtime caching MINIMAL for v1 — app-shell/static assets only. Do NOT add base-map tile caching or offline write handling here (that's 4.6).
  - [x] Wrap `next.config.ts` with `withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development", ... })`, preserving the existing `cacheComponents: true`. Use a git-SHA or random revision for precache busting (per Serwist docs).
  - [x] Confirm the SW registers in a production build (`next build --webpack && next start`) and the app is flagged installable; confirm it stays OFF under `next dev`.
- [x] **Task 3 — Install affordance folded into the 4.4 hand-off card (AC: 2, 3)** [features/onboarding/components/onboarding.tsx + a small install hook]
  - [x] RESOLVED Q2: extend the EXISTING `handoff` branch of `onboarding.tsx` (do NOT build a separate nudge surface). Inside the hand-off card, below the gentle line and above/beside 開始探索, render a calm 安裝到主畫面 affordance driven by an install hook. Platform-aware:
    - Capture `beforeinstallprompt` (Android/desktop Chromium): store the event; the 安裝到主畫面 button calls `prompt()`; on `appinstalled` (or after prompt) drop the affordance.
    - iOS Safari (no `beforeinstallprompt`; detect iOS + not standalone): show the 分享 → 加入主畫面 instruction line instead of a button.
    - If `window.matchMedia("(display-mode: standalone)").matches` (already installed) OR no install path is available → render only the line + 開始探索 (omit the install affordance). The card must always be valid even with no install option.
  - [x] Add a small client hook (e.g. `features/onboarding/lib/use-install-prompt.ts` or `features/pwa/`) that owns the `beforeinstallprompt` capture + platform detection + standalone check. SSR-guard the `window`/`navigator` reads (client-only, mirror `onboarding-prefs.ts`). The `beforeinstallprompt` listener must be registered early enough (module/app-level) to catch the event — note that the event can fire before the hand-off mounts, so capture it at a stable mount (e.g. in the shell or a top effect) and read the captured value in the card.
  - [x] No separate dismissal flag needed — the affordance rides the once-per-first-run hand-off (gated by `readDefaultView() === null`), so it never nags returning/installed users. 開始探索 still closes onboarding via `finishHandoff`.
- [x] **Task 4 — Tests (AC: 1, 2, 3)** [e2e + unit]
  - [x] e2e: dispatch a synthetic `beforeinstallprompt` on `window` before finishing onboarding → complete onboarding (answer → backfill 完成) → the hand-off card shows the gentle line AND the 安裝到主畫面 affordance → 開始探索 closes onboarding. Also assert the card is valid with NO install event (affordance omitted, line + 開始探索 still present). The 4.4 hand-off assertions must still hold.
  - [x] Platform-mode coverage — DEVIATION: the repo has NO unit-test runner (Playwright e2e only), so instead of a unit test I cover the install modes via e2e: `prompt` (synthetic `beforeinstallprompt` → 安裝到主畫面 shows) and `none` (plain Chromium → affordance omitted). The `ios` branch is UA-gated (no webkit project) and is verified by code inspection only. Adding a unit runner (vitest) is out of scope / would need approval.
  - [x] Manifest/SW smoke: assert `app/manifest.ts` output has the required fields + icon sizes; assert the SW is disabled in dev config and emitted by the prod build. (A full Lighthouse-installability check can be a manual verification note.)
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green (the build now uses the chosen Serwist path). Existing onboarding e2e (9 tests) still passes — the nudge must not block the hand-off assertions (gate it so it appears only AFTER 開始探索, or after the existing tests' bypass).
  - [x] ⚠️ The existing specs seed `mapsake.defaultView` via `bypassOnboarding` to skip onboarding; confirm the install nudge doesn't pop into those specs (it should be gated on finishing onboarding / a fresh first-run, not on every load). Add the nudge-dismissed seed to `bypassOnboarding` if needed.

## Dev Notes

### Current repo state (verified)
- **`next.config.ts`** is minimal: `const nextConfig: NextConfig = { cacheComponents: true }`. Serwist wraps this via `withSerwistInit(...)(nextConfig)` — preserve `cacheComponents`. [Source: next.config.ts]
- **`app/`** is the root App Router dir (NO `src/`, NO `[locale]` — the architecture tree is idealized; i18n is Epic 6). Files: `layout.tsx`, `page.tsx` (renders `MapMemoryShell`), `providers.tsx`, `globals.css`, `favicon.ico`, og/twitter images. New PWA files go directly under `app/` (`sw.ts`, `manifest.ts`, `icon.tsx`). [Source: app/]
- **`app/layout.tsx`** exports `metadata` (title/description/metadataBase) and sets `<html lang="zh-Hant">`. Extend `metadata` with `manifest` + add a `viewport`/`themeColor` export; don't rewrite it. [Source: app/layout.tsx:15-19, 48-65]
- **`public/`** has only `tiles/`. No PWA icons yet — Task 1 adds them. [Source: public/]
- **`package.json`**: `next: "latest"` (Next 16.2.9 running), scripts `dev: "next dev"`, `build: "next build"`. No serwist/pwa/workbox dep present. [Source: package.json]
- **Dev server is currently running** (`next dev`, Turbopack) on localhost:3000 for Simon to watch — the SW must stay disabled in dev so it doesn't interfere.

### Serwist + Next 16 setup (from June-2026 research)
- Package: `@serwist/next` (`withSerwistInit`) + `serwist` (dev). SW entry `app/sw.ts`, emitted to `public/sw.js`.
- **Webpack requirement:** Serwist's SW compilation runs through webpack; Next 16 default-builds with Turbopack. Documented pattern: `dev: "next dev --turbopack"` (or plain — SW disabled in dev anyway), `build: "next build --webpack"`. The `@serwist/turbopack` package exists to keep Turbopack but is newer / has rough edges (manual env loading). **This is the Q1 decision.**
- **Dev disable:** set `disable: process.env.NODE_ENV === "development"` in `withSerwistInit` so the SW never registers in dev (no hot-reload/Turbopack interference; PWA install is only testable via `next build && next start`).
- next.config wrap shape:
  ```ts
  import withSerwistInit from "@serwist/next";
  const withSerwist = withSerwistInit({ swSrc: "app/sw.ts", swDest: "public/sw.js", disable: process.env.NODE_ENV === "development" });
  export default withSerwist({ cacheComponents: true });
  ```
- [Source: https://serwist.pages.dev/docs/next/getting-started ; https://blog.logrocket.com/nextjs-16-pwa-offline-support/]

### ⚠️ Primary risk to verify first (Task 0)
`next build --webpack` + `cacheComponents: true` may conflict (cacheComponents/PPR is Turbopack-favored in Next 16). Run a throwaway `next build --webpack` on the current config BEFORE writing the SW. If it errors on `cacheComponents`, STOP and resolve via Q1 (pivot to `@serwist/turbopack`, or confirm with Simon whether to drop `cacheComponents`). Do not silently remove `cacheComponents`.

### Scope boundary (4.5 vs 4.6 vs 4.4)
- **4.4 (done):** onboarding ends at the filled map.
- **4.5 (this):** make the app installable (manifest + Serwist SW + app-shell precache) and show the dismissible install nudge after onboarding. App-shell caching ONLY.
- **4.6 (next):** offline read-only shell — cache the base-map tiles, and a calm write-disabled banner when offline. v1 writes stay online-only. Do NOT build offline write handling or tile caching in 4.5. [Source: architecture lines 59-60, 160, 205]

### iOS specifics (the reason this story exists)
iOS Safari has no `beforeinstallprompt` and only allows web-push from a home-screen-installed PWA (iOS 16.4+). So the nudge MUST offer the manual 分享 → 加入主畫面 path on iOS, plus an apple touch icon + `apple-mobile-web-app-capable` meta, or the iPhone retention loop (Epic 5) can never deliver. [Source: architecture line 44, 60]

### Tone (EXPERIENCE banned list)
"Prominent but not nagging": one calm, dismissible nudge, shown once, dismissal persisted. No repeated prompts, no modal gate, no "complete setup" framing. Keepsake voice. [Source: EXPERIENCE.md banned-on-purpose line 71]

### Testing standards
- e2e on Playwright (Chromium). `beforeinstallprompt` can be simulated by dispatching the event on `window`; the iOS instruction branch is UA-gated, so cover it with a unit test of the platform-detection helper. SW behavior is prod-only — assert config (disabled in dev) + that the prod build emits `public/sw.js`; treat full installability as a manual Lighthouse check noted in completion. Mind the anon rate-limit only if a test signs in (the nudge flow itself is session-free). [Source: prior-story testing notes; bypassOnboarding helper]

### Project Structure Notes
- New files: `app/manifest.ts`, `app/sw.ts`, `app/icon.tsx` (+ maybe `app/apple-icon.tsx`), an install-nudge component (suggest `features/pwa/` or alongside `features/onboarding/`), its localStorage helper. Modified: `next.config.ts`, `app/layout.tsx`, `package.json` (deps + build script), the shell to mount the nudge, possibly `e2e/onboarding-bypass.ts`. New dep: `@serwist/next` + `serwist`. No Supabase migration.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.5 (lines 34-38)]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 44, 59-60, 99, 160, 205, 237, 252, 290, 292]
- [Source: app/layout.tsx; app/page.tsx; next.config.ts; package.json; public/]
- [Source: https://serwist.pages.dev/docs/next/getting-started ; https://blog.logrocket.com/nextjs-16-pwa-offline-support/ ; https://www.npmjs.com/package/@serwist/turbopack]

### Resolved with Simon (2026-06-24)
1. **Build tooling:** RESOLVED — `@serwist/next` + `next build --webpack` (dev stays Turbopack, SW disabled in dev). Verify `cacheComponents` survives the webpack build before writing the SW; if it breaks, stop and report (don't drop cacheComponents).
2. **Install-nudge placement:** RESOLVED — FOLD the install affordance into the 4.4 hand-off card (one payoff moment), not a separate surface.
3. **Icons:** RESOLVED — Simon supplies brand PNGs at `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/maskable-512.png`, `public/apple-touch-icon.png`. Manifest references these; flag if not yet present at build time.

### Review Findings

- [x] [Review][Patch] Serwist `reloadOnOnline` defaults ON → hard `location.reload()` on reconnect clobbers in-progress state [next.config.ts] — FIXED: set `reloadOnOnline: false` in `withSerwistInit` so the app's offline banner recovers on the `online` event without a state-wiping reload. tsc + webpack build clean; onboarding e2e 12/12.
- [x] [Review][Defer] `skipWaiting` + `clientsClaim` with no update-prompt risks stale-shell / chunk-404 after deploy [app/sw.ts] — deferred; standard Serwist default, low risk at v1 deploy cadence. Add an update-prompt/refresh UX with the offline-shell work (Story 4.6).
- [x] [Review][Defer] SW + cache behavior has no automated coverage (e2e runs `pnpm dev`, where the SW is disabled) [playwright.config.ts] — deferred; SW is prod-only. Automated SW/cache e2e needs a production-build webServer; fold into CI/ops hardening (Story 6-5). Installability stays a manual Lighthouse check (also gated on icons).
- [x] [Review][Defer] `beforeinstallprompt` can fire before the hook's effect attaches → real-world capture lost [features/onboarding/lib/use-install-prompt.ts] — deferred; engagement-heuristic timing usually fires after mount, and the affordance can't appear at all until icons land. Hardening: capture the event in an inline head script and replay into the hook. Also fold the "platform reads run in render (fragile, not a bug today since the card isn't in the hydration tree)" note here.
- [x] [Review][Defer] `isIOSSafari()` misses iPadOS 13+ (desktop UA) and some in-app browsers [features/onboarding/lib/use-install-prompt.ts] — deferred; iPhone (the retention-loop target) is covered. Refine UA/platform detection in the 6-2/6-4 polish pass.
- [x] [Review][Known] Icon PNGs not yet in the repo → real Chromium install prompt won't fire (needs a ≥192px icon) and iOS shows a default icon [public/icons/] — KNOWN, spec-compliant deferral (Q3): Simon supplies `icon-192/512/maskable-512.png` + `apple-touch-icon.png`. Build/manifest/tests pass without them; full Lighthouse installability waits on the files.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- **Task 0 verified first:** `next build --webpack` succeeds with `cacheComponents: true` — no conflict, so the Q1 default path holds (no pivot to @serwist/turbopack). Added `@serwist/next@9.5.11` + `serwist@9.5.11` (dev).
- **Manifest + iOS (AC1):** `app/manifest.ts` (`MetadataRoute.Manifest`) — name/short_name/standalone, parchment `#F2E8D5` theme+background, zh-Hant, icons 192/512 + maskable-512. Next auto-links the manifest from the file convention (did NOT also set `metadata.manifest`, which would duplicate the tag). `app/layout.tsx`: added `appleWebApp` (capable + title), apple-touch-icon, and a `viewport.themeColor`.
- **Serwist SW (AC1, AC3):** `app/sw.ts` precaches the build manifest (app-shell) with `defaultCache` runtime caching; NO base-map tile / offline-write handling (that's 4.6). `next.config.ts` wrapped with `withSerwistInit({ swSrc, swDest: "public/sw.js", disable: NODE_ENV === "development" })`, preserving `cacheComponents`. Added an empty `turbopack: {}` so `next dev` (Turbopack) doesn't error on Serwist's injected webpack config. `build` script → `next build --webpack`. `app/sw.ts` excluded from the root tsconfig (WebWorker types clash with the DOM lib); Serwist's webpack step compiles it. `public/sw.js` gitignored (build artifact). Verified: prod build emits `public/sw.js`; dev stays SW-free.
- **Install affordance folded into the 4.4 hand-off (AC2, Q2):** `features/onboarding/lib/use-install-prompt.ts` captures `beforeinstallprompt` (and `appinstalled`), detects iOS Safari + standalone, and returns mode `prompt | ios | none`. Mounted in `MapMemoryShell` (always-on, so the event is caught even if it fires before the hand-off renders); passed to `Onboarding` which renders 安裝到主畫面 (prompt) / a 分享→加入主畫面 line (ios) / nothing (none) inside the existing hand-off card. No separate nudge surface, no extra dismissal flag — it rides the once-per-first-run hand-off.
- **DEVIATION (no unit runner):** repo is Playwright-only; platform modes covered by e2e (`prompt`, `none`) + inspection (`ios`). Adding vitest was out of scope.
- **✅ Icons supplied (2026-06-24):** the 4 brand icons are now in the repo — `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png` (book inset ~84% so the circular crop doesn't clip it), `public/apple-touch-icon.png`. Generated with `sips` from Simon's nano-banana source (an open keepsake book with a faint world map + terracotta memory-pins). All four serve 200; the manifest resolves them; installability checklist complete.
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build` (`--webpack`) clean + emits `public/sw.js` · onboarding e2e **12/12** (3 new 4.5 tests + 4.1–4.4 unchanged). Manual Lighthouse-installability check deferred until icons land.

### File List

- **NEW** `app/manifest.ts` — PWA web manifest (MetadataRoute)
- **NEW** `app/sw.ts` — Serwist service worker (app-shell precache + defaultCache)
- **NEW** `features/onboarding/lib/use-install-prompt.ts` — beforeinstallprompt capture + iOS/standalone detection
- **MOD** `next.config.ts` — `withSerwistInit` wrap (SW disabled in dev) + `turbopack: {}`, preserve `cacheComponents`
- **MOD** `app/layout.tsx` — appleWebApp + apple-touch-icon + `viewport.themeColor`
- **MOD** `features/onboarding/components/onboarding.tsx` — install affordance in the hand-off card; `installMode`/`onInstall` props
- **MOD** `features/memories/components/map-memory-shell.tsx` — mount `useInstallPrompt`; pass install props to Onboarding
- **MOD** `package.json` — `@serwist/next` + `serwist` deps; `build` → `next build --webpack`
- **MOD** `tsconfig.json` — exclude `app/sw.ts`
- **MOD** `.gitignore` — ignore generated `public/sw.js`(.map)
- **MOD** `e2e/onboarding.spec.ts` — 3 new 4.5 tests (install affordance prompt/none + manifest fields)

### Change Log

- 2026-06-24 — Story 4.5 implemented (PWA install nudge + installable shell). Serwist (`@serwist/next`) + `app/manifest.ts` make Mapsake installable with the app-shell precached; the install affordance is folded into the 4.4 hand-off card (platform-aware: Chromium prompt / iOS instruction / omitted). SW disabled in dev; prod build runs `next build --webpack` (cacheComponents verified intact) and emits `public/sw.js`. Icons pending Simon. No Supabase migration. Status → review.
- 2026-06-24 — Code review: 1 patch applied (`reloadOnOnline: false` — prevent a reconnect hard-reload from clobbering in-progress state), 5 deferred (SW update-prompt → 4.6; SW/cache e2e → 6-5; beforeinstallprompt race + render-time platform reads hardening; iPadOS detection → polish; icons = known Simon dependency). tsc/build/e2e green. Status → done.
