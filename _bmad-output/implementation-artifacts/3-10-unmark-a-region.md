---
baseline_commit: 52eedaa
---

# Story 3.10: Unmark a region ("Remove this place")

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Carved from Story 3.8 (2026-06-23): the unmark-a-region half of epic 3.8 AC2 needs a
     net-new long-press/region surface, so it became its own story. Scope decision (Simon,
     2026-06-23): "Remove this place" removes EVERYTHING that makes the land visited — the
     explicit mark AND the pins/memories/photos in that region — behind a confirm that clearly
     states what will be lost. This is the literal EXPERIENCE "returns the land to bare paper". -->

## Story

As a user,
I want to remove a place I marked or filled,
so that I can correct my map without fear — knowing exactly what I'm removing.

## Acceptance Criteria

1. **Long-press a visited region → "Remove this place".** A long-press (touch) / right-click (desktop) on a *visited* region (one that reads visited by an explicit mark OR by a pin roll-up) offers a "Remove this place" action. A plain tap still MARKS (Story 1.5) — unmark is deliberately NOT a plain tap (protects rapid backfill). Long-press on a NOT-visited region does nothing. [epics 3.8 AC2 region half; EXPERIENCE Map region line 57 "open the region (long-press / region menu) … Remove this place"; line 110 "Unmark/delete is not a plain tap"]
2. **Gentle confirm that names the loss; bare mark = no friction.** If the region holds pins/memories, a **gentle confirm** (the shadcn AlertDialog from 3.8) clearly states it will remove the mark AND the region's pins + photos and **cannot be undone** (durability-first, honest about what's lost — show the count). A region that is **only a bare mark** (no pins) unmarks with **no friction** (no dialog). [epics 3.8 AC2 "a bare mark removes with no friction; a memory holding real content gets one gentle confirm"; EXPERIENCE Edit/remove line 66; Simon decision 2026-06-23]
3. **Remove → the land returns to bare.** Confirming removes the explicit `region_mark` (if any) AND deletes every pin in that region (pin rows cascade their photo rows via FK; bucket objects cleaned). With nothing left contributing, the region (and its country, if nothing else contributes) returns to bare — via the Story 3.9 derived render. Durable-write: optimistic removal, **rollback on failure** + calm retry (a failed removal must not look successful). A region still backed elsewhere (e.g. a country with another marked/pinned admin-1) stays visited per the roll-up. [epics 3.8 AC3 / 3.9; architecture#Data line 113; durable-write line 204]

## Tasks / Subtasks

- [x] **Task 1 — `useUnmarkRegion` query/orchestration (AC: 2, 3)** [features/regions/queries/region-marks-queries.ts; reuse data fns]
  - [x] Add `useUnmarkRegion()` — `mutationFn: async ({ regionCode, level, pins }: { regionCode: string; level: RegionLevel; pins: Pin[] }) => { for (const pin of pins) { const photos = await listPhotos(pin.id); await deletePin(pin.id); await removePhotoObjects(photos.map(p => p.storagePath)); } await removeRegionMark({ regionCode, level }); }` — reuse `deletePin`/`listPhotos`/`removePhotoObjects` (data) + `removeRegionMark` (already exists). Delete the pin ROW first then clean objects (the row-first ordering from the 3.8 review — a failed row delete leaves the pin intact).
  - [x] **Optimistic + rollback:** `onMutate` removes the matching pins from `['pins', userId]` AND the mark from `['regionMarks', userId]` (so the marker + roll-up clear immediately); capture both prev snapshots. `onError` restores BOTH caches (the removal didn't fully happen → surface a calm retry). `onSuccess` invalidate both keys (+ `removeQueries(['photos', pinId])` per deleted pin). `retry: 1`. Mirror the `useDeletePin` shape (Story 3.8).
  - [x] Confirm the `['regionMarks', userId]` key + the optimistic `RegionMark[]` filter shape match the existing `useRegionMarks`/`useAddRegionMark` (read them first).
- [x] **Task 2 — Long-press trigger + region resolution (AC: 1)** [features/map/components/MapCanvas.tsx]
  - [x] Add `map.on("contextmenu", (e) => …)` — fires on desktop right-click AND touch long-press. Resolve the region under the point with `regionFromPoint(map, e.point)` (same helper the tap-to-mark uses; admin-1 at z≥3, country below). Also capture the feature's display label for the confirm copy (read the tapped feature's name property — check `style.ts`/the tiles for the zh-TW label field used by the symbol layer; fall back to a generic "這個地區" if absent).
  - [x] Determine if the region is VISITED: it has an explicit mark (`marks` includes `{regionCode, level}`) OR a pin in it (`pins` where `level==="admin1" ? p.regionCode===regionCode : p.countryCode===regionCode`). If NOT visited → ignore (no-op). If visited → compute the contained pins and open the remove flow.
  - [x] A `contextmenu` over a pin/cluster should be ignored the same way the tap handler guards (don't unmark when the user meant a pin). Call `e.preventDefault?.()` to suppress the browser context menu.
- [x] **Task 3 — Remove flow UI + confirm (AC: 1, 2, 3)** [features/regions/components/region-remove-dialog.tsx (NEW), MapCanvas.tsx]
  - [x] `pendingUnmark` state in MapCanvas: `{ regionCode, level, name, pins: Pin[] } | null`. When set, render `<RegionRemoveDialog>` (a controlled shadcn AlertDialog).
  - [x] **Bare mark (pins.length === 0):** do NOT open the dialog — call `useUnmarkRegion().mutate({regionCode, level, pins: []})` directly (no friction). It just removes the mark.
  - [x] **Holds pins:** open the AlertDialog. Calm, durability-first copy that NAMES the loss and the count, e.g. title "移除「{name}」？", body "這會一併刪除這個地區的 {pins.length} 個地點與其照片。此動作無法復原。", actions "移除" / "取消". Confirm → `useUnmarkRegion().mutate({...})` → clear `pendingUnmark`. On failure keep a calm retry (the mutation's error state; don't pretend success).
  - [x] Reuse `components/ui/alert-dialog.tsx` (3.8). Theme calm (no alarming red), portaled (already is).
- [x] **Task 4 — Tests (AC: 1, 2, 3)** [e2e/rollup.spec.ts or e2e/regions.spec.ts]
  - [x] e2e (mark-only unmark, no friction): tap land to mark a region (1.5) → assert visited → long-press it (`map.fire("contextmenu", {point, lngLat})` via the harness, or dispatch the contextmenu) → assert NO dialog → region returns to bare (reuse the 3.9 `regionVisitedUnder` + `featuresUnder` guards).
  - [x] e2e (region with a pin → confirm → bare): drop a pin in an unmarked region (region visited by roll-up) → long-press the region → AlertDialog appears naming the count → confirm "移除" → the pin's marker is gone AND the region returns to bare; reload → still bare, pin absent.
  - [x] e2e (no-op): long-press an UNvisited region → nothing happens (no dialog, still bare).
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Mind the known anon-rate-limit + post-reload `clickPin` flakes (deferred-work.md); wait for acks. (If `contextmenu` is awkward to fire through the harness, drive it via `window.__mapsakeMap.fire("contextmenu", {point, lngLat})`, mirroring how `dropPin` fires a synthetic `click`.)

### Review Findings (code review 2026-06-23)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied — all 3 ACs + 4 confirmed decisions met (real rollback, durability-first confirm with a real zh-TW label, broad country delete with count, reuse of the 3.9 derive, no new dep/migration). 0 decision-needed · 3 patch · 2 defer · dismissed (rest).

**Patch:**
- [x] [Review][Patch] **Partial-failure mid-loop leaves the cache stale-present (no auto-reconcile)** — `useUnmarkRegion` deletes pins one-by-one then the mark; if a middle pin fails, earlier pins are gone server-side but `onError` restores the FULL `['pins']` snapshot, so a deleted pin's marker reappears until some later refetch (no `onSettled`). Self-heals on reload (no data loss — Edge verified), but it momentarily lies. Fix: add `onSettled: () => { invalidate marksKey + pinsKey }` so any outcome reconciles to server truth. [features/regions/queries/region-marks-queries.ts]
- [x] [Review][Patch] **Inaccurate "calm retry" comment** — the `useUnmarkRegion` doc-comment says it "offers a calm retry," but no retry chrome is wired for unmark (a failed unmark rolls the cache back silently). Correct the comment to "rollback-on-failure (no retry UI yet — see deferred-work)". [features/regions/queries/region-marks-queries.ts] (The error/retry UI itself is deferred — below.)
- [x] [Review][Patch] **WA e2e assumes both points resolve to the same region** — the pin test drops at (122,-25) and presses at (117,-28), assuming both are `AU-WA`, but never asserts it; a tile resolving a neighbor would silently test the wrong region. Fix: assert `regionFromPoint`/the fill feature's `iso` is equal at both points before relying on the cross-point flow. [e2e/rollup.spec.ts]

**Deferred (also in deferred-work.md):**
- [x] [Review][Defer] **No error/retry surface for a failed unmark** — `useUnmarkRegion.isError`/`isPending` wire to no UI (`MarkStatus` only tracks add-pin/add-mark). A failed unmark rolls the region+pins back silently — the rollback is the only signal, no calm retry (unlike pin-delete's inline retry). Acceptable v1 (the rollback is honest + `onSettled` reconciles), but route unmark through a calm error/retry channel as part of the offline/error-state work. [features/map/components/MapCanvas.tsx, region-marks-queries.ts]
- [x] [Review][Defer] **Country-level unmark leaves sibling admin-1 marks** — a country-level "Remove this place" deletes ALL pins in the country (approved-broad) but does NOT clear explicit admin-1 *marks*, so the country can stay lit by a surviving child mark roll-up after the user "removed" it. Defensible (admin-1 marks are independent intent; deleting them silently would be worse), but surprising. Revisit the copy/behavior (e.g. confirm names surviving marks, or restrict unmark to admin-1) if it confuses real users. [features/map/components/MapCanvas.tsx]

Dismissed (verified non-issues): `['pins', userId]`/`regionMarksKey` match the real keys; the `onContextRef` ref-mirror (dep-less effect) always captures fresh `pins`/`marks`/`unmarkRegion`; `e.preventDefault()` is present on real MapLibre contextmenu events (and the test supplies it); `name_zh`/`name` ARE baked onto the fill features (build-tiles), so the confirm shows the real zh-TW name; the controlled dialog's auto-close + `onConfirm` clear converge on the same `null` (no double-fire of the mutation); `retry: 1` re-runs only `mutationFn` (`onMutate` once); fully additive — tap-to-mark + the 3.9 derive untouched; `regionBareUnder` requires ≥1 rendered feature (not vacuous).

## Dev Notes

### What this story adds (and what it must NOT touch)
- **NEW:** `features/regions/components/region-remove-dialog.tsx`. **UPDATE:** `features/regions/queries/region-marks-queries.ts` (+`useUnmarkRegion`), `features/map/components/MapCanvas.tsx` (contextmenu handler + `pendingUnmark` + render the dialog), e2e. **No** migration, no new dep (AlertDialog + `removeRegionMark` + `deletePin` all exist). **Do NOT** change the tap-to-mark flow (1.5), the drop/open/photo/delete flows, or the 3.9 visited derive (it just recomputes when caches change).

### Current state of files being modified
- **`data/region-marks.ts`** — `removeRegionMark({ regionCode, level })` already exists (RLS-scoped delete, no client `user_id`). `listRegionMarks` + `addRegionMark` (upsert, ignore-duplicates). `RegionMark = { userId, level, regionCode, countryCode, createdAt }`, `RegionLevel = "country"|"admin1"`. [Source: data/region-marks.ts]
- **`features/regions/queries/region-marks-queries.ts`** — `useRegionMarks()` (key `['regionMarks', userId]`, read it to confirm), `useAddRegionMark()` (optimistic mark; the durable-write pattern). Add `useUnmarkRegion` mirroring `useDeletePin`'s optimistic+rollback shape. [Source: features/regions/queries/region-marks-queries.ts]
- **`features/map/components/MapCanvas.tsx`** — has `useRegionMarks()` (`marks`), `usePins()` (`pins`), `useAddRegionMark()` (`addMark`). The tap handler `onTapRef` (≈ lines 64-90): a plain tap on land → `addMark.mutate(regionFromPoint(...))`, with guards (no session, offline, tap-on-pin no-op). The visited effect (3.9) applies `marks ∪ pinsToVisitedMarks(pins)` and recomputes when either cache changes — so removing the mark + pins clears the region with NO new map code. Add the `contextmenu` listener inside the once-attached map setup (like the other `map.on(...)` handlers), reading the latest `marks`/`pins` via refs if needed (the tap handler already uses an `onTapRef` ref-mirror pattern to dodge stale closures — follow it for contextmenu). [Source: features/map/components/MapCanvas.tsx]
- **`data/pins.ts` / `data/photos.ts`** — `deletePin(id)` (row; cascades photo rows), `listPhotos(pinId)`, `removePhotoObjects(paths)` all exist from 3.8. Reuse them per contained pin. [Source: data/pins.ts, data/photos.ts]
- **`features/map/lib/visited.ts`** — `regionFromPoint(map, point)` returns `{ regionCode, countryCode, level }` (validated ISO). Reuse for the contextmenu region resolution. The visited render derives from marks ∪ pins (3.9); no change. [Source: features/map/lib/visited.ts]
- **`components/ui/alert-dialog.tsx`** — the calm shadcn AlertDialog from 3.8; reuse. [Source: components/ui/alert-dialog.tsx]

### "Pins in the region" (which pins get deleted)
- For an **admin-1** long-press: pins with `pin.regionCode === regionCode`.
- For a **country** long-press: pins with `pin.countryCode === regionCode` (ALL pins in the country — country-level removal is broad; the confirm count makes this explicit). This mirrors the roll-up granularity (`pinsToVisitedMarks`): an admin-1 lights its region; a country-level contributor lights only the country.
- Compute from the in-memory `pins` (usePins) — no new data query.

### Durable-write / quiet states
- Optimistic removal of the mark + pins; **rollback on failure** (consistent with 3.8's deletes — a failed removal must not look successful). No "removed!" toast. The only friction is the single confirm, and only when the region holds pins. A bare mark removes silently (EXPERIENCE line 66). [architecture durable-write line 204; EXPERIENCE Saving/sync line 85; Principle "absence is normal" lines 47, 71]

### Trigger mechanism (decision)
`contextmenu` = right-click (desktop) + long-press (touch, fired by mobile browsers). MapLibre re-emits it as a map event with `point`/`lngLat`. This avoids hand-rolling a press timer and is the idiomatic "secondary action" on a map. (If real-device long-press proves unreliable on some browser, a press-and-hold timer on `touchstart`/`touchend` is the fallback — note in deferred-work, don't build both.)

### Testing standards
- e2e on the `window.__mapsakeMap` harness (`--enable-unsafe-swiftshader`); per-anon-user RLS; wait for acks. Fire the long-press via `__mapsakeMap.fire("contextmenu", { point, lngLat })` (mirrors `dropPin`'s synthetic `click`). Reuse the 3.9 `regionVisitedUnder` / `featuresUnder` predicates for the bare-assertion. Known flakes (anon rate-limit; post-reload `clickPin`) in deferred-work.md.

### Project Structure Notes
- Unmark orchestration in `features/regions/queries` (mirrors region-marks ownership); the confirm dialog in `features/regions/components`; the trigger in `features/map` (MapLibre confined there). Deletes reuse `data/` fns — no new boundary. No migration.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.8 lines 293-304 (region half, carved here); FR6 line 31]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Map region line 57; Edit/remove line 66; "not a plain tap" line 110; Saving/sync line 85; Principle lines 47/71]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data line 113; durable-write line 204]
- [Source: data/region-marks.ts; features/regions/queries/region-marks-queries.ts; features/map/components/MapCanvas.tsx; features/map/lib/visited.ts; data/pins.ts; data/photos.ts; components/ui/alert-dialog.tsx]

### Open questions for Simon — ALL CONFIRMED 2026-06-23 ✅
1. **Scope:** "Remove this place" removes the mark AND deletes the region's pins + photos, behind a confirm that names the loss + count.
2. **Bare mark (no pins) = no-friction unmark** (no dialog); a region holding pins always shows the confirm.
3. **Trigger = `contextmenu`** (right-click / long-press), not a plain tap (plain tap still marks).
4. **Country-level "Remove this place" deletes ALL pins in the country** (broad), with the count shown in the confirm so the loss is explicit.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- All 3 ACs met. `useUnmarkRegion` orchestrates: for each pin in the region, list photos → delete the row (cascades photo rows) → clean bucket objects (row-first ordering per the 3.8 review); then `removeRegionMark`. Optimistic removal from both `['pins', userId]` and `['regionMarks', userId]`; **rollback on failure** (a failed removal must not look successful) + calm retry; invalidate both + `removeQueries(['photos', pinId])` on success.
- **Trigger:** `map.on("contextmenu", …)` — right-click (desktop) + long-press (touch). The handler guards a press over a pin/cluster (mirrors the tap guard), resolves the region via `regionFromPoint`, computes the contained pins (admin-1 → `pin.regionCode`; country → `pin.countryCode`), and no-ops on a non-visited region. A bare mark (no pins) unmarks directly with no dialog; a region holding pins opens the confirm.
- **Confirm:** new `region-remove-dialog.tsx` reuses the 3.8 shadcn AlertDialog. Copy names the region (zh-TW label off the fill feature, fallback "這個地區") and the pin count, and states it can't be undone.
- **AC3 returns-to-bare:** removing the mark + pins from the caches re-runs the Story 3.9 visited effect (depends on `marks` + `pins`), so the region clears with no new map code.
- No migration, no new dependency (`removeRegionMark`/`deletePin`/AlertDialog all existed). Tap-to-mark, drop/open/photo/delete, and the 3.9 derive untouched.
- Validation: `tsc` clean · `pnpm lint` clean · `pnpm build` clean · 3 new e2e pass (mark-only no-friction unmark; region-with-pin → confirm → bare; long-press on an unvisited region = no-op). Full suite: 32 passed + 2 environmental failures (the note-persist flake and this story's pin test) — both pass in isolation (1.6s); the full run hit the known anon sign-in rate-limit after ~34 anon users (deferred-work.md), not a regression.

### File List

- **NEW** `features/regions/components/region-remove-dialog.tsx` — "Remove this place" confirm (reuses the 3.8 AlertDialog)
- **MOD** `features/regions/queries/region-marks-queries.ts` — `useUnmarkRegion` (mark + pins removal, optimistic + rollback)
- **MOD** `features/map/components/MapCanvas.tsx` — `contextmenu` handler + `pendingUnmark` state + render the dialog
- **MOD** `e2e/rollup.spec.ts` — 3 unmark tests + `longPress`/`markRegion`/`regionBareUnder` helpers
- **MOD** `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3-10 status

### Change Log

- 2026-06-23 — Story 3.10 implemented (unmark a region / "Remove this place"). Long-press (contextmenu) a visited region → a bare mark unmarks with no friction; a region with pins shows a gentle confirm naming the loss, then removes the mark AND all pins + photos and returns the land to bare (via the 3.9 derive). Optimistic + rollback-on-failure. No new dep/migration. Status → review.
- 2026-06-24 — Code review: 3 patches applied — `onSettled` invalidate on `useUnmarkRegion` (reconciles a partial multi-delete failure to server truth), corrected the "calm retry" comment (no retry UI yet), and hardened the WA e2e to press a fixed screen offset from the pin (guaranteed same region, off the marker) instead of two assumed-equal coordinates. 2 deferred (unmark error/retry surface; country-level leaves sibling admin-1 marks). tsc/lint clean; 3 e2e green. Status → done.
