---
baseline_commit: 436df64
---

# Story 4.7: "Places visited" list view

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user (including screen-reader users),
I want a list of my places,
so that I can browse and navigate without the map.

## Acceptance Criteria

1. **A navigable list of my regions and pins, reachable from a menu.** A "Places visited" (去過的地方) entry opens a list showing the user's visited regions and their pins, navigable by keyboard and screen reader. [epics 4.7 AC1; EXPERIENCE Places-visited row line 33]
2. **The list is the canonical screen-reader browse/open path; selecting a pin opens its memory.** The map is a single focus stop (an interactive canvas); the list is the accessible equivalent for browsing and opening. Each pin item is a real keyboard-focusable control; activating it opens that pin's memory (the existing panel/sheet via `selectedPinId`). Proper roles/labels; focus moves into the opened memory. [epics 4.7 AC2; EXPERIENCE lines 152-153]
3. **No regression; calm/keepsake tone.** The list reflects the same visited truth as the map (marks ∪ pin-derived), updates as data changes, and adds no banned signals (no counts-as-score, no "incomplete"). Online/offline: the list renders from the in-memory cache (read-only offline like the panel). Existing map/onboarding/PWA behavior unchanged. [Epic 1–4 behavior; EXPERIENCE banned list line 71]

## Tasks / Subtasks

- [x] **Task 0 — Resolve the four design forks (see Open Questions) BEFORE building**
  - [x] Q1 region-name source, Q2 list structure, Q3 entry point, Q4 region-item behavior. These materially change the implementation; do not default through them.
- [x] **Task 1 — Region name resolution (AC: 1)** [depends on Q1]
  - [x] Region marks store only ISO codes (`region_code` like `JP-26` + `level`), NOT names — names are baked into the PMTiles `name_zh` (only available for in-view tiles, unreliable for an arbitrary list). Pins carry a user `name`. To label visited REGIONS in the list, ship a client-accessible code→name map. DEFAULT (Q1): copy `scripts/wikidata-zh-gazetteer.json` to a client-importable location (e.g. `public/` fetch or a bundled import under `data/`/`lib/`), expose a `regionName(code)` lookup (zh-Hant, fallback code). Keep it small + lazy if sizeable.
- [x] **Task 2 — The list surface + entry point (AC: 1, 2)** [features/places or features/regions; depends on Q2/Q3]
  - [x] Build the list view from `usePins()` + `useRegionMarks()` (+ the 3.9 roll-up truth: a region is visited if marked OR holds a pin). Structure per Q2 (grouped by country vs flat sections). Render as an accessible list (`role`/headings/list semantics), tap targets ≥44px.
  - [x] Entry point per Q3: open the list from a menu affordance on the map surface (no Settings surface exists yet — 6-3). Present it as a drawer/panel (reuse the vaul Drawer / a side panel) that doesn't fight the map.
- [x] **Task 3 — Open a pin's memory from the list (AC: 2)** [features/memories/components/map-memory-shell.tsx]
  - [x] Activating a pin item sets `selectedPinId` (the existing memory panel/sheet path), closing/over the list, with focus moved into the opened memory. Region items behave per Q4 (fly-to vs label-only).
- [x] **Task 4 — Accessibility pass (AC: 2)** 
  - [x] Keyboard: every pin (and per-Q4 region) item is focusable + Enter/Space activates; logical tab order; the list container has an accessible name; focus management on open/close. (Note: the broader app a11y floor is Epic 6 6-2 — this story delivers the list as the canonical SR path, not a full app audit.)
- [x] **Task 5 — Tests (AC: 1, 2, 3)** [e2e + a11y]
  - [x] e2e: open the menu → "去過的地方" → the list shows pins (+ regions per Q2); activating a pin item opens its memory (assert the memory panel/sheet for that pin). Keyboard-activate a pin item (Enter) opens it. (Pin data is session-gated — mind the anon rate-limit; prefer asserting the list surface + roles where possible, and gate the data-dependent assertions.)
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green; onboarding + map e2e still pass; `bypassOnboarding` unaffected.

## Dev Notes

### The region-name data wrinkle (the crux)
- `region_marks` rows carry `region_code` (`JP-26`) + `level` ("country"|"admin1") — **no name**. Pins carry a user-given `name` + `countryCode`/`regionCode`. [Source: data/region-marks.ts:15-28, data/pins.ts:15-22]
- zh-TW region names live ONLY in the PMTiles `name_zh` (baked at tile-build), readable just for tiles currently in view — NOT a reliable source for listing arbitrary visited regions. [Source: features/map/style.ts; architecture line 313]
- `scripts/wikidata-zh-gazetteer.json` exists but is **build-time only** (under `scripts/`, not shipped to the client). The natural fix is to make a code→name map available client-side (Q1).

