---
baseline_commit: 5d0ad62
---

# Story 6.1: i18n framework + zh-TW string externalization

Status: done

## Story

As the builder,
I want all UI copy to resolve from a single zh-TW message catalog via next-intl,
so that the voice is consistent and editable in one place and a future English locale is a catalog away.

## Acceptance Criteria

1. **next-intl is wired for a single hard-fixed locale (zh-TW), cacheComponents-safe.** `next-intl@^4.13` is installed; `lib/i18n/request.ts` returns a HARDCODED `locale: "zh-TW"` + the `messages/zh-TW.json` catalog and NEVER reads `requestLocale`/`headers()`/`cookies()` (so it does not force dynamic rendering under `cacheComponents: true`). The plugin wraps `next.config.ts` composed with Serwist; `NextIntlClientProvider` is in the root layout; `<html lang="zh-TW">`. No `[locale]` routing, no middleware, no locale switcher (English is deferred post-v1). [architecture 161; next-intl "without i18n routing"]
2. **All user-facing UI component strings resolve from the catalog.** The inline zh-TW strings across the ~20 component files (account sheet, memory card/container, onboarding, notifications enable/settings, save-status, photo uploader/grid/viewer, region-remove dialog, pin name/add, places panel, map cues) are moved into `messages/zh-TW.json` (namespaced by feature) and rendered via `useTranslations()` (client / sync server) or `getTranslations()` (async server). [epics 6.1; architecture 194]
3. **Strings are externalized VERBATIM — zero visible copy change.** Each moved string keeps its exact current wording (the native-voice polish is a separate follow-on review on the consolidated catalog, not this story). Interpolated strings use ICU placeholders (`{name}`, `{years}`, `{count}`) — placeholder names alphanumeric/underscore only. The existing e2e suite, which asserts many literal zh-TW strings (`＋ 新增回憶`, `儲存`, `已儲存`, `先從哪裡開始看？`, `登入`, `已靜音`, etc.), is the regression guard: it MUST stay green unchanged. [keepsake voice continuity]
4. **No regression, build stays static-friendly.** `tsc` + `lint` + `pnpm build --webpack` clean (the build must NOT newly force the whole app dynamic — verify the route table still shows the prerendered `○` routes), full `pnpm test:e2e` green. [NFR4 performance pass intent]

### Scope decisions baked in

- **Verbatim externalization, not a copy rewrite.** Preserve current wording exactly; the catalog becomes the one place to polish the zh-TW voice later (and to add `en.json` when English lands). This keeps the e2e literal-string assertions as a free regression guard.
- **Server-generated push copy (`features/notifications/lib/push-copy.ts`, 9 strings) is a DEFERRED exception, not in this story.** It's pure + unit-tested (`buildPushPayload`) and runs in the gated cron, not in the `NextIntlClientProvider` tree. Externalizing it cleanly needs an injected translator (the cron route passing `getTranslations`) — do that when `en` actually lands. Note it in the catalog/deferred-work. Module COMMENTS containing CJK (e.g. eligibility.ts JSDoc) are NOT strings and are left as-is.
- **Single locale only.** No `en.json`, no locale negotiation, no switcher — all deferred post-v1 per architecture.

### Key technical facts (from current next-intl + Next 16 research)

