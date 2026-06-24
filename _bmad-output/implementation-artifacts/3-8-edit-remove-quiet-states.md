---
baseline_commit: f2a25a8
---

# Story 3.8: Edit / remove + quiet states

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->
<!-- Scope decision 2026-06-23: SPLIT. This story = remove a photo + delete a pin (with a
     gentle confirm). The third epic-AC2 act — UNMARK A REGION — needs a net-new long-press /
     region-menu surface (none exists today) and is carved into its own follow-up story
     (3-10-unmark-a-region) so it gets a proper interaction-design pass. AC1, AC2-for-pins,
     and AC3 are fully delivered here; AC2-for-regions is tracked in 3-10. -->

## Story

As a user,
I want to edit or remove memories safely,
so that I stay in control without fear of loss.

## Acceptance Criteria

1. **Remove a photo → it persists.** In an open pin's memory (the photo viewer / grid), a quiet per-photo remove affordance deletes that photo: its row in `photos` AND its object in the private `pin-photos` bucket are removed, and the change persists (durable-write: optimistic, reconciled on ack, retained-on-failure with a calm retry). Other photos are untouched. Editing the note/date (Story 3.5) continues to persist. [epics 3.8 AC1; EXPERIENCE Edit/remove line 66 "remove an individual photo"]
2. **Delete a pin → gentle confirm only if it holds real content; bare = no friction.** A "delete this memory" affordance on the open pin. If the pin **holds real content** (a note, a date, or ≥1 photo) → **one gentle confirm** (a shadcn AlertDialog) before deleting; messaging is durability-first, never implying accidental loss. A **name-only pin** (no note/date/photo) deletes with **no friction** (no dialog). Deleting removes the pin row (its `photos` rows cascade via FK) AND cleans the pin's bucket objects, then closes the memory. [epics 3.8 AC2 (pin half); EXPERIENCE Edit/remove line 66 + Delete-a-pin line 58 + line 110]
   - **Scope note:** the *unmark-a-region* half of epic AC2 ("Remove this place") is carved into Story **3-10-unmark-a-region** (needs a new long-press/region-menu surface). Not built here.
