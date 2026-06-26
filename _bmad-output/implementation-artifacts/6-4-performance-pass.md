---
baseline_commit: 3d97ab6
---

# Story 6.4: Performance pass

Status: done

## Story

As a user,
I want the map and photos to stay fluid,
so that re-living is unbroken (NFR4).

## Acceptance Criteria

1. **Map pan/zoom + memory open stay smooth; photos load with placeholders/blur-up.** [epics 6.4; NFR4]
2. **The tile file meets its size budget; large photo sets load progressively.** [epics 6.4]

### What this pass found (mostly designed-in already)

- **Map smoothness** is architected: PMTiles + per-zoom simplification (Story 1.2), MapLibre clustering for dense pins (3.3), feature-state visited fills, and the ~60fps mid-range-phone acceptance from the Story 1.3 de-risk spike. The 6-2 `prefers-reduced-motion` guards heavy motion. No per-frame anti-pattern in the render path (pins/marks applied on change, not per-frame). → VERIFY, no change.
- **Photo placeholders + blur-up** already ship (Stories 3.6/3.7): the grid tile has a `bg-muted` placeholder + an opacity blur-up on load, fixed `aspect-square` (no layout shift); the viewer frame blur-ups over a calm placeholder. → VERIFY, no change.
- **Tile size budget** was met at build time in Story 1.2 (tippecanoe per-zoom simplification, tens-of-MB envelope). → VERIFY/document, no re-build here.
- **The one real gap:** the photo `<img>`s have no `loading="lazy"`/`decoding="async"`, so a large photo set on a pin eagerly decodes every thumbnail/frame. Adding lazy + async decoding is the concrete "large photo sets load progressively" win. → FIX.

### Scope decisions baked in

- This is a **verification + one targeted fix** pass, not a re-architecture. NFR4's heavy lifting (map render, tile budget, blur-up) landed in Epics 1/3; 6-4 confirms it and closes the lazy-loading gap. No new dependency, no profiling-infra wiring (that fits 6-5 CI), no migration/secrets.

## Tasks / Subtasks

- [x] **Task 1 — Progressive photo loading (AC: 2)** [features/memories/components/photo-grid.tsx (MOD), features/memories/components/photo-viewer.tsx (MOD)]
  - [x] Add `loading="lazy"` + `decoding="async"` to the grid `Thumb` `<img>` and the viewer `Frame` `<img>` so off-screen thumbnails/frames in a large set defer decoding (progressive). Keep the existing blur-up + placeholder. (The full-screen viewer is a horizontal snap track; lazy defers the off-screen frames.)
- [x] **Task 2 — Verify the designed-in NFR4 properties (AC: 1, 2)** [no code change — confirm + document]
  - [x] Confirm: the map render applies pins/marks on data change (not per-frame); clustering is on; reduced-motion is guarded (6-2). Confirm the grid uses `aspect-square` (no CLS) and the blur-up/placeholder render. Confirm the production build's First Load JS is reasonable (record the build's route-table sizes). Note the tile-budget status (built in 1.2; not re-checked here).
- [x] **Task 3 — Validation (AC: all)** [no new behavior to e2e]
  - [x] `tsc` + `lint` + `pnpm build` clean (record First Load JS); full `pnpm test:e2e` green (the lazy/async attrs must not break the photo upload/grid/viewer e2e). No new test needed — the change is two HTML attributes on existing, e2e-covered components.

## Dev Notes

- The blur-up + placeholder are in `photo-grid.tsx` (`Thumb`: `bg-muted` li + opacity transition on `onLoad`) and `photo-viewer.tsx` (`Frame`: same). The grid is `aspect-square` (no CLS). Just add the two loading attributes. [features/memories/components/photo-grid.tsx, photo-viewer.tsx]
- Map perf is designed-in (PMTiles + clustering + feature-state + the 1.3 spike); don't re-architect. [architecture map subsystem; Stories 1.2/1.3/3.3]
- Real runtime profiling (Lighthouse/FPS in CI) belongs to 6-5 (CI/monitoring), not here. [Story 6.5]

### References
- [Source: epics.md#Story-6.4 (lines 429-433); NFR4; architecture map subsystem; Stories 1.2 (tiles budget), 1.3 (~60fps spike), 3.3 (clustering), 3.6/3.7 (photo blur-up/placeholder), 6-2 (reduced-motion)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- tsc/lint/build clean; full e2e 106 passed, 1 pre-existing skip (the lazy/async attrs didn't break the photo upload/grid/viewer flows). Build route table is mostly prerendered `○`; this Next-16 build config doesn't print per-route First-Load-JS sizes, but the heavy dependency (MapLibre) is dynamic-imported inside an effect in MapCanvas, so it stays out of the initial/SSR bundle.

### Completion Notes List

- **Fix (AC2):** added `loading="lazy"` + `decoding="async"` to the photo grid `Thumb` `<img>` and the viewer `Frame` `<img>` — a large photo set now defers off-screen thumbnail/frame decoding (progressive). The existing blur-up + placeholder + `aspect-square` (no CLS) are unchanged; `onLoad` still fires for lazy images, so blur-up still works.
- **Verified designed-in (AC1, AC2), no change:** map smoothness is architected (PMTiles per-zoom simplification 1.2, MapLibre clustering 3.3, feature-state fills, the ~60fps 1.3 spike, the 6-2 reduced-motion guards); the render path applies pins/marks on data change (effects keyed on `pins`/`marks`/`mapReady`), NOT per-frame. Photo blur-up + placeholder ship from 3.6/3.7; the grid is `aspect-square` (no layout shift). Tile size budget was met at build time in 1.2 (not re-built here). MapLibre's heavy JS is client-dynamic-imported inside the MapCanvas build effect (out of the initial/SSR bundle); only its small stylesheet is a static top-level import (negligible). A skeptic verified claims 1-4 + flagged this CSS nuance; no per-frame work or unmemoized hot computation in the photo/map render paths.
- **Deferred to 6-5 (CI/monitoring):** real runtime profiling (Lighthouse/FPS budgets in CI). 6-4 is a verification + targeted lazy-loading fix, not a re-architecture.
- No new dependency, no migration, no secrets.

### File List

- `features/memories/components/photo-grid.tsx` (MOD — `loading="lazy"` + `decoding="async"` on the thumb)
- `features/memories/components/photo-viewer.tsx` (MOD — same on the viewer frame)

### Change Log

- 2026-06-25 — Story created (context engine). A verification + one-fix perf pass: most of NFR4 (map render, tile budget, photo blur-up) is designed-in from Epics 1/3; the gap is progressive photo loading (`loading="lazy"`/`decoding="async"`). Real profiling infra deferred to 6-5. No dep/migration/secrets.
- 2026-06-25 — Dev-story complete. Added lazy/async loading to the two photo `<img>`s; verified the designed-in NFR4 properties (map render not per-frame, blur-up/placeholder/no-CLS present, MapLibre client-dynamic, tile budget from 1.2). tsc/lint/build clean; full e2e 106 passed. Status → review.