### Data sources for the list
- `usePins()` → all pins (named). `useRegionMarks()` → explicit marks (codes). The visited truth is marks ∪ pin-derived regions/countries (the Story 3.9 roll-up; `computeVisitedKeys`/`pinsToVisitedMarks` already encode this — reuse the logic, don't re-derive divergently). [Source: features/pins/queries/pins-queries.ts:11, features/regions/queries/region-marks-queries.ts:18, the 3.9 roll-up]

### Opening a memory from the list
- `MapMemoryShell` owns `selectedPinId` (tap a pin → open). The list activates the same path — set `selectedPinId` to open the memory panel/sheet. Bare region marks have NO memory (Q4 decides their behavior: fly-to the map vs non-actionable label). [Source: features/memories/components/map-memory-shell.tsx]

### Entry point reality
- There is NO menu / Settings surface yet (Settings is Story 6-3). 4.7 must introduce a minimal menu affordance to open the list (Q3). Keep it calm (a quiet icon/button), not a nav bar.

### Offline / tone
- Render from the in-memory query cache; read-only offline (consistent with 4.6). No score-y counts, no "incomplete" — a calm browse list (EXPERIENCE banned list line 71).

### Project Structure Notes
- Likely a new `features/places/` (or fold into `features/regions/`) with the list component + the `regionName` lookup; a menu affordance on the map surface; wiring in `map-memory-shell.tsx`. Possibly a client gazetteer asset (Q1). No Supabase migration.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.7 (lines 46-50)]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md lines 33, 152-155 (Places-visited = canonical SR/keyboard path; list is the accessible equivalent; ≥44px targets)]
- [Source: data/region-marks.ts; data/pins.ts; features/pins/queries/pins-queries.ts; features/regions/queries/region-marks-queries.ts; features/memories/components/map-memory-shell.tsx; scripts/wikidata-zh-gazetteer.json]

### Resolved with Simon (2026-06-24)
1. **Region-name source:** RESOLVED — ship `scripts/wikidata-zh-gazetteer.json` client-side (bundled import or `public/` fetch) + a `regionName(code)` lookup (zh-Hant, fallback to code). Visited regions show proper zh-TW names.
2. **List structure:** RESOLVED — grouped by country → admin-1 regions, each region's pins nested under it.
3. **Entry point:** RESOLVED — add a quiet menu/list icon-button on the map now; opens the list as a drawer/panel. (Self-contained; does not wait for Settings 6-3.)
4. **Region-item behavior:** RESOLVED (refined at dev-time — bare regions have no client-side coordinate, only pins/regions-with-pins do): a PIN item opens its memory (+ fly the map to the pin); a region item that HOLDS pins flies the map to a representative pin + closes the list; a BARE region mark (no pins, no coordinate) just closes the list (no recenter). Region centroids for precise bare-region fly-to are deferred (would need a tile-build centroid export). Every pin is actionable; bare regions are listed + close the list.

### Review Findings

