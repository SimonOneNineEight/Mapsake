---
baseline_commit: 7c705cf
---

# Story 6.3: Settings surface

Status: done

## Story

As a user,
I want a settings home,
so that I can manage my account and preferences in one place.

## Acceptance Criteria

1. **A Settings home exists as a full-screen sheet, reachable for everyone.** A `SettingsSheet` (vaul full-screen panel over the map, matching the memory/places sheet pattern) opens from a quiet 「設定」 entry in the account sheet (available to anon AND signed-in users). [epics 6.3; Simon's decisions 2026-06-25: full-screen sheet]
2. **Settings consolidates the preference surfaces** (Simon's decision: MOVE into Settings): 帳號 (account/auth), 通知 (notifications: enable + delivery time + global off), 預設視圖 (default view), 靜音的地方 (muted places), 匯出資料 (data export), 語言 (language). The notification controls (Stories 5-1/5-6) and export (2-6) MOVE out of the account sheet into Settings; the account sheet slims to the sign-in surface (anon) / email + a 設定 entry (signed-in). [epics 6.3; Simon: move into Settings]
3. **Each section works:** 帳號 → signed-in shows email + 登出, anon shows a 登入 entry (back to the sign-in surface). 通知 → the existing `EnableNotifications` + `NotificationSettings`, re-mounted. 預設視圖 → set 看整個世界, or 專注一個國家 (re-uses the map's country-pick), reflecting the current saved view. 靜音的地方 → a list of the user's muted pins, each with 恢復通知 (unmute); a calm empty state when none. 匯出資料 → the existing export trigger. 語言 → read-only 「繁體中文」 (English is deferred post-v1). [epics 6.3; 4-2 AC2 default-view-change; 5-6 mute]
4. **Dark mode is absent as a v1 toggle** (Lamplight is documented Phase 2 — no toggle, no dead control). [epics 6.3]

### Decisions baked in

- **Form = full-screen vaul sheet** (not a route), **consolidation = move** (per Simon 2026-06-25). The components were built decoupled for exactly this re-mount: `EnableNotifications`, `NotificationSettings` (features/notifications/components), and `useExport` (features/settings/hooks). Re-mount them in Settings; remove them from the account sheet.
- **Account-sheet slim:** signed-in body → 「已登入：{email}」 + a 設定 entry; `登出` MOVES to Settings' 帳號 section. The anon sign-in surface ("keep your map") is UNCHANGED + gains a quiet 設定 entry. So the account button stays the auth surface; Settings is one tap away and reachable by anyone.
- **Default view** is localStorage (`onboarding-prefs.read/writeDefaultView`, per-device — the documented "mirror to a profiles column" is still deferred). 看整個世界 → `writeDefaultView({kind:"world"})`. 專注一個國家 → close Settings + enter the map's existing country-pick mode (reuse the onboarding `pickCountry`/`onCountryPick` path in MapMemoryShell), which writes `{kind:"focus", countryCode, center}` on tap. The change takes effect on the next open (it's the opening camera, Story 4-2) — no need to reframe the live map.
- **Muted places** = `usePins()` filtered to `muted === true`; 恢復通知 calls `useUpdatePin({ id, muted: false })` (the 5-6 write). New list UI; reuses the existing query/mutation.
- **i18n:** all new copy via next-intl under a new `settings` namespace in `messages/zh-TW.json` (per 6-1). zh-TW drafts; verbatim-style, native polish is the catalog review.
- **Scope:** NO dark mode toggle; NO English/locale switch (read-only language row); NO `/settings` route; NO per-device→account sync of the default view (deferred). NO migration/secrets.

## Tasks / Subtasks

- [x] **Task 1 — SettingsSheet shell + sections scaffold (AC: 1, 2, 4)** [features/settings/components/settings-sheet.tsx (NEW)]
  - [x] A `"use client"` `SettingsSheet({ open, onOpenChange, ... })` — a vaul full-screen sheet (match places/memory sheet styling; a Drawer.Title 「設定」, a close ▾/✕ ≥44px, scroll region). Render the six sections as labelled blocks. No dark-mode toggle.
- [x] **Task 2 — 通知 + 匯出資料 (move) + 帳號 (AC: 2, 3)** [settings-sheet.tsx, features/auth/components/account-sheet.tsx (MOD)]
  - [x] In Settings 通知: render `<EnableNotifications />` + `<NotificationSettings />`. In 匯出資料: the export button (reuse `useExport`, moved from account-sheet). In 帳號: signed-in → `已登入：{email}` + 登出 (the `signOut` handler, moved); anon → a 登入 row that opens the account sheet's sign-in.
  - [x] Account-sheet slim: REMOVE `EnableNotifications`, `NotificationSettings`, the export button, and (signed-in) 登出 from the account sheet body; ADD a quiet 設定 entry (both anon + signed-in bodies) that opens Settings. Keep the anon sign-in flow intact. Wire Settings open/close state (in MapMemoryShell or the account sheet).
- [x] **Task 3 — 預設視圖 (AC: 3)** [settings-sheet.tsx, features/memories/components/map-memory-shell.tsx (MOD)]
  - [x] Show the current default view (世界 / 專注：{country}). 看整個世界 → `writeDefaultView({kind:"world"})`. 專注一個國家 → close Settings + trigger the shell's country-pick (reuse the `pickCountry` mode + `onCountryPick`, which already writes a focus view via `finishFocus`); a Settings-initiated pick must NOT re-enter onboarding/backfill (write the view + return to the map, no hand-off). Use next-intl for the country label if available, else the code.
- [x] **Task 4 — 靜音的地方 (AC: 3)** [features/settings/components/muted-places.tsx (NEW) or inline in settings-sheet]
  - [x] List `usePins()` where `muted`, showing each pin's name (+ region if helpful); each row a 恢復通知 action → `useUpdatePin({ id, muted:false })` (optimistic, ack-gated, calm retry — reuse the pin mutation). Calm empty state (「沒有靜音的地方」) when none. ≥44px rows.
- [x] **Task 5 — i18n + tests + validation (AC: all)** [messages/zh-TW.json (MOD), e2e]
  - [x] Add the `settings` namespace (section titles + new copy) to `messages/zh-TW.json`; all new strings via `useTranslations("settings")`.
  - [x] e2e (anon-coverable parts): open Settings from the account button; the 預設視圖 / 靜音的地方 / 語言 sections render; drop+mute a pin then see it under 靜音的地方 and 恢復通知 removes it; setting 看整個世界 persists (localStorage). The signed-in 帳號 + the moved notification/export controls are signed-in-only (anon-harness gap — manual). tsc/lint/build clean (`/` still static); full e2e green; the existing memory/places/account flows still pass (the account-sheet slim must not break the anon sign-in or the 2-3 prompt).

## Dev Notes

### Reuse (decoupled for this exact moment)
- `EnableNotifications` + `NotificationSettings` (features/notifications/components) and `useExport` (features/settings/hooks/use-export) were built decoupled "so Settings 6-3 re-mounts" — move them here. [Stories 5-1, 5-6, 2-6]
- Default view: `readDefaultView`/`writeDefaultView` + the `DefaultView` type (features/onboarding/lib/onboarding-prefs). The shell's `finishFocus(countryCode, center)` already writes a focus view; the onboarding `pick` mode (`MapCanvas pickCountry` + `onCountryPick`) is the country-tap path to reuse — but gate the Settings-initiated pick so it does NOT run backfill/hand-off (those are first-run only). [onboarding-prefs.ts; map-memory-shell.tsx finishFocus + onboarding states]
- Mute: `pins.muted` is the column; `useUpdatePin({muted})` writes it (Story 5-6); `usePins()` lists them; the engine already excludes muted (5-2). A muted pin still renders on the map. [pins-queries.ts; eligibility.ts]
- Sheet pattern: copy the vaul full-screen sheet structure from `places-panel.tsx` / `memory-container.tsx` (Drawer.Root/Portal/Content, Drawer.Title, scroll region, `aria-describedby={undefined}`, ≥44px close). a11y floor from 6-2 applies (the global focus ring + the reduced-motion vaul guard cover it).

### Account-sheet interaction (don't break)
- The account sheet is the auth surface (anon sign-in "keep your map"; the 2-3 post-payoff autoOpen prompt; the `?auth_error` notice). Slimming MUST preserve all of that — only MOVE the notification/export/signOut bits and ADD the 設定 entry. The 2-3 autoOpen prompt + the anon sign-in e2e must stay green.

### Scope guardrails
- NO dark-mode toggle (Phase 2). NO locale switch (read-only 繁體中文; en deferred). NO `/settings` route (full-screen sheet). NO live-map reframe on default-view change (takes effect next open). NO account-sync of the default view. Surgical move, not a rewrite of the moved components.

### Project Structure Notes
- NEW: `features/settings/components/settings-sheet.tsx` (+ maybe `muted-places.tsx`). MOD: `features/auth/components/account-sheet.tsx` (slim + 設定 entry), `features/memories/components/map-memory-shell.tsx` (Settings state + default-view pick wiring), `messages/zh-TW.json` (settings namespace). No migration, no secrets, no new dep.

### References
- [Source: epics.md#Story-6.3 (lines 423-427); Simon's decisions 2026-06-25 (full-screen sheet; move into Settings)]
- [Source: features/notifications/components/{enable-notifications,notification-settings}.tsx, features/settings/hooks/use-export.ts, features/onboarding/lib/onboarding-prefs.ts, features/pins/queries/pins-queries.ts (usePins/useUpdatePin), features/auth/components/account-sheet.tsx, features/memories/components/map-memory-shell.tsx, features/places/components/places-panel.tsx (sheet pattern), messages/zh-TW.json]
- [Source: 4-2 AC2 (change default view in Settings — deferred here), Story 5-6 (mute), 6-2 (a11y floor applies)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- Lint: `setState`-in-effect on the default-view re-read → wrapped in a named `sync()` call (the established dodge). e2e strict-mode: the muted pin name matched twice (the deep-link memory was still open behind Settings) → reload before opening Settings; and "靜音的地方"/"預設視圖" matched the empty-state substring → `{ exact: true }`. tsc/lint/build clean (`/` still `○` static); full e2e 106 passed (2 new Settings tests), 1 pre-existing skip, no regression (the account-sheet slim left the auth/2-3-prompt flows green).

### Completion Notes List

- **SettingsSheet** (full-screen vaul sheet, per Simon) consolidates: 帳號 (signed-in email + 登出; anon hint), 通知 (`EnableNotifications` + `NotificationSettings`, MOVED), 預設視圖 (看整個世界 / 改選一個國家), 靜音的地方 (muted pins + 恢復通知), 匯出資料 (MOVED), 語言 (read-only 繁體中文). No dark-mode toggle.
- **Account sheet slimmed:** removed the notification controls + export + 登出 from the signed-in body (MOVED to Settings); signed-in body is now email + a 設定 entry; the anon sign-in surface is unchanged + gained a quiet 設定 entry. The 設定 entry closes the account sheet then opens Settings (no stacking) — no AccountSheet open-state refactor needed.
- **Default view:** 看整個世界 → `writeDefaultView({world})`; 改選一個國家 → close Settings + the shell enters a Settings-only focus-pick (`pickingFocus`, reusing MapCanvas `pickCountry`/`onCountryPick`) that writes a focus view WITHOUT re-running onboarding backfill/hand-off, with a calm non-blocking hint + cancel. Takes effect on the next open (Story 4-2).
- **Muted places** = `usePins()` filtered to `muted`; 恢復通知 → `useUpdatePin({muted:false})` (the 5-6 write, optimistic); the pin stays on the map.
- **i18n:** new `settings` namespace (23 keys) + `account.settings` in `messages/zh-TW.json`; all new copy via `useTranslations` (6-1).
- Account/auth note: 登出 lives in Settings' 帳號 (signed-in); anon sign-in stays in the account sheet (the Settings entry point), so auth isn't duplicated across two surfaces. No migration, no secrets, no new dep.

### File List

- `features/settings/components/settings-sheet.tsx` (NEW)
- `features/auth/components/account-sheet.tsx` (MOD — slim signed-in body, 設定 entry + onOpenSettings, removed export/notif/signOut)
- `features/memories/components/map-memory-shell.tsx` (MOD — Settings state, focus-pick wiring + hint, render SettingsSheet)
- `messages/zh-TW.json` (MOD — settings namespace + account.settings)
- `e2e/settings.spec.ts` (NEW)

### Change Log

- 2026-06-25 — Story created (context engine; Simon resolved the two design forks: full-screen sheet + move-into-Settings). Scope: a SettingsSheet consolidating 帳號/通知/預設視圖/靜音的地方/匯出資料/語言, slimming the account sheet, a new muted-places manager + default-view control, all i18n'd. No dark mode, no locale switch, no route, no migration.
- 2026-06-25 — Dev-story complete. SettingsSheet (full-screen) + account-sheet slim + default-view focus-pick + muted-places manager + settings i18n namespace; 2 new e2e. tsc/lint/build clean; full e2e 106 passed. Status → review.
- 2026-06-25 — Adversarial review (3 dimensions × verify): 1 false positive refuted (focus-pick is write-only, no live reframe), 2 confirmed fixed. Re-validated tsc/lint/build/e2e green. Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Changes Requested → both addressed · 3 dimensions (account-sheet slim regression, Settings/focus-pick wiring, i18n key existence + a11y). Confirmed clean: the anon sign-in + 2-3 prompt + auth-error flows survive the slim; the focus-pick correctly writes the view without backfill and is write-only (no live reframe); all `settings`/`account.settings` keys resolve; the new sheet inherits the 6-2 focus ring + reduced-motion guard.

### Action Items
- [x] **[Med] 通知 section wasn't gated on `signedIn`.** In the old account sheet the notification controls lived in the signed-in body; in Settings I rendered them unconditionally, so anon users saw + could persist notification prefs (the anon profile has a row) — contradicting the "signed-in only" intent (a push subscription must attach to a durable account, Story 5-1). **Fixed:** wrapped the 通知 Section in `{signedIn && (...)}`.
- [x] **[Low] Orphaned `account.*` keys** (`exporting`/`exportData`/`exportError`/`signOut`) — moved to the `settings` namespace, left unused in `account`. **Fixed:** removed them (verified the account sheet no longer references them).
- [refuted] Focus-pick "live easeTo vs no-reframe" — verified it only `writeDefaultView`s; no live camera move.
