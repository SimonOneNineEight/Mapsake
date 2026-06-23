---
baseline_commit: 0e81961
---

# Story 3.9: Pins roll up into visited

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Sequencing: pulled AHEAD of Story 3.8 (edit/remove) on 2026-06-23 — 3.8's AC3
     ("delete the only pin → region bare") depends on pins rolling up into visited, which is
     this story. Do 3.9 first, then 3.8's delete-pin path slots into the derive cleanly. -->

## Story

As a user,
I want dropping a pin to make its region read visited,
so that adding a memory also fills the map.

## Acceptance Criteria

1. **Drop a pin → its region (and country) roll up to visited.** In a region with no explicit mark, adding a pin inside it makes that admin-1 region AND its country render visited (terracotta fill + hatch), derived — not a stored mark. No downward cascade (the pin lights its own region + parent country only). A pin that resolved only a country at drop (no admin-1) lights just that country. [epics 3.9 AC1; FR6 line 31; architecture#feature-state-roll-up AR5 line 70; UX-DR6 line 86]
2. **Remove the last contributing pin → region returns to bare.** When a region is visited only by a pin roll-up (no explicit `region_mark`) and that pin is removed, the region (and country, if nothing else contributes) returns to bare. This is a pure consequence of the derived render: the visited set is recomputed from the current marks + pins every time either changes, and `applyVisitedState` clears any feature no longer in the set. [epics 3.9 AC2; architecture#Data line 113]
   - **Note (sequencing):** the *delete-a-pin UI* is Story 3.8 (deferred just after this one). 3.9 implements + unit-proves the derive (a pin set without the pin yields no key) and verifies the add→visited browser flow; the end-to-end *delete-pin → bare* browser test lands with 3.8, same precedent as the Story 1.6 unmark→clear deferral.
3. **No regression; roll-up composes with marks.** Explicit region/country marks (1.5/1.6) still render visited; a region that is BOTH marked and has pins stays visited after either contributor is removed while the other remains. Removing a pin never clears a region that an explicit mark (or another pin) still backs. The selected-pin glow, clustering, drop, open, photos all still work. [epics 1.6 AC1/AC2 roll-up + no-cascade]

## Tasks / Subtasks

- [x] **Task 1 — Derive visited marks from pins (AC: 1, 2, 3)** [features/map/lib/visited.ts]
  - [x] Add `pinsToVisitedMarks(pins: ReadonlyArray<{ regionCode: string | null; countryCode: string | null }>): VisitedMark[]`. For each pin: if `regionCode` is a valid admin-1 ISO → `{ regionCode, level: "admin1", countryCode: countryCode ?? undefined }`; else if `countryCode` present → `{ regionCode: countryCode, level: "country" }`; else skip (no resolvable region — shouldn't happen, guard anyway). De-duplication is not required (the keys are a `Set` in `computeVisitedKeys`).
  - [x] Do NOT change `computeVisitedKeys` / `applyVisitedState` signatures — they already take `VisitedMark[]`, already roll an admin-1 up to its country, already enforce no-downward-cascade, and already clear features no longer in the set (so removal → bare is automatic once pins flow through the same path).
- [x] **Task 2 — Merge pins into the visited render (AC: 1, 2, 3)** [features/map/components/MapCanvas.tsx]
  - [x] The visited effect currently calls `applyVisitedState(map, marks ?? [], prev)` on `[marks, mapReady]`. Change it to apply the MERGED list: `applyVisitedState(map, [...(marks ?? []), ...pinsToVisitedMarks(pins ?? [])], prev)`, and add `pins` to the dependency array so dropping/removing a pin recomputes the fill. `pins` is already read via `usePins()` (drives the marker layer) — reuse it; do not add a second query.
  - [x] Keep the single `prevStateRef` diffing intact (one effect owns the visited feature-state). Confirm the marker effect (`applyPins`) and the selected-glow effect are untouched.
- [x] **Task 3 — Tests (AC: 1, 3)** [e2e/rollup.spec.ts]
  - [x] e2e: on a region with no explicit mark, drop a pin inside it (await `已儲存`), then assert the region under the drop point has feature-state `visited === true` (and its country). Read the feature id/sourceLayer via `queryRenderedFeatures` at the projected drop point (the ISO is whatever the tile resolves — don't hardcode), then poll `getFeatureState` until visited. Reuse the `dropPin` helper / `window.__mapsakeMap` harness; wait for the ack before asserting (write-cancel-race).
  - [x] e2e (no-regression): an explicitly-marked region (tap land, 1.5) still renders visited, and a region with both a mark and a pin stays visited. (Use the existing rollup/map spec patterns.)
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. The AC2 *delete-pin → bare* browser flow is deferred to Story 3.8 (no delete UI yet); the derive is covered structurally (same `applyVisitedState` diff path as marks, proven for removal in Story 1.6).

### Review Findings (code review 2026-06-23)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied — all 3 ACs met; the region-identity keying makes the optimistic temp→real pin swap, union-removal, and admin1/country branching all correct (no unvisited flash); UPDATE-only, no new dep/migration/data/query; deferral (delete-pin browser test → 3.8) recorded, nothing from 3.8 built early. 0 decision-needed · 1 patch · dismissed (rest).

**Patch (applied 2026-06-23):**
- [x] [Review][Patch] **e2e precheck can pass vacuously before tiles render** — the browser test's synchronous not-visited precheck (and the poll) call `queryRenderedFeatures` under the drop point; after `jumpTo` the boundary tiles may not be rendered yet, so the precheck's `.some(...)` over an empty feature list returns `false` for the wrong reason. **Fixed:** added a `featuresUnder` guard — `waitForFunction` that ≥1 boundary feature is rendered under the point before the precheck, so not-visited is meaningful and the poll only gates on the `visited` state. (Inlined the layer list in each browser predicate — module-scope consts don't survive page.evaluate serialization.) rollup spec 11/11 green. [e2e/rollup.spec.ts]

Dismissed (verified non-issues): a country-style `regionCode` with null `countryCode` being skipped is unreachable — `regionFromPoint` always sets `countryCode` for both admin1 and country drops (Edge verified); a malformed-but-shaped ISO yields a harmless no-op `setFeatureState` on a nonexistent feature; refetch-on-focus re-applies all feature-state but it's idempotent + bounded by region count (pre-existing pattern); only ONE effect writes `visited` (marker writes the source, glow writes a filter) and `prevStateRef` has no second writer; the `onSourceData` listener is correctly paired/cleaned and re-runs with current `pins`; the admin1 ISO regex matches the tap-time check so a pin lights exactly the region a tap would mark.

## Dev Notes

### What this story adds (and what it must NOT touch)
- **UPDATE only:** `features/map/lib/visited.ts` (add `pinsToVisitedMarks`), `features/map/components/MapCanvas.tsx` (merge pins into the visited effect), `e2e/rollup.spec.ts` (add the roll-up test). **No** new files, deps, migration, data-layer, or query changes. **Do NOT** touch the marker/cluster/glow rendering, the drop flow, or `data/`.

### Current state of files being modified
- **`features/map/lib/visited.ts`** — `computeVisitedKeys(marks: VisitedMark[]): Set<string>` builds `"<sourceLayer>|<id>"` keys: each mark adds its own key, and an `admin1` mark ALSO adds `countries|<countryCode>` (roll-up). No downward cascade. `applyVisitedState(map, marks, prev)` computes `next = computeVisitedKeys(marks)`, sets `visited:true` on every next key, clears `visited:false` on every prev key not in next, returns next. **This is exactly the derive 3.9 needs** — feeding it `marks ∪ pinMarks` makes pins light regions, and dropping the last pin recomputes `next` without that key so `applyVisitedState` clears it. `VisitedMark = { regionCode, level, countryCode? }`. The admin-1 ISO validity regex used at tap is `/^[A-Z]{2}-[A-Z0-9]+$/` (reuse the same shape to decide a pin's level). [Source: features/map/lib/visited.ts]
- **`features/map/components/MapCanvas.tsx`** — already has `const { data: marks } = useRegionMarks()` and `const { data: pins } = usePins()`. The visited effect (≈ lines 232–252) applies `applyVisitedState(map, marks ?? [], prevStateRef.current)` keyed on `[marks, mapReady]`. A separate effect (`applyPins`) pushes pins to the GeoJSON marker source; the selected-glow effect filters `pins-selected`. The drop handler already captures `regionCode`/`countryCode` per pin (comment there explicitly says "so Story 3.9 can later roll the region up to visited"). Only the visited effect changes; the marker + glow effects stay as-is. [Source: features/map/components/MapCanvas.tsx]
- **`data/pins.ts`** — `Pin` has `regionCode: string | null` and `countryCode: string | null`, captured from the tapped feature at drop (3.1). These feed `pinsToVisitedMarks`. No change here. [Source: data/pins.ts]

### Roll-up rule (unchanged, must hold)
A region reads visited if explicitly marked OR if it contains a pin; a country reads visited if marked OR if any admin-1/pin within it is. **No downward cascade** — a country-level contributor never lights its child regions. This is already encoded in `computeVisitedKeys`; 3.9 only widens the input to include pins. [epics line 31 FR6; EXPERIENCE Map region line 57]

### Why this is purely derived (and why AC2 falls out for free)
`region_marks` stores only EXPLICIT marks; pins store their own rows. The visited render is a pure function of (marks ∪ pin-derived-marks), recomputed on every change with full prev/next diffing. So a region visited only by one pin returns to bare the instant that pin leaves the `pins` list — no special-case cleanup, no stored roll-up to invalidate. The delete-pin *UI* (3.8) will simply mutate the `['pins', userId]` cache; this effect already re-runs on `pins` change.

### Testing standards
- e2e on the `window.__mapsakeMap` harness (`--enable-unsafe-swiftshader`); per-anon-user under RLS; wait for `已儲存` before asserting. Don't hardcode an ISO — resolve the feature under the drop point via `queryRenderedFeatures` and read its `getFeatureState`. Known flakes (anon rate-limit; post-reload `clickPin`) are in deferred-work.md. No unit runner exists in the repo (Playwright-only), so the derive is covered by e2e + the structural reuse of the 1.6-proven `applyVisitedState` diff.

### Project Structure Notes
- Stays inside `features/map` (architecture: MapLibre confined there; visited render via feature-state, AR5). `pinsToVisitedMarks` lives beside `computeVisitedKeys` in `visited.ts`. No cross-feature import beyond the existing `@/data/*` types.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.9 lines 301–304; FR6 line 31; Story 1.6 lines 197–201 (roll-up + no-cascade)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Map AR5 line 70; #Data line 113]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Map region line 57; UX-DR6 line 86]
- [Source: features/map/lib/visited.ts; features/map/components/MapCanvas.tsx; data/pins.ts]

### Open questions for Simon
- None blocking. AC2's *delete-pin → bare* browser test is intentionally deferred to Story 3.8 (per the 2026-06-23 sequencing decision to do 3.9 before 3.8); the derive itself ships + is verified here.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

- No snags. The change is a strict widening: `pinsToVisitedMarks` reuses the admin-1 ISO regex and feeds the existing `computeVisitedKeys`/`applyVisitedState` path; the MapCanvas visited effect now applies `marks ∪ pin-derived marks` and depends on `pins`. tsc/lint green first try; rollup spec (5 existing + 5 new pure + 1 browser) all pass.

### Completion Notes List

- AC1 met: dropping a pin lights its admin-1 region and (via the existing roll-up) its country; a country-only pin lights just the country. Verified by a browser e2e (drop a pin in Tokyo → the region under the drop point flips to `visited` feature-state; asserted not-visited beforehand so it's non-vacuous) plus pure derive tests.
- AC2 derive met + proven (pure): `computeVisitedKeys(pinsToVisitedMarks([]))` is empty, so a region visited only by a pin returns to bare once the pin leaves the list. The single `applyVisitedState` prev/next diff (proven for marks in 1.6) now also clears pin-only regions. The delete-pin *UI* is Story 3.8, so the end-to-end delete→bare browser test is deferred there (per the 2026-06-23 swap), same precedent as the 1.6 unmark→clear deferral.
- AC3 met: roll-up composes with explicit marks (pure test: a region backed by BOTH a mark and a pin stays visited when the pin is removed). No downward cascade preserved. Marker/cluster/glow effects untouched (only the visited effect changed).
- No new files, deps, migration, data-layer, or query changes. `pins` reused from the existing `usePins()`.
- Validation: `tsc --noEmit` clean · `pnpm lint` clean · `pnpm build` clean · `rollup.spec.ts` 11/11 pass. Full suite: 26 passed + the 1 known post-reload `clickPin` flake (date-persist), which passes in isolation (2.1s) — pre-existing, in deferred-work.md, not a 3.9 regression.

### File List

- **MOD** `features/map/lib/visited.ts` — add `pinsToVisitedMarks` (pin → VisitedMark derive)
- **MOD** `features/map/components/MapCanvas.tsx` — visited effect applies marks ∪ pin-marks; depends on `pins`
- **MOD** `e2e/rollup.spec.ts` — 5 pure `pinsToVisitedMarks` tests + 1 browser drop→visited test
- **MOD** `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3-9 status (+ reorder note)

### Change Log

- 2026-06-23 — Story 3.9 implemented (pins roll up into visited). Pins now derive visited marks merged into the feature-state render; dropping a pin fills its region + country, removing the last contributing pin clears it (derive proven; delete-pin UI = 3.8). No new dep. Status → review.