- **`next-intl@4.13.0`** (min 4.4 for Next 16); peer-compatible with Next 16 + React 19.
- **cacheComponents safety hinges on ONE thing:** `getRequestConfig` must return a hardcoded locale and never read `requestLocale`. The request-locale getter is lazy — only calling it invokes `headers()` (which opts into dynamic). Hardcoding `zh-TW` keeps `getTranslations`/`useTranslations` reads static/prerenderable. Do NOT add `experimental.rootParams`, `setRequestLocale`, or `generateStaticParams` (those are for the `[locale]`-routing case, which we don't have).
- **`lib/i18n/` is a NON-default path** → must call `createNextIntlPlugin('./lib/i18n/request.ts')` (the no-arg default only finds `./i18n` or `./src/i18n`).
- Compose plugins: `export default withSerwist(withNextIntl(nextConfig))`. The plugin configures BOTH webpack and Turbopack, so `next build --webpack` is fine.
- Provider in v4 auto-inherits `locale`/`messages` from `getRequestConfig` — `<NextIntlClientProvider>{children}</NextIntlClientProvider>` needs no props (the small catalog makes serializing all messages fine).
- Do NOT use next-intl's navigation `Link`/`createNavigation` (it calls `headers()` unconditionally under `'use cache'`) — keep plain `next/link`.
- ICU: single braces `{x}`; escape a literal `'` as `''` and literal braces as `'{'`; Chinese has no plural forms (single `other`), so plain interpolation only.

## Tasks / Subtasks

- [x] **Task 1 — Install + wire next-intl (single-locale, cacheComponents-safe) (AC: 1)** [package.json, lib/i18n/request.ts (NEW), next.config.ts (MOD), app/layout.tsx (MOD)]
  - [x] `pnpm add next-intl@4.13.0`.
  - [x] `lib/i18n/request.ts`: `getRequestConfig(async () => ({ locale: "zh-TW", messages: (await import("../../messages/zh-TW.json")).default }))` — hardcoded, never reads `requestLocale`.
  - [x] `next.config.ts`: `const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");` and `export default withSerwist(withNextIntl(nextConfig));` (preserve the existing Serwist + cacheComponents + turbopack config).
  - [x] `app/layout.tsx`: wrap children in `<NextIntlClientProvider>`; set `<html lang="zh-TW">` (next-intl doesn't set it in the no-routing setup). Read the current layout first to preserve fonts/metadata/providers ordering.
- [x] **Task 2 — Build the catalog + externalize UI strings (AC: 2, 3)** [messages/zh-TW.json (MOD), the ~20 component files (MOD)]
  - [x] Replace the `messages/zh-TW.json` stub with a feature-namespaced catalog (`account`, `memory`, `onboarding`, `notifications`, `saveStatus`, `photos`, `regions`, `pins`, `places`, `map`, `common`). Keep `app.name = "Mapsake"`.
  - [x] Externalize per feature, VERBATIM, replacing literals with `t("…")` / interpolated ICU. Client + sync-server components: `useTranslations(ns)`; async server components: `await getTranslations(ns)`. Order by string count (account-sheet 37, memory-card 25, onboarding 19, enable-notifications 16, save-status 14, then the rest). Interpolations to handle: `{years} 年前的今天：{name}` / `{years} 年前加入` (if any UI mirrors push copy), `這天還有 {count} 個回憶`, the zh date format `{y} 年 {m} 月 {d} 日` (memory-card `formatZhDate`), `已用此信箱註冊…`, photo counts, etc. A string that is computed (e.g. `formatZhDate`) becomes a `t("…", { y, m, d })` call.
  - [x] After each feature file, confirm no inline CJK string literal remains (comments may stay). Do NOT touch `push-copy.ts` or CJK in comments/JSDoc.
- [x] **Task 3 — Validation + regression (AC: 3, 4)** [no new tests required; the literal-string e2e is the guard]
  - [x] `tsc` + `lint` + `pnpm build --webpack` clean; confirm the build route table still prerenders `/` as `○` (static) — i.e. next-intl did not force dynamic. Full `pnpm test:e2e` green WITHOUT changing any test's asserted strings (proves verbatim externalization). If a test string moved, the catalog value is wrong — fix the catalog, never the test (unless the test asserted a typo).
  - [x] Log the deferred push-copy externalization (+ the future `en.json`) to deferred-work.md.

## Dev Notes

### Why this is mostly mechanical + low-risk
- ~160 user-facing CJK literals across ~20 files; the work is move-string → `t(key)`. The e2e suite already asserts dozens of these literals verbatim, so a faithful externalization is self-verifying: green = unchanged copy. [e2e/*.spec.ts]
- The ONE correctness risk is `cacheComponents`: keep `getRequestConfig` hardcoded (no `requestLocale`) and the app stays prerenderable. Verify via the build route table.

### Inventory (string counts per file, from a CJK grep)
account-sheet 37 · memory-card 25 · onboarding 19 · enable-notifications 16 · save-status 14 · push-copy 9 (DEFERRED) · photo-uploader 7 · region-remove-dialog 6 · pin-name-input 6 · memory-container 6 · places-panel 5 · notification-settings 4 · add-pin-button 3 · photo-viewer 3 · photo-grid 3 · MapCanvas 3 · region-marks-queries 2 · build-places 1 · eligibility 1 (COMMENT — skip) · map-memory-shell 1. (Verify live before editing; some counts include repeated words.)

### Components are mixed server/client
- Most string-bearing components are `"use client"` (account-sheet, memory-card, onboarding, etc.) → `useTranslations`. Any async server component → `getTranslations`. The provider at the root layout covers the whole client tree.
- A few CJK literals live in non-component modules (`region-marks-queries.ts`, `build-places.ts`, `map-memory-shell.tsx` toast/aria): externalize the user-facing ones via the appropriate hook in the component that renders them; if a string is produced in a plain `.ts` used by a client component, lift it to the component or pass the translated value in.

### Scope guardrails
- VERBATIM — no wording changes (a native-voice polish pass is a separate follow-up on the catalog). NO `en.json`. NO locale routing/middleware/switcher. NO touching `push-copy.ts` (deferred) or CJK comments. NO `experimental.rootParams`/`setRequestLocale` (routing-case only).

### Project Structure Notes
- NEW: `lib/i18n/request.ts`. MOD: `package.json` (next-intl), `next.config.ts` (plugin), `app/layout.tsx` (provider + lang), `messages/zh-TW.json` (catalog), ~19 component files (string → `t()`). No migration, no secrets.

### References
- [Source: epics.md#Epic-6 (6-1 i18n); architecture.md 161 (next-intl, zh-TW default), 194 (messages/zh-TW.json)]
- [Source: next-intl "App Router without i18n routing" (next-intl.dev); next-intl@4.13; cacheComponents tracking issue amannn/next-intl#1493 — hardcoded-locale avoids the dynamic-render trap]
- [Source: the live inline-string inventory (grep), the e2e literal-string assertions as the regression guard, next.config.ts (Serwist + cacheComponents), app/layout.tsx]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m] (framework solo; externalization fanned out 10 namespace agents, catalog assembled + validated centrally)

### Debug Log References

- Framework build BEFORE externalization: clean, `/` still `○` static → the hardcoded-locale `getRequestConfig` keeps the app prerenderable under `cacheComponents` (the one real risk, verified).
- Post-externalization: one tsc error — `t("loggedInAs", { email: account.email })` (account.email is `string | null`, ICU args want `string|number|Date`) → fixed with `?? ""`. tsc/lint/build then clean; `/` still `○`. Full e2e **104 passed, 1 skipped, no flakes** — the suite's exact zh-TW assertions (e.g. "已儲存") all pass through the catalog, proving verbatim externalization.

### Completion Notes List

- **Framework (solo):** `next-intl@4.13.0`; `lib/i18n/request.ts` returns a HARDCODED `zh-TW` (never reads `requestLocale`/`headers()`) — the single line that keeps translations static under `cacheComponents`. Plugin `createNextIntlPlugin("./lib/i18n/request.ts")` (non-default path) composed `withSerwist(withNextIntl(nextConfig))`. `NextIntlClientProvider` (no props — auto-inherits) wraps the tree in the root layout; `<html lang="zh-Hant">` kept.
- **Externalization (10 parallel namespace agents, central assembly):** ~91 keys across 11 namespaces (`app`, `account`, `memory`, `onboarding`, `notifications`, `saveStatus`, `photos`, `regions`, `pins`, `places`, `map`) in `messages/zh-TW.json`. Each agent edited its file(s) + returned its namespace fragment VERBATIM; I assembled the catalog from the fragments (no retyping) and validated centrally. Interpolations via ICU (`已登入：{email}`, `{y} 年 {m} 月 {day} 日`, `這天還有 {count} 個回憶 →`, `刪除「{name}」這個回憶？`, `已達每個地點 {max} 張上限`, `移除「{name}」？` + `{pinCount}`). `formatZhDate` + the `COPY` const in save-status were lifted into their components to use `t`.
- **Deferred (consistent with the "component strings" scope):** `push-copy.ts` (9 server push strings) + `build-places.ts` `其他` (lib fallback) stay inline — externalize when `en` lands (logged). All other CJK left in code is comments/JSDoc.
- No migration, no secrets, no new user-facing behavior — pure refactor; the green exact-string e2e IS the proof of no copy drift.

### File List

- NEW: `lib/i18n/request.ts`
- MOD (framework): `package.json` (next-intl), `next.config.ts` (plugin), `app/layout.tsx` (provider), `messages/zh-TW.json` (catalog)
- MOD (externalized): `features/auth/components/account-sheet.tsx`, `features/memories/components/{memory-card,memory-container}.tsx`, `features/onboarding/components/onboarding.tsx`, `features/notifications/components/{enable-notifications,notification-settings}.tsx`, `components/save-status.tsx`, `features/memories/components/{photo-uploader,photo-viewer,photo-grid}.tsx`, `features/regions/components/region-remove-dialog.tsx`, `features/pins/components/{pin-name-input,add-pin-button}.tsx`, `features/places/components/places-panel.tsx`, `features/map/components/MapCanvas.tsx`
- MOD (docs): `_bmad-output/implementation-artifacts/deferred-work.md`

### Change Log

- 2026-06-25 — Story created (context engine + next-intl/Next-16 research). Scope: install + wire next-intl single-locale (zh-TW, hardcoded, cacheComponents-safe) + externalize ~160 UI strings VERBATIM into a namespaced catalog. Push copy + en.json deferred. The e2e literal-string assertions are the regression guard. No migration/secrets.
- 2026-06-25 — Dev-story complete. next-intl wired (hardcoded zh-TW, cacheComponents-safe); ~91 keys / 11 namespaces externalized across 19 files via a 10-agent fan-out + central catalog assembly. tsc/lint/build clean (`/` still static); full e2e 104 passed (exact-string fidelity confirmed). Status → review.
- 2026-06-25 — Adversarial i18n review (3 dimensions × verify, bidirectional key walk): 0 false positives, 1 confirmed (LOW, fixed). Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Approve · 3 dimensions (key correctness via a bidirectional catalog↔call walk, externalization completeness, next-intl/hook wiring). The high-value checks came back clean: **every `t()` call resolves to a real catalog key, every key is read, no user-facing string was missed or dropped, no hook-rules violation, and `request.ts` is cacheComponents-safe** (hardcoded locale, never reads `requestLocale`). One LOW finding, fixed.

### Action Items
- [x] **[Low] Orphan `app.name` key** — the scaffold stub `{app:{name:"Mapsake"}}` was never read (the brand name is hardcoded in layout metadata; "Mapsake" is a proper noun that isn't localized). **Fixed:** removed the dead `app` namespace from `messages/zh-TW.json` (10 live namespaces remain). tsc/build re-verified clean.