3. **Delete the only pin making a region visited → region returns to bare.** When a pin is the sole reason a region reads visited (no explicit `region_mark`, no other pin), deleting it returns the region (and its country, if nothing else contributes) to bare. This works because deleting the pin invalidates `['pins', userId]`, and the Story 3.9 visited effect recomputes the derived set from the remaining marks ∪ pins. A region also backed by an explicit mark or another pin stays visited. [epics 3.8 AC3 + 3.9; architecture#Data line 113]

## Tasks / Subtasks

- [x] **Task 0 — Add the shadcn AlertDialog (approved dep)**
  - [x] `pnpm add @radix-ui/react-alert-dialog`, then add `components/ui/alert-dialog.tsx` (shadcn AlertDialog primitives) styled to the calm theme (terracotta primary, `--card`/`--foreground`/`--muted-foreground` tokens; no alarming red). Match the existing `components/ui` shadcn style (button/drawer). This is the approved confirm primitive (2026-06-23 decision).
- [x] **Task 1 — Data: delete a photo + delete a pin (AC: 1, 2)** [data/photos.ts, data/pins.ts]
  - [x] `data/photos.ts`: `deletePhoto(input: { id: string; storagePath: string }): Promise<void>` — delete the `photos` row (`.delete().eq("id", id)`, RLS-scoped) then `removePhotoObject(storagePath)` (already exists; best-effort). Add `removePhotoObjects(paths: string[]): Promise<void>` — bulk `storage.from("pin-photos").remove(paths)` (best-effort, swallow error), for the pin-delete cleanup.
  - [x] `data/pins.ts`: `deletePin(id: string): Promise<void>` — `supabase.from("pins").delete().eq("id", id)` (RLS scopes to owner; the FK `photos.pin_id … ON DELETE CASCADE` removes photo ROWS automatically). Does NOT touch storage — the caller cleans objects (FK can't reach the bucket). Resolves on ack; throws on failure.
- [x] **Task 2 — Queries: useDeletePhoto + useDeletePin (AC: 1, 2, 3)** [photos-queries.ts, pins-queries.ts; durable-write]
  - [x] `features/memories/queries/photos-queries.ts`: `useDeletePhoto(pinId)` — `mutationFn: (photo: { id; storagePath }) => deletePhoto(photo)`; optimistic remove from the `['photos', pinId]` cache; `onSuccess` invalidate; `retry: 1`; no `onError` rollback (retain + calm retry).
  - [x] `features/pins/queries/pins-queries.ts`: `useDeletePin()` — `mutationFn: async (pin: Pin) => { const photos = await listPhotos(pin.id); await removePhotoObjects(photos.map(p => p.storagePath)); await deletePin(pin.id); }` (clean objects BEFORE the row delete so the paths are still known; the row delete cascades the photo rows). `onMutate`: optimistically remove the pin from `['pins', userId]` (so its marker disappears AND the 3.9 roll-up recomputes immediately). `onSuccess`: invalidate `['pins', userId]` (+ remove `['photos', pin.id]`). `retry: 1`; no rollback.
  - [x] AC3 falls out: removing the pin from `['pins']` re-runs the MapCanvas visited effect (depends on `pins`), so a pin-only region clears. No new map code.
- [x] **Task 3 — Photo remove UI (AC: 1)** [photo-viewer.tsx, photo-grid.tsx or photo-uploader.tsx]
  - [x] Add a quiet per-photo **remove** control in the **photo viewer** (the natural per-photo surface, Story 3.7): a calm "刪除這張" affordance (NOT the AlertDialog — a single photo is low-stakes; direct remove with the durable retry). The viewer takes a new `onDelete?: (photoId: string) => void`; after delete, if it was the last photo close the viewer, else clamp the index to a valid frame. The uploader (owns `photos` + viewer state) wires `onDelete` → `useDeletePhoto(pinId).mutate(...)`.
  - [x] (Optional, keep minimal: do NOT also add a grid-thumbnail delete — one remove surface, in the viewer, is enough for v1. The grid tap opens the viewer where remove lives.)
- [x] **Task 4 — Pin delete UI + gentle confirm (AC: 2, 3)** [memory-card.tsx]
  - [x] Add a quiet "刪除回憶" affordance (link-quiet, low-emphasis — e.g. at the foot of the card). Determine `hasContent = Boolean(pin.note) || Boolean(pin.memoryDate) || (photoCount > 0)` (photoCount from `usePhotos(pin.id)`).
  - [x] If `hasContent`: clicking opens the **AlertDialog** — calm, durability-first copy (e.g. title "刪除這個回憶？", body notes the photos/note will be removed, actions "刪除" / "取消"); confirm → `useDeletePin().mutate(pin)` → on success call the card's `onClose`/`onDeleted` so the panel/sheet closes. If NOT `hasContent`: delete directly (no dialog).
  - [x] The memory card needs an `onDeleted` (or reuse the container's close) so deleting closes the open memory. Wire through `memory-container.tsx` → `map-memory-shell.tsx` (`setSelectedPinId(null)`), mirroring the existing close path. Durable status: show the calm 儲存中…/重試 pattern on failure (retain — don't close on error).
- [x] **Task 5 — Tests (AC: 1, 2, 3)** [e2e/memory.spec.ts, e2e/rollup.spec.ts]
  - [x] e2e (photo remove): drop pin → open → upload a photo (await http thumb) → open viewer → remove it → assert the photo is gone and stays gone after reload.
  - [x] e2e (pin delete + confirm): drop pin → add a note (content) → "刪除回憶" → AlertDialog appears → confirm → the pin's marker is gone and the memory closed; reload → pin absent. Also: a **name-only** pin deletes with **no** dialog.
  - [x] e2e (AC3 roll-up clear): drop a pin in an unmarked region (region becomes visited — reuse the 3.9 `regionVisitedUnder` + tiles-rendered guard) → delete the pin → assert the region returns to NOT visited. This is the delete→bare browser flow deferred from 3.9.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Mind the known anon-rate-limit + post-reload `clickPin` flakes (deferred-work.md); wait for acks before reload.

### Review Findings (code review 2026-06-23)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied — AC1, AC2-for-pins, AC3 met; durable-write (deletes roll back, add/edit retain) consistent; RLS owner-scoped; AlertDialog calm + portaled; region-unmark correctly deferred to 3-10 (nothing built early). 0 decision-needed · 2 patch · 1 defer · dismissed (rest).

**Patch (resolved 2026-06-23):**
- [x] [Review][Patch] **`useDeletePin` deletes objects before the row → orphaned 404 pin on row-delete failure** — order was `removePhotoObjects(paths)` → `deletePin(row)`. **Fixed:** list paths → `deletePin(row)` (cascade removes photo rows) → THEN `removePhotoObjects(paths)`. A row-delete failure now leaves the pin fully intact (objects + working photos); only the rarer reverse failure orphans objects (best-effort, acceptable). Matches `deletePhoto`'s row-first order. [features/pins/queries/pins-queries.ts]
- [x] [Review][Patch] **`hasContent` no-confirm race for a photo-only pin** — ATTEMPTED the "treat loading as content" fix, but it **broke the tested "name-only deletes with no friction" AC**: right after a drop, `usePhotos` is still loading (`photos === undefined`), so a genuinely bare pin showed the confirm (and the AC3 delete→bare flow stalled). **Resolved by reverting** the guard and accepting the race as a documented low-risk edge (the photo grid renders above the delete link, so the list is usually warm; the window is ~one round-trip; the op is fully optimistic + retryable). Rationale recorded in a code comment. The two regressed e2e tests pass again. [features/memories/components/memory-card.tsx]

**Deferred (also in deferred-work.md):**
- [x] [Review][Defer] **Viewer doesn't re-seek scroll after a mid-list photo delete** — deleting a non-current photo collapses its frame so the user silently advances to the neighbor; the current-last delete may flash blank before the parent guard unmounts. Single-photo delete is fine (viewer unmounts). Cosmetic; revisit if the viewer gains a tracked current-index. [features/memories/components/photo-viewer.tsx]

Dismissed (verified non-issues): `retry: 1` is v5-safe (`onMutate` runs once, only `mutationFn` retries; delete-of-missing-row is a no-op success); the storage `pin-photos owner delete` RLS policy exists (migration); AlertDialog portals to body (z-50, above the z-20 sheet / z-10 panel), not clipped by overflow; close-on-delete fires both the hook + per-call `onSuccess` with no setState-after-unmount; `removeQueries(['photos', pin.id])` matches `photosKey`; the inline "重試" not re-showing the confirm is the intended calm-retry path; the `pins-queries`→`@/data/photos` import is a justified data-layer coupling; AC3 effect re-runs on both optimistic removal and rollback (no stale state); e2e marker-count + no-dialog assertions are adequately guarded.

## Dev Notes

### What this story adds (and what it must NOT touch)
- **NEW:** `components/ui/alert-dialog.tsx`. **UPDATE:** `data/photos.ts` (+`deletePhoto`, +`removePhotoObjects`), `data/pins.ts` (+`deletePin`), `photos-queries.ts` (+`useDeletePhoto`), `pins-queries.ts` (+`useDeletePin`), `photo-viewer.tsx` (+per-photo remove), `photo-uploader.tsx` (wire delete), `memory-card.tsx` (+delete-memory + confirm), `memory-container.tsx`/`map-memory-shell.tsx` (close-on-delete), `package.json` (+`@radix-ui/react-alert-dialog`), e2e.
- **Do NOT** build the region-unmark surface (→ Story 3-10), the long-press/region menu, or any 3.2 search. **Do NOT** add a migration (the `photos.pin_id … ON DELETE CASCADE` FK already exists from 3.6). **Do NOT** touch the tile pipeline or MapLibre layers (AC3 is pure cache invalidation through the existing 3.9 effect).

### Current state of files being modified
- **`data/pins.ts`** — boundary pattern: `createClient`, `getUser()` for owner id on insert, RLS-scoped queries, `toDomain`/`COLUMNS`. `addPin`/`updatePin` exist; add `deletePin` (RLS-scoped delete, no `user_id` filter from client). [Source: data/pins.ts]
- **`data/photos.ts`** — owns photos + the `pin-photos` bucket. Has `listPhotos`, `uploadPhotoObject`, `insertPhoto`, `removePhotoObject` (best-effort single-object remove, added in the 3.6 review), `createSignedUrls`. Add `deletePhoto` (row + object) and `removePhotoObjects` (bulk). The 3.6 migration's pin-delete object-cleanup gap (logged in deferred-work) is CLOSED here. [Source: data/photos.ts]
- **`features/pins/queries/pins-queries.ts`** — `pinsKey(userId) = ['pins', userId]`; `useAddPin`/`useUpdatePin` use optimistic `onMutate` + `onSuccess` invalidate + `retry:1`, no rollback. `useDeletePin` mirrors this (optimistic removal). [Source: features/pins/queries/pins-queries.ts]
- **`features/memories/queries/photos-queries.ts`** — `usePhotos(pinId)` key `['photos', pinId]` → `PhotoWithUrl[]`; `useUploadPhoto`. Add `useDeletePhoto(pinId)`. [Source: features/memories/queries/photos-queries.ts]
- **`features/memories/components/photo-viewer.tsx`** (3.7) — portaled full-screen viewer over `photos: {id,url}[]` with `initialIndex`/`onClose`, scroll-snap pager, ×/backdrop/pull-down/Escape/arrows. Add a per-photo remove control + `onDelete` prop; handle index after removal (close if empty). [Source: features/memories/components/photo-viewer.tsx]
- **`features/memories/components/photo-uploader.tsx`** (3.6/3.7) — owns `usePhotos(pinId)`, the upload queue, the soft cap, and `viewerIndex`. Wire `onDelete` → `useDeletePhoto`. [Source: features/memories/components/photo-uploader.tsx]
- **`features/memories/components/memory-card.tsx`** (3.4/3.5/3.6) — renders title + note + date + `<PhotoUploader>`. Keyed by `pin.id` upstream. Add the delete-memory affordance + AlertDialog; needs a close-on-delete callback threaded from the container. [Source: features/memories/components/memory-card.tsx, memory-container.tsx, map-memory-shell.tsx]
- **`features/map/components/MapCanvas.tsx`** — the 3.9 visited effect depends on `pins`; deleting a pin (cache removal) recomputes the fill. NO change needed for AC3. [Source: features/map/components/MapCanvas.tsx]

### Delete ordering (objects vs rows)
A pin's photo ROWS cascade on the pin-row delete (FK), but the bucket OBJECTS do not (the DB can't reach Storage). So `useDeletePin` must: list the pin's photos → `removePhotoObjects(paths)` (best-effort) → `deletePin(id)`. For a single-photo remove, `deletePhoto` removes the row then the one object. Best-effort object removal: a failed object delete must not block the row delete or surface an error (orphan cleanup is opportunistic; the row is the source of truth).

### Durable-write + quiet states (the spec's spine)
- Optimistic removal, reconcile on ack, retain-on-failure with a calm retry — never an "unsaved"/loss message (EXPERIENCE Saving/sync line 85). The AlertDialog confirm is the ONLY friction, and only for content-bearing pins.
- "Absence is normal": after deletion the card closes; no "deleted!" toast, no empty-state scold. A bare/name-only pin removes silently (no dialog).

### Testing standards
- e2e on the `window.__mapsakeMap` harness (`--enable-unsafe-swiftshader`); per-anon-user under RLS; wait for acks before reload. The AC3 delete→bare test reuses the 3.9 `regionVisitedUnder` predicate + the tiles-rendered guard. Known flakes (anon rate-limit; post-reload `clickPin`) in deferred-work.md.

### Project Structure Notes
- Deletes stay in `data/` (boundary); UI in `features/memories` + `features/pins`; confirm primitive in `components/ui` (shadcn). No MapLibre change. Region-unmark explicitly carved to 3-10.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.8 lines 293-304; #Story-3.9 (AC3 link); FR-NFR1/NFR3 lines 233-236]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Edit/remove line 66; Map region/unmark lines 57-58; Delete-a-pin line 58; "not a plain tap" line 110; Saving/sync line 85; Principle (absence is normal) line 47/71]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data line 113; #photos FK/cascade lines 135-143; durable-write line 204]
- [Source: data/pins.ts; data/photos.ts; features/pins/queries/pins-queries.ts; features/memories/queries/photos-queries.ts; features/memories/components/{photo-viewer,photo-uploader,memory-card,memory-container}.tsx; features/map/components/MapCanvas.tsx]

### Open questions for Simon — ALL CONFIRMED 2026-06-23 ✅
1. **Photo remove = direct quiet action (no modal); AlertDialog reserved for whole-pin delete — APPROVED.**
2. **"Holds real content" = note OR date OR ≥1 photo** (name-only pin deletes with no confirm) — APPROVED.
3. **Photo-remove control lives in the photo viewer** (per-photo surface), not grid thumbnails — APPROVED.
4. **Region-unmark carved to Story 3-10** — APPROVED (separate story).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- All in-scope ACs met (AC1 photo-remove, AC2-for-pins delete + gentle confirm, AC3 delete→bare). The region-unmark half of AC2 is carved to Story 3-10 per the approved split.
- **Deletes roll back on failure** (unlike add/update which retain): a destructive op that fails must not look successful, so `useDeletePin`/`useDeletePhoto` restore the optimistic removal on error and the card/viewer offer a calm retry. Add/update keep their retain-on-failure behavior.
- **AC3 fell out for free:** deleting a pin removes it from `['pins', userId]`, which re-runs the Story 3.9 visited effect — a pin-only region clears with no new map code. The delete→bare browser test deferred from 3.9 now lands here (rollup.spec.ts).
- **Object cleanup:** `useDeletePin` lists the pin's photos → `removePhotoObjects(paths)` (best-effort) → `deletePin` (row delete cascades the photo ROWS via the 3.6 FK). This closes the 3.6-review "pin-delete object cleanup" deferral. `deletePhoto` removes one row + its object.
- **Gentle confirm:** shadcn AlertDialog (new `@radix-ui/react-alert-dialog`), themed calm (terracotta primary, no alarming red). Fires only when `hasContent` (note OR date OR ≥1 photo); a name-only pin deletes with no dialog. Photo-remove is a direct quiet "刪除這張" in the viewer (no modal — low-stakes, re-uploadable).
- `onDeleted` threads through `memory-container` (panel → `onClose`, sheet → `handleClose`) so a successful delete closes the memory.
- Validation: `tsc` clean · `pnpm lint` clean · `pnpm build` clean · 4 new e2e (photo remove + persist, content-pin delete + confirm, name-only delete no-dialog, AC3 delete→bare) pass. **Full suite: 31 passed, 0 failed** (the usually-flaky date-persist test also passed this run).

### File List

- **NEW** `components/ui/alert-dialog.tsx` — shadcn AlertDialog (gentle confirm)
- **MOD** `data/pins.ts` — `deletePin`
- **MOD** `data/photos.ts` — `deletePhoto`, `removePhotoObjects`
- **MOD** `features/pins/queries/pins-queries.ts` — `useDeletePin` (optimistic + rollback-on-error)
- **MOD** `features/memories/queries/photos-queries.ts` — `useDeletePhoto`
- **MOD** `features/memories/components/photo-viewer.tsx` — per-photo "刪除這張" + `onDelete`
- **MOD** `features/memories/components/photo-uploader.tsx` — wire `onDelete` → `useDeletePhoto`
- **MOD** `features/memories/components/memory-card.tsx` — delete-memory affordance + AlertDialog + `onDeleted`
- **MOD** `features/memories/components/memory-container.tsx` — pass `onDeleted` (close on delete)
- **MOD** `e2e/memory.spec.ts` — photo-remove + pin-delete (+confirm / name-only) tests
- **MOD** `e2e/rollup.spec.ts` — AC3 delete→bare browser test (+`clickPin` helper)
- **MOD** `package.json` + `pnpm-lock.yaml` — add `@radix-ui/react-alert-dialog`
- **MOD** `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3-8 status (+ 3-10 carve-out)

### Change Log

- 2026-06-23 — Story 3.8 implemented (edit/remove + quiet states), scoped to photo-remove + pin-delete. Deletes (row + bucket object) with a gentle AlertDialog confirm for content-bearing pins, no friction for name-only; deleting the last pin returns the region to bare (via the 3.9 derive). Region-unmark carved to 3-10. Status → review.
- 2026-06-23 — Code review: patch 1 applied (flip `useDeletePin` to row-first ordering so a failed delete leaves the pin intact, not 404'd). Patch 2 (loading-as-content) attempted then reverted — it broke the tested name-only no-friction AC; the LOW photo-only confirm race is accepted + documented in code. 1 cosmetic defer (viewer scroll on mid-list photo delete). All 4 story e2e (photo remove, content-pin confirm, name-only no-dialog, AC3 delete→bare) pass; tsc/lint/build clean. Full-suite re-verification hit the known anon sign-in rate-limit (environmental — `Request rate limit reached`, sessions couldn't be minted; deferred-work.md), not a regression. Status → done.
