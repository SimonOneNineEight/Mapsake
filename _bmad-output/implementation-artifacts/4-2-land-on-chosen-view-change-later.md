---
baseline_commit: 4ea1d8b
---

# Story 4.2: Land on chosen view (change-later deferred to 6.3)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Scope (Simon, 2026-06-24): 4-2 delivers AC1 (land on the saved view on load). AC2 ("change
     the default view in Settings") is DEFERRED to Story 6.3 (the full Settings surface, which
     already lists "default view") — no Settings chrome exists yet and building it here would be
     throwaway. Trade-off accepted: the choice isn't changeable in-app until Epic 6. -->

## Story

As a user,
I want to land on my chosen view when I open the app,
so that it opens where I think about my travels.

## Acceptance Criteria

1. **Land on the saved view.** On open, a returning user (a default view is stored) lands on it: **world** → the world framing (unchanged default); **focus** → the map opens already framed on the chosen country's regions (its stored center at the focus zoom, ~4). No onboarding question for a returning user (Story 4.1 already gates that). [epics 4.2 AC1; FR18]
2. **Change later — DEFERRED to Story 6.3.** "Change the default view in Settings" is NOT built here. Story 6.3 (Settings surface) owns the default-view control (epics 6.3 lists it). 4.2 only persists + applies the choice; once 6.3 lands, changing it there takes effect on the next open via the same stored value. [epics 4.2 AC2 → deferred to 6.3; epics line 408-411]

## Tasks / Subtasks

- [x] **Task 0 — Scope (confirmed 2026-06-24)**
  - [x] AC1 only. AC2 (Settings change-control) → Story 6.3. Record the deferral in deferred-work.md + the sprint-status note. Do NOT build any Settings chrome/menu here.
- [x] **Task 1 — Store the focus center so load can frame it (AC: 1)** [features/onboarding/lib/onboarding-prefs.ts]
  - [x] Extend `DefaultView` focus to carry the picked center: `{ kind: "focus"; countryCode: string; center?: [number, number] }` (center OPTIONAL for back-compat with a 4.1 value that stored only `countryCode`). Update `readDefaultView` validation to accept focus with/without a `[number, number]` center (reject a malformed center → treat as no center, still a valid focus).
  - [x] (No migration — localStorage only.)
- [x] **Task 2 — Capture the center at pick time (AC: 1)** [features/memories/components/map-memory-shell.tsx]
  - [x] `MapCanvas.onCountryPick` already provides `{ countryCode, lngLat }`. In `finishFocus`, store `center: [lngLat.lng, lngLat.lat]` alongside `countryCode` so a later open can frame the same spot. (Story 4.1 wrote `{kind:"focus",countryCode}`; this adds `center`.)
