---
baseline_commit: 7d7135c
---

# Story 4.1: Default-view question

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want to choose how I see my map first,
so that onboarding fits how I think about my travels.

## Acceptance Criteria

1. **First run → the default-view question.** On first run (no stored default view), a calm onboarding step asks **"whole world"** vs **"focus on a country"** (zh-TW copy). It's the first thing a new user sees, over the map; quiet keepsake tone, no nag. Returning users (a default view is already stored) do NOT see it. [epics 4.1 AC1; EXPERIENCE Onboarding line 32 + UJ-1 line 165]
2. **Pick "whole world" → start on the world map.** Choosing world dismisses the question and leaves the user on the world view (the map's default world framing). The choice is recorded so the question isn't re-asked. [epics 4.1 AC2]
3. **Pick "focus on a country" → choose a country (tap) → drop into its regions.** Choosing focus puts the map into a calm "tap a country" mode (a quiet hint, no marking); tapping a country flies the map into that country at a zoom where its admin-1 regions show, and records the choice (`{ kind: "focus", countryCode }`). A tap in focus-pick mode does NOT mark the region. [epics 4.1 AC2; decision 2026-06-24: tap-a-country-on-the-world-map]
4. **No regression.** Once the question is answered (or for a returning user), the normal map works exactly as before — tap-to-mark (1.5), drop/open pins, unmark, photos. The onboarding overlay is gone and doesn't intercept taps. [Epic 1-3 behavior]

## Tasks / Subtasks

- [x] **Task 0 — Confirmed decisions (2026-06-24)**
  - [x] **Storage = localStorage** (no DB, no migration): key `mapsake.defaultView` holding `{ kind: "world" } | { kind: "focus"; countryCode: string }`. Its PRESENCE means the question was answered (gates the question). Cross-device sync + a profiles mirror is deferred to Epic 2 / Story 4.2. **Trigger for the question** = `readDefaultView() === null`.
  - [x] **Focus selection = tap a country on the world map** (reuse the map + `regionFromPoint`), NOT a searchable list. The list/search is out of scope (overlaps deferred 3-2).
- [x] **Task 1 — `features/onboarding/lib/onboarding-prefs.ts` (NEW) (AC: 1, 2, 3)**
  - [x] `export type DefaultView = { kind: "world" } | { kind: "focus"; countryCode: string };`
  - [x] `readDefaultView(): DefaultView | null` and `writeDefaultView(v: DefaultView): void` — `localStorage` get/set under `mapsake.defaultView`, wrapped in try/catch (Safari private mode / SSR-guard with `typeof window`). JSON parse/stringify; return null on absent/malformed.
- [x] **Task 2 — `features/onboarding/components/onboarding.tsx` (NEW) (AC: 1, 2, 3)**
  - [x] An overlay that renders only while onboarding is active. **Step "question":** calm full-bleed card over the map — title + two quiet choices: 「看整個世界」(world) and 「先看一個國家」(focus). World → `writeDefaultView({kind:"world"})` + `onDone()`. Focus → advance to **step "pick"**.
  - [x] **Step "pick":** dim/step the overlay aside to a small non-blocking hint (e.g. top banner 「輕觸一個國家」) and signal the shell to enter country-pick mode. When the shell reports a picked country, `writeDefaultView({kind:"focus", countryCode})` + `onDone()`.
  - [x] Props: `onPickModeChange(active: boolean)` (tell the shell to toggle the map's pick mode) and `onDone()` (close onboarding). Tokens via theme (calm card on `--card`, link-quiet choices); no alarming colors, no progress meter (banned per EXPERIENCE line 114).
- [x] **Task 3 — MapCanvas country-pick mode (AC: 3, 4)** [features/map/components/MapCanvas.tsx]
  - [x] Add optional props `pickCountry?: boolean` and `onCountryPick?: (info: { countryCode: string; lngLat: { lng: number; lat: number } }) => void`. Mirror `pickCountry` into the existing `onTapRef` ref so the once-attached `click` listener reads the latest (same ref-mirror pattern as `dropMode`/`onContextRef`).
  - [x] In `onTapRef`: if `pickCountry` is on, resolve the country under the tap (`regionFromPoint` returns `level:"country"` at the world zoom; use its `countryCode`), `easeTo` center = tapped `lngLat`, zoom ~4 (admin-1 regions render at z≥3), call `onCountryPick({...})`, and RETURN before the mark path. Do NOT mark in pick mode. (fitBounds-to-country is a nicer fly-to — defer; fixed zoom is fine for v1.)
  - [x] Guard: a tap on a pin/cluster is irrelevant during onboarding (a fresh user has none), but keep the existing guards intact.
- [x] **Task 4 — Wire onboarding into the shell (AC: 1, 2, 3, 4)** [features/memories/components/map-memory-shell.tsx]
  - [x] On mount (client effect, SSR-safe), if `readDefaultView() === null` set `showOnboarding = true`. Render `<Onboarding>` above the map (it's a sibling of MapCanvas in the map cell, high z).
  - [x] Hold `pickCountry` state; pass to `MapCanvas`; `onCountryPick` → store the choice (the Onboarding component does the write) and close. Wire `Onboarding`'s `onPickModeChange` → `setPickCountry`, `onDone` → `setShowOnboarding(false)` + `setPickCountry(false)`.
  - [x] Initialize `showOnboarding=false` and flip it in the effect (avoids an SSR/hydration flash; the overlay appears just after mount on first run).
- [x] **Task 5 — Tests (AC: 1, 2, 3, 4)** [e2e/onboarding.spec.ts (NEW)]
  - [x] e2e (world): fresh context (clean localStorage) → load → the question is visible → click 「看整個世界」 → question gone; `localStorage["mapsake.defaultView"]` is `{"kind":"world"}`; the map is at the world zoom (~1.5) and a plain land tap now MARKS (no regression).
  - [x] e2e (focus): fresh context → question → click 「先看一個國家」 → the "tap a country" hint shows → fire a tap on a country (harness `click` at a country point) → the map zoom increases (flew in) and `mapsake.defaultView` is `{"kind":"focus","countryCode":"…"}`; the question is gone.
  - [x] e2e (returning): pre-seed `localStorage["mapsake.defaultView"]` (via `addInitScript`) → load → the question does NOT appear; the map is interactive immediately.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Mind the known anon-rate-limit + post-reload flakes (deferred-work.md). Onboarding is localStorage-only (independent of the anon session), so these tests don't need a pin/mark write unless asserting the no-regression mark.

### Review Findings (code review 2026-06-24)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied — all 4 ACs met, both decisions honored, 4.1/4.2/4.3/4.4 scope boundary respected (nothing built early), local-first + no-nag + calm tokens, no migration/dep. 0 decision-needed · 2 patch · 3 defer · dismissed (rest).

**Patch (both applied 2026-06-24):**
- [x] [Review][Patch] **Focus-pick dead-end on an ocean / no-country tap** — **Fixed:** the pick step now shows a `pointer-events-auto` "← 返回" escape that returns to the question (the surrounding hint stays `pointer-events-none` so the country tap still passes through). `onBack` → shell sets onboarding back to "question"; nothing is stored. New e2e asserts the escape. [features/onboarding/components/onboarding.tsx, features/memories/components/map-memory-shell.tsx]
- [x] [Review][Patch] **Question modal lacks dialog a11y** — **Fixed:** the question card now has `role="dialog"` + `aria-modal="true"` + `aria-labelledby="onboarding-title"` (on the `<h2>`), and the first choice is `autoFocus`. Full focus-trap + Escape stays deferred to the Epic 6 a11y floor (6-2). [features/onboarding/components/onboarding.tsx]

**Deferred (also in deferred-work.md):**
- [x] [Review][Defer] **localStorage-disabled re-ask loop** — in Safari private mode / disabled storage, `writeDefaultView` no-ops, so the question re-shows every load (the session itself works; the choice just never persists). Acceptable v1; note as a known limitation / revisit when accounts (Epic 2) give a server-side fallback. [features/onboarding/lib/onboarding-prefs.ts]
- [x] [Review][Defer] **AddPinButton tappable during pick mode** — `pickCountry` is checked first so a tap still picks a country (no broken state), but the "＋ 新增回憶" button can visually toggle to its cancel label mid-onboarding. Cosmetic; hide/disable onboarding-active affordances when the broader flow (4.3/4.4) lands. [features/map/components/MapCanvas.tsx]
- [x] [Review][Defer] **No real-tap e2e for the pick-hint pointer-events pass-through** — the focus test fires a synthetic `map.fire("click")`, so the `pointer-events-none` hint pass-through is asserted by construction, not a real pointer event. Add a real-tap/device check with the gesture e2e work. [e2e/onboarding.spec.ts]

Dismissed (verified non-issues): a returning `focus` user lands on the world map (the intended 4.1/4.2 split — landing-on-saved-view is 4.2, verified nothing reads it on load yet); no SSR/hydration mismatch (server + first client render both produce no overlay); no regression (pick branch returns before mark/drop; props optional); `countryCode` is always a valid alpha-2 at z1.5 (regions tiles are minzoom 3, so only countries render); the world test's `toHaveCount(0)` carries the dismissal assertion (zoom<3 is non-load-bearing but harmless); `bypassOnboarding` `addInitScript` reliably runs before page scripts across reloads.

## Dev Notes

### Scope boundary (4.1 vs 4.2/4.3/4.4)
- **4.1 (this):** first-run detection + the default-view QUESTION + applying the initial view (world stays; focus flies to the tapped country) + recording the choice in localStorage.
- **4.2:** on every subsequent open, LAND on the saved view (`readDefaultView` → world stays / focus flies on load); a Settings control to change it. (4.1 only writes the value; 4.2 reads it on load + adds Settings.)
- **4.3 (backfill rhythm) / 4.4 (hand-off line):** the LATER onboarding steps. 4.1 gates only the question on `defaultView` presence; the full question→backfill→hand-off sequence is assembled in 4.3/4.4 (they'll add their own step gating). Do NOT build backfill mode or the hand-off line here.

### Current state of files being modified
- **`features/memories/components/map-memory-shell.tsx`** — `"use client"`, owns `selectedPinId`, renders `<MapCanvas onOpenPin selectedPinId />` + `<MemoryContainer>`. The map cell is `relative min-w-0 flex-1` — render the onboarding overlay inside it (absolute, high z). Add `showOnboarding` + `pickCountry` state here. [Source: features/memories/components/map-memory-shell.tsx]
- **`features/map/components/MapCanvas.tsx`** — builds the map at `center:[0,20], zoom:1.5` (the world view). The once-attached `click` listener calls `onTapRef.current(point, lngLat)`; `onTapRef` is reassigned every render in a dep-less effect (reads latest `dropMode`/`marks`/`pins`). The tap path: drop-mode → place pin; else mark the region (`addMark.mutate(regionFromPoint(...))`), with guards (no session, offline, tap-on-pin). Add `pickCountry` as a new branch in `onTapRef` BEFORE the mark path. `regionFromPoint` (from `../lib/visited`) returns `{ regionCode, countryCode, level }`; at z1.5 it resolves a `country`. Use `map.easeTo` to fly. [Source: features/map/components/MapCanvas.tsx, features/map/lib/visited.ts]
- **`features/onboarding/`** — currently just `.gitkeep`. New `lib/` + `components/` here. [Source: features/onboarding/.gitkeep]

### Why localStorage (confirmed)
Accounts are Epic 2; there is no cross-device sync yet regardless of store. localStorage is per-device, needs no migration, and "land on it next open" (4.2) works locally. When accounts land, mirror `defaultView` to a `profiles` column for cross-device. [memory: epic-sequencing — Epic 2 timing]

### Calm-onboarding constraints
No progress meter, no streak, no nag (EXPERIENCE banned list line 114). The question is a quiet choice; "focus" then a soft "tap a country" hint. Local-first — onboarding never asks for an account (that prompt is the post-payoff hand-off, 4.4 / Epic 2). [EXPERIENCE Account placement line 22; Onboarding line 32]

### Testing standards
- e2e on Playwright; each context has clean localStorage (so first-run shows by default); seed the returning-user case with `context.addInitScript` setting `localStorage["mapsake.defaultView"]` before load. Assert the stored value via `page.evaluate(() => localStorage.getItem(...))` and the map zoom via `window.__mapsakeMap.getZoom()`. Reuse the `__mapsakeMap` harness; the world/focus map-state assertions don't need a server write.

### Project Structure Notes
- New `features/onboarding/{lib,components}` (the dir exists, only `.gitkeep`). MapLibre stays confined to `features/map` — onboarding toggles a `pickCountry` prop, it doesn't import maplibre. localStorage access is isolated in `onboarding-prefs.ts`. No migration, no new dependency.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4 + Story-4.1 (AC1/AC2); 4.2 for the persistence boundary]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Onboarding line 32; Account placement/tone line 22; Settings (default view) line 35; UJ-1 line 163-168; Banned list line 114]
- [Source: features/memories/components/map-memory-shell.tsx; features/map/components/MapCanvas.tsx; features/map/lib/visited.ts; features/onboarding/.gitkeep]

### Open questions for Simon — CONFIRMED 2026-06-24 ✅
1. **Storage = localStorage** (per-device; mirror to profiles when accounts land). ✅
2. **Focus = tap a country on the world map** (reuse the map; no list/search). ✅
3. Focus fly-to uses a **fixed zoom (~4) centered on the tapped point** for v1 (fitBounds-to-country is a later refinement) — reasonable default, flag if you want true fit-to-bounds.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- All 4 ACs met. localStorage-backed onboarding (`mapsake.defaultView`); the shell coordinates the step + writes; MapCanvas gets a `pickCountry` tap mode that flies to the tapped country (easeTo zoom 4) instead of marking.
- **Deviation from the story's Task 2 wording:** the `Onboarding` component is presentational (props `step`/`onChooseWorld`/`onChooseFocus`) and the SHELL owns the step + both localStorage writes — cleaner than splitting writes, because the focus `countryCode` arrives at the shell from the map tap. ACs unchanged.
- **First-run detection** is a mount effect (client-only localStorage read → no SSR/hydration flash). The `react-hooks/set-state-in-effect` lint is scoped-disabled there with a reason (legit external-store sync on mount).
- **Regression caught + fixed:** the question overlay now shows on every fresh Playwright context, covering the `＋ 新增回憶` button for the existing specs. Added `e2e/onboarding-bypass.ts` (`bypassOnboarding` seeds `mapsake.defaultView` via `addInitScript`) and a `test.beforeEach` to memory/map/pins/rollup specs so they run as a returning user. Verified: a pins drop test that would have been overlay-blocked passes in isolation; the full run had 31/37 pass incl. many drop-based tests.
- e2e flake fix: the focus test now waits for the country fill to render under the tap point before firing (cold-map tile race) — stable across `--repeat-each=3`.
- Validation: `tsc` clean · `pnpm lint` clean · `pnpm build` clean · onboarding spec 3/3 green + stable. Full suite: 31 passed; the 6 failures are the known environmental anon-rate-limit + concurrency flakes (all pass in isolation — pins drop 1.8s, onboarding focus 1.3s×3), not regressions.
- Scope held: 4.1 writes + applies the choice; landing-on-saved-view + Settings is 4.2; backfill/hand-off are 4.3/4.4. No migration, no new dependency.

### File List

- **NEW** `features/onboarding/lib/onboarding-prefs.ts` — localStorage default-view read/write
- **NEW** `features/onboarding/components/onboarding.tsx` — the question card + pick hint (presentational)
- **NEW** `e2e/onboarding.spec.ts` — world / focus / returning-user tests
- **NEW** `e2e/onboarding-bypass.ts` — shared helper to seed the choice (skip onboarding) in other specs
- **MOD** `features/map/components/MapCanvas.tsx` — `pickCountry` tap mode + `onCountryPick`
- **MOD** `features/memories/components/map-memory-shell.tsx` — onboarding coordination (step + writes + pick mode)
- **MOD** `e2e/{memory,map,pins,rollup}.spec.ts` — `beforeEach(bypassOnboarding)` so they run post-onboarding
- **MOD** `_bmad-output/implementation-artifacts/sprint-status.yaml` — epic-4 in-progress, 4-1 status

### Change Log

- 2026-06-24 — Story 4.1 implemented (default-view question). First-run onboarding asks world vs focus-a-country; world stays on the world view, focus enters a tap-a-country mode that flies into the country's regions; the choice persists in localStorage. New `features/onboarding`; MapCanvas gains a pick-country tap mode. Existing e2e specs seed the choice to skip the overlay. No new dep/migration. Status → review.