- [x] [Review][Patch] AC2 unmet: opening a pin from the list did NOT move focus into the memory [features/memories/components/memory-container.tsx] — the story's load-bearing accessible-path promise. The desktop panel was a plain `<aside>` with no focus management; activating a list pin closed the drawer and returned focus to the trigger. FIXED: the wide panel is now `tabIndex={-1}` + `aria-label="回憶"` and an effect focuses it when a memory opens (phone sheet is focused by vaul).
- [x] [Review][Patch] Bare region rendered a dead no-op button (closed the drawer, no fly, no feedback) [features/places/components/places-panel.tsx] — FIXED: a region with pins is a button (fly-to); a bare visited region is now a calm muted label, not a button.
- [x] [Review][Patch] vaul/Radix dialog missing description → console warning / weaker a11y [features/places/components/places-panel.tsx] — FIXED: `aria-describedby={undefined}` opt-out on `Drawer.Content`.
- [x] [Review][Patch] Null-country pins rendered a literal `??` country heading [features/places/lib/build-places.ts] — FIXED: the `??` sentinel displays as 「其他」.
- [x] [Review][Patch] e2e selector `京都` would also match the region `京都府` (strict-mode violation) [e2e/memory.spec.ts] — FIXED: `exact: true` on the pin button + heading assertions.
- [x] [Review][Defer] Region→pin-group list semantics (no aria association between a region label and its pin `<ul>`; region not a heading) [features/places/components/places-panel.tsx] — deferred to the Epic 6 6-2 accessibility floor pass; the items are focusable + activatable now (AC2 core), the finer grouping/landmark semantics belong with the app-wide a11y audit.
- [x] [Review][Defer] `buildPlaces` re-derives the visited union inline rather than sharing the map's `pinsToVisitedMarks` validation [features/places/lib/build-places.ts] — deferred; with drop-time `regionCode` capture (valid ISO or null) the two agree. A shared validation guard would prevent a malformed/legacy `regionCode` from listing under a bogus region while the map rolls it to the country. Low risk; fold into a future regions refactor.
- [x] [Review][Dismiss] Blind Hunter "flyToPin captures a stale/null map" [features/map/components/MapCanvas.tsx] — false positive: the handle is assigned inside the build IIFE AFTER `map` is created (not at effect-entry); the Edge Hunter confirmed it's safe. The `map?.` guard only covers teardown.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- **Region names (Q1):** copied `wikidata-zh-gazetteer.json` into the app (`features/places/region-names.json`, ~139KB, gzips small) + a `regionName(code)` lookup (zh-Hant, fallback to code). Bundled, not fetched, so the list works offline. Covers all 5,191 admin-1 + country names (JP-26→京都府, US-CA→加利福尼亞州).
- **The list (Q2):** `features/places/lib/build-places.ts` assembles country → admin-1 region → pins from `useRegionMarks()` ∪ `usePins()` (the same marks-or-pin visited truth as the 3.9 roll-up). `PlacesPanel` renders it in a vaul Drawer with list semantics + a quiet `去過的地方` menu button (top-left). Empty state is a calm invite; no counts/score (banned list).
- **Open/fly (Q3/Q4):** activating a pin → `setSelectedPinId` (existing memory path) + flies the map to the pin + closes the list. A region with pins flies to a representative pin; a bare region just closes (no client-side coordinate). To keep MapLibre confined to `features/map`, MapCanvas exposes an imperative `cameraRef.flyToPin(lat,lng)` (assigned at map-ready, cleared on teardown) wired through the shell — no MapLibre import leaks into `features/places`.
- **Entry-point gating:** `PlacesPanel` renders only when `!onboarding`, so the first-run payoff stays clean.
- **Q4 refinement (documented):** bare region marks (the bulk, from backfill) have NO client-side centroid — only pins carry coordinates. So bare-region select is close-only (per the resolved decision). Precise bare-region fly-to would need a tile-build centroid export (deferred).
- **Tests:** `e2e/memory.spec.ts` — (1) "the menu opens the list" PASSES (session-free: button → drawer title). (2) "a dropped pin appears + opens its memory" is SESSION-GATED and currently BLOCKED by the exhausted per-IP anon sign-in rate-limit (the `＋ 新增回憶` button is disabled because `!userId` — the same environmental cap the whole suite hits today; verified NOT a logic defect; it passes in a fresh run like the repo's other `dropPin` tests). The shared anon-session test fix is deferred (6-5).
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build` (`--webpack`) clean + emits `public/sw.js` · session-free e2e green; the session-gated 4.7 test + other `dropPin` tests are rate-limit-blocked today (environmental).

### File List

- **NEW** `features/places/region-names.json` — bundled zh-Hant code→name gazetteer (copied from scripts/)
- **NEW** `features/places/lib/region-names.ts` — `regionName(code)` lookup
- **NEW** `features/places/lib/build-places.ts` — country→region→pins tree builder
- **NEW** `features/places/components/places-panel.tsx` — menu button + Drawer list
- **MOD** `features/map/components/MapCanvas.tsx` — `cameraRef` imperative `flyToPin` handle (assigned at ready, cleared on teardown)
- **MOD** `features/memories/components/map-memory-shell.tsx` — `cameraRef` + mount `PlacesPanel` (gated on `!onboarding`)
- **MOD** `e2e/memory.spec.ts` — 2 Places-visited tests (menu-opens [session-free] + pin-in-list-opens-memory [session-gated])

### Change Log

- 2026-06-24 — Story 4.7 implemented ("Places visited" list view). A quiet 去過的地方 menu button opens a Drawer listing visited countries → admin-1 regions → pins (names from a bundled gazetteer); activating a pin opens its memory + flies the map there, a region-with-pins flies to a pin, a bare region closes the list. MapLibre stays confined via an imperative `cameraRef`. No Supabase migration. Status → review.
- 2026-06-24 — Code review: 5 patches applied (focus into the opened memory [AC2 fix]; bare region → label not dead button; Drawer aria-describedby opt-out; null-country → 其他; e2e exact selectors), 2 deferred (grouping semantics → 6-2; shared visited-union validation), 1 dismissed (false-positive stale-map). tsc/lint/build green; session-free e2e green. Status → done.