- [x] **Task 3 — Apply the saved view on load (AC: 1)** [features/memories/components/map-memory-shell.tsx, features/map/components/MapCanvas.tsx]
  - [x] Shell: compute the stored view ONCE for the initial camera — `const [initialView] = useState(() => readDefaultView())` (lazy initializer; SSR returns null via the `typeof window` guard; the value is consumed only inside MapCanvas's client build effect, so no hydration mismatch). Pass `initialView` to `<MapCanvas>`.
  - [x] MapCanvas: add `initialView?: DefaultView` prop. At map construction, derive the opening camera: a `focus` view with a `center` → `center: storedCenter, zoom: 4`; otherwise the world default `center: [0,20], zoom: 1.5`. The user "lands on" the view with NO animation (opens there, not a fly-in on every load). The build effect runs once and reads `initialView` from its closure (stable via `useState`).
  - [x] A focus value WITHOUT a center (a pre-4.2 stored value) → fall back to the world framing (graceful; the choice is re-captured with a center next time the user re-picks via 6.3). Note this.
- [x] **Task 4 — Tests (AC: 1)** [e2e/onboarding.spec.ts]
  - [x] e2e (returning focus → frames the country): seed `localStorage["mapsake.defaultView"] = {kind:"focus", countryCode:"IN", center:[78.9,22.6]}` via `addInitScript` → load → the map opens at the focus zoom (`getZoom()` ≈ 4, > 3) centered near the stored center (assert `getCenter()` lng/lat within a tolerance of 78.9/22.6); no onboarding question.
  - [x] e2e (returning world → world framing): seed `{kind:"world"}` → load → `getZoom()` < 3 (world); no question. (The existing returning-user test already covers "no question"; extend/duplicate for the world-zoom assertion.)
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. The existing `bypassOnboarding` seeds `{kind:"world"}`, so the other specs still open at world (unchanged); confirm no regression to their map interactions.

### Review Findings (code review 2026-06-24)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied — AC1 correct end-to-end (capture → store → validate → opening camera), AC2 properly deferred to 6.3 (recorded), both decisions honored, no scope leakage, no regression. 0 decision-needed · 1 patch · 0 defer · dismissed (rest).

**Patch (applied 2026-06-24):**
- [x] [Review][Patch] **`isLngLat` accepts NaN/Infinity** — **Fixed:** `isLngLat` now uses `Number.isFinite(v[0]) && Number.isFinite(v[1])`, so a corrupted center is dropped (focus falls back to world framing) instead of reaching MapLibre. tsc/lint clean; onboarding 5/5. [features/onboarding/lib/onboarding-prefs.ts]

Dismissed (verified non-issues): no hydration mismatch (`initialView` from the lazy `useState` is never in SSR markup — only a prop to MapCanvas, whose SSR output is a bare `<div>`; the map builds client-side); `initialViewRef` captures the correct mount value (shell's `initialView` is stable, ref read in the build-once effect avoids the exhaustive-deps warning, no stale-on-first-render); `[lngLat.lng, lngLat.lat]` is the correct MapLibre `center` order (no swap); a pre-4.2 focus value without a center returns a valid focus + falls back to world framing (intended); the camera and onboarding gate both derive from the same stored value with no conflict; `bypassOnboarding` keeps the other specs at the world camera (byte-identical to before); `getZoom`<3 / >3 cleanly separate world (1.5) from focus (4), center ±1° is safe (static frame, no animation).

## Dev Notes

### Scope boundary
- **4.2 (this):** persist the focus center (4.1 extension) + apply the saved view as the opening camera on load. AC1 only.
- **6.3 (Settings surface):** the in-app control to CHANGE the default view (and the rest of Settings). 4.2's AC2 lives there. The stored-value contract (`mapsake.defaultView`) is the shared interface — 6.3 just writes a new value and the next open applies it via 4.2's load path.
- Do NOT build Settings chrome, a menu, or a header here. Do NOT touch 4.3 (backfill) / 4.4 (hand-off).

### Current state of files being modified
- **`features/onboarding/lib/onboarding-prefs.ts`** (4.1) — `DefaultView = {kind:"world"} | {kind:"focus";countryCode}`; `readDefaultView()`/`writeDefaultView()` localStorage under `mapsake.defaultView`, SSR-guarded + try/catch, malformed→null. Extend the focus variant with an optional `center`; keep the guards. [Source: features/onboarding/lib/onboarding-prefs.ts]
- **`features/memories/components/map-memory-shell.tsx`** (4.1) — `"use client"`. Owns `selectedPinId`, `onboarding` state (mount effect: `readDefaultView()===null → "question"`), `finishWorld`/`finishFocus` (write + close), renders `<MapCanvas pickCountry onCountryPick .../>` + `<Onboarding>`. Add the `initialView` `useState` lazy read + pass to MapCanvas; have `finishFocus` store `center`. The onboarding gate is unchanged (a returning user with any stored value still skips the question). [Source: features/memories/components/map-memory-shell.tsx]
- **`features/map/components/MapCanvas.tsx`** — builds the map once in an async effect at `center:[0,20], zoom:1.5`. The 4.1 `pickCountry`/`onCountryPick` props exist. Add `initialView?` and use it to pick the opening `center`/`zoom` at `new maplibregl.Map({...})`. The build effect already runs once; reading `initialView` from its closure is fine (stable). MapLibre stays confined here. [Source: features/map/components/MapCanvas.tsx]

### Land-on-it = opening camera, not a fly
Set the initial `center`/`zoom` at map construction so the user OPENS on their view (no fly-in animation on every load — calmer, and avoids a flash of world-then-fly). The 4.1 onboarding fly (`easeTo`) is only for the live pick; load is a static frame. [EXPERIENCE: calm, no jarring motion; honor reduced-motion already handled for fills]

### Why store center (not look up by countryCode)
A `countryCode` alone can't position the camera without a country→coords table or a tile query (timing-fragile on load). The 4.1 pick already has the tapped `lngLat`; persisting it as `center` makes load a trivial, reliable static frame. localStorage-only, no migration. (A pre-4.2 focus value lacks center → graceful world fallback.)

### Testing standards
- e2e seeds `localStorage` via `context.addInitScript`/`page.addInitScript` before load (the established pattern from 4.1 + `bypassOnboarding`). Assert the opening camera via `window.__mapsakeMap.getZoom()` / `.getCenter()`. No server write needed (localStorage + map only), so these dodge the anon-rate-limit. Reuse the `__mapsakeMap` harness.

### Project Structure Notes
- Touches only the 4.1 onboarding prefs + shell + MapCanvas's initial camera. No new files, no dep, no migration, no Settings surface. MapLibre confined to `features/map`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.2 lines 317-320; FR18 line 48; #Story-6.3 lines 408-411 (Settings owns default-view → AC2 deferred there)]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Settings line 35 (default view lives in Settings); Onboarding line 32]
- [Source: features/onboarding/lib/onboarding-prefs.ts; features/memories/components/map-memory-shell.tsx; features/map/components/MapCanvas.tsx; e2e/onboarding.spec.ts]

### Open questions for Simon — CONFIRMED 2026-06-24 ✅
1. **AC2 (change in Settings) deferred to Story 6.3** (no throwaway Settings chrome now). ✅
2. Focus "land on it" stores the picked `center` and opens there at zoom 4 (static frame, no fly) — reasonable v1 default; flag if you'd prefer a gentle fly-in on load or true fit-to-country-bounds.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- AC1 met. A returning user opens on their saved view: `world` stays at the world framing; `focus` opens already framed on the stored country (center + zoom 4), no fly-in. AC2 (change-in-Settings) deferred to Story 6.3 (logged), per the 2026-06-24 scope decision.
- `DefaultView` focus extended with an optional `center: [number, number]`, captured at pick time (4.1's `onCountryPick` already had the lngLat). `readDefaultView` validates the center and gracefully treats a malformed/absent one as a focus with no center (→ world framing fallback, covers pre-4.2 values).
- The shell reads the stored view once (`useState` lazy initializer, SSR-null via the window guard) and passes `initialView` to MapCanvas; the build effect reads it through `initialViewRef` (mount-time value) so a later change can't rebuild the map AND there's no exhaustive-deps warning.
- Opening camera is set at `new maplibregl.Map({...})` — a static frame ("land on it"), not an animated fly on every load.
- Validation: `tsc` clean · `pnpm lint` clean (no warnings) · `pnpm build` clean · onboarding spec **5/5** incl. the 2 new 4.2 landing tests (returning-focus frames India at zoom>3 centered ~78.9/22.6; returning-world at zoom<3). Full suite: 36 passed; the 3 failures are the anon sign-in rate limit (confirmed `Request rate limit reached` — the per-IP window is exhausted from today's many runs; the onboarding tests are session-free and pass), not a regression. `bypassOnboarding` seeds `{kind:"world"}` so the other specs open at world (camera path unchanged for them).
- No new files, dependency, migration, or Settings chrome.

### File List

- **MOD** `features/onboarding/lib/onboarding-prefs.ts` — `DefaultView` focus + optional `center`; validation
- **MOD** `features/memories/components/map-memory-shell.tsx` — `initialView` lazy read + pass to MapCanvas; `finishFocus` stores `center`
- **MOD** `features/map/components/MapCanvas.tsx` — `initialView` prop → opening camera (focus center/zoom via `initialViewRef`)
- **MOD** `e2e/onboarding.spec.ts` — returning-world zoom + returning-focus framing tests
- **MOD** `_bmad-output/implementation-artifacts/{sprint-status.yaml,deferred-work.md}` — 4-2 status + AC2→6.3 deferral

### Change Log

- 2026-06-24 — Story 4.2 implemented (land on chosen view; AC1). The saved default view is applied as the opening camera on load — focus opens framed on the stored country, world stays world. Focus shape extended to persist the picked center. AC2 (change in Settings) deferred to Story 6.3. No new dep/migration. Status → review.
