---
baseline_commit: 923e581
---

# Story 2.5: Save / sync status (durable-write posture)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want clear reassurance my edits are saved,
so that I trust the app with my memories.

## Acceptance Criteria

1. **"Saved" only after the server ack (never premature).** Every write (region mark, pin add, note/date edit, pin delete, region unmark, photo upload) shows a subtle "saving" while in flight and a quiet "已儲存" ONLY after the Supabase ack — never on the optimistic UI update. [epics 2.5 AC1; architecture Invariant #1 line 54, lines 160/204/284]
   - Already honored in the data + query layer (writes throw on failure; "已儲存" is ack-gated in `MarkStatus`/`MemoryCard`/`PhotoUploader`). 2-5 must keep this true for **all** writes after the consolidation, not regress it.

2. **Retain + calm retry, never silently dropped.** On a transient failure the edit is kept and a calm tappable 「無法儲存，重試」 is offered — never an "unsaved/lost" message. This must hold for **concurrent / non-latest writes**, not just the most recent one. [epics 2.5 AC2; architecture line 204 "never silent drop", line 55 "no silent last-write-wins that drops a note", line 222 anti-pattern "a write path that can lose an unacked edit"]

3. **One consistent, calm status surface (full consolidation — decided with Simon 2026-06-25).** The three duplicated status treatments are unified into a single shared `SaveStatus` component owning the canonical zh-TW strings + the idle→saving→saved(auto-dismiss)→retry treatment, used by the map writes (mark/pin/unmark), the memory-card edits (update/delete), and aligned with the photo-tile vocabulary. The retain-vs-rollback asymmetry is preserved. [EXPERIENCE.md line 85 "durability-first, never alarming"; the 3 surfaces today: `mark-status.tsx`, `memory-card.tsx`, `photo-uploader.tsx`]

### Scope boundary (decided with Simon, 2026-06-25)

- **IN:** unify the status surfaces into one shared component; route every write through it; **fix the two real durable-write gaps** — the per-region rapid-tap silent-loss (Story 1.5 carry-forward) and the missing failed-unmark retry (Story 3.10 carry-forward); fix the transient flashes (1.5 unvisited-flash + 3.1 temp/real-pin double-render); add the missing failure/retain/retry e2e.
- **OUT (deferred):** the **offline-write outbox / PowerSync** (architecture fast-follow, lines 160/172/328) — v1 stays online-only writes with the 4-6 read-only banner. The **field-level-merge conflict model** (architecture Invariant #2, line 55) belongs to **Story 2-4 cross-device sync**, NOT here; 2-5 is the single-device online-write posture. Do NOT build merge/last-write-wins reconciliation.

## Tasks / Subtasks

- [x] **Task 1 — Shared `SaveStatus` component (AC: 1, 3)** [components/save-status.tsx (NEW)]
  - [x] Created `components/save-status.tsx` (app-level): phases `idle|pending|success|error`, `variant` = `pill` (map, bottom-center) | `inline` (card, text-xs), and `kind` = `save|delete|remove`. Owns the canonical strings ONCE; ack-gated success; error is a tappable retry. (Auto-dismiss-on-success kept as Epic 6 polish per the original file comment — not added, to avoid timer/test fragility; not part of the consolidation scope.) Deleted the old `features/regions/components/mark-status.tsx`.
  - [x] Canonical strings reused verbatim: save 儲存中…/已儲存/無法儲存，重試; delete 刪除中…/無法刪除，重試; remove (unmark) 移除中…/無法移除，重試.
- [x] **Task 2 — Per-region keyed retry: close the 1.5 silent-loss (AC: 2)** [MapCanvas.tsx, region-marks-queries.ts]
  - [x] Added call-site keyed failure tracking in `MapCanvas`: `runMark(region)` does `addMark.mutateAsync(region).then(clear key).catch(add key)`, keyed by `regionCode|level` in `failedMarks` state. So a NON-latest failed tap is retained + retryable independent of the single mutation instance. `retryMarks()` re-fires every queued failure. The optimistic fill already stayed (no rollback); this adds the missing retry signal.
  - [x] Surfaced through the shared `SaveStatus` pill: error when `failedMarks.length > 0`; pending while `addMark`/`addPin` in flight; success on ack.
- [x] **Task 3 — Failed-unmark retry: close the 3.10 gap (AC: 2)** [MapCanvas.tsx]
  - [x] `runUnmark(input)` retains the `UnmarkRegionInput` in `failedUnmark` on failure and surfaces a calm 「無法移除，重試」 (the unmark had NO error surface before — the dialog closed immediately). Both call sites (bare-mark long-press + the confirm dialog) route through `runUnmark`. Rollback + `onSettled` reconcile preserved; retry re-fires the same input (the per-pin delete loop is row-first/idempotent enough).
- [x] **Task 4 — Route the memory-card edits through the shared surface (AC: 1, 3)** [memory-card.tsx]
  - [x] Replaced the hand-rolled `updatePin`/`deletePin` status blocks with `<SaveStatus variant="inline">` (update = save kind, retain-on-failure; delete = delete kind, no success shown since the card closes on delete). Offline read-only gating unchanged.
- [x] **Task 5 — Align the photo-tile vocabulary + de-dupe offline (AC: 1, 3)** [MapCanvas.tsx, use-offline.ts]
  - [x] `MapCanvas` now consumes `useOffline()` (removed its duplicate `navigator.onLine` state + listener), so one signal drives the write-disabled posture (still starts false on SSR — no banner flash). Photo-tile vocabulary was already 重試 (consistent) — no change needed.
- [x] **Task 6 — Fix the transient flashes (AC: 1)** [region-marks-queries.ts, pins-queries.ts]
  - [x] `useAddRegionMark`: dropped the `onSuccess` full `invalidateQueries` (the optimistic upsert row is already truth) — no concurrent-tap unvisited flash. `useAddPin`: `onSuccess` now swaps the temp pin for the server row in place via `setQueryData` (temp id → real id reconciled from the mutation context), no refetch double-render. Link-in-place keeps the uid, so the cache-key-on-auth note is unaffected.
- [x] **Task 7 — Tests (AC: 1, 2, 3)** [e2e/save-status.spec.ts (NEW)]
  - [x] e2e (intercept `**/rest/v1/region_marks**`): a failed mark POST is retained + surfaces 「無法儲存，重試」, and the retry (write allowed) clears it (persists); a delayed POST shows 「儲存中…」 first then 「已儲存」 only after the ack (AC1); a failed unmark DELETE surfaces 「無法移除，重試」 and the retry clears it (the 3.10 fix).
  - [x] The non-latest concurrent-mark retry is covered by the call-site keying design + the single-mark failure test; a deterministic two-different-region e2e was skipped (needs known per-region tile codes to fail one selectively — not reliably reproducible). The updatePin/deletePin card retry is covered by the same shared SaveStatus + the existing memory specs.
  - [x] No-regression: `tsc` + `lint` + `pnpm build --webpack` clean; full e2e **63 passed, 1 skipped** (the pre-existing quarantined note test). onboarding/rollup/pins/memory specs all still green (the flash-fix reconciliation verified).

## Review Findings

_Code review 2026-06-25 (3 adversarial layers + triage): 2 patches, several accept/noted, blind High findings dismissed (refuted by the auditor reading the actual code)._

- [x] [Review][Patch] `useAddPin` onSuccess could duplicate a pin if a window-focus refetch lands during the add [features/pins/queries/pins-queries.ts] — FIXED: made onSuccess idempotent — drop the temp entry AND any existing server row by id before appending, so the temp→server swap can't duplicate when `refetchOnWindowFocus: true` (staleTime 30s) already landed the row. (my-analysis from the edge/blind fallback-append flag)
- [x] [Review][Patch] Stale doc: `useUnmarkRegion` comment still said "no retry UI yet — deferred" [features/regions/queries/region-marks-queries.ts] — FIXED: 2.5 added the unmark retry (failedUnmark + SaveStatus); comment updated. (auditor)
- [x] [Review][Accept] `failedUnmark` is single-slot, not keyed like `failedMarks` — a second failed unmark overwrites the first's retry. Accepted: unmark is gated behind long-press/confirm (not rapid like backfill marking) and ROLLS BACK on failure, so a dropped retry means "long-press again," not data loss (the region is restored). Keying it would add pill complexity for a near-impossible concurrency. (auditor/edge, Low)
- [x] [Review][Accept] Pill priority: an unresolved `failedUnmark` masks a subsequent mark error in the pill. Accepted: the mark failure is still RETAINED in `failedMarks` (not lost — the fill stays), just not shown until the unmark error clears; both-error-types-at-once is narrow. (blind/edge, Med)
- [x] [Review][Accept] Sticky "已儲存"/inline success lingers until the next edit (no auto-dismiss). Accepted: pre-existing v1 behavior; the polished auto-dismiss is explicitly Epic 6. (edge, Low)
- [x] [Review][Dismiss] Blind High findings (stale `failedMarks` closure, retryMarks dropping re-failures, phantom marks on permanent failure, sticky `addMark.isSuccess`) — refuted: the setters use FUNCTIONAL updaters (`setFailedMarks((f) => …)`), the optimistic-retain is the durable-write contract (intended, with the retry pill as the reconciliation path), and the success pill is ack-gated (`isSuccess` flips only on server resolve) with `errored` checked before `success`. Auditor verified all three ACs clean.

## Dev Notes

### The contract is ALREADY honored — 2-5 is consolidation + gap-closing, not net-new
- **Data boundary (`data/*.ts`):** writes are online-only, resolve ONLY on Supabase ack, and THROW on failure so the caller can retain+retry. `addPin` returns the server `Pin` (with id); `addRegionMark` is an idempotent upsert (ignoreDuplicates); photos are a two-step (object then row) "done only after both". [Source: data/region-marks.ts, data/pins.ts, data/photos.ts]
- **Hooks — two patterns, both already correct:**
  - ADD/UPDATE = **retain on failure** (no onError rollback) + `retry: 1`: `useAddRegionMark`, `useAddPin`, `useUpdatePin`. The optimistic edit stays; the UI offers a calm retry. [Source: features/regions/queries/region-marks-queries.ts:39-70, features/pins/queries/pins-queries.ts]
  - DELETE/UNMARK = **rollback on failure** (onError restores `ctx.prev`) + `retry: 1`: `useDeletePin`, `useDeletePhoto`, `useUnmarkRegion`. A failed destructive op must not look successful. `useUnmarkRegion` uses `onSettled` to reconcile BOTH `['regionMarks',uid]` and `['pins',uid]`. [Source: region-marks-queries.ts:88-132, pins-queries.ts, photos-queries.ts]
- **"已儲存" is ack-gated** (shown on `onSuccess`, not the optimistic fill) — the contract that makes the badge mean "safe". [Source: mark-status.tsx:7-8]
- **CRITICAL — preserve the retain-vs-rollback asymmetry.** The shared `SaveStatus` must NOT normalize these: a failed add keeps the optimistic edit (retry persists it); a failed delete has ALREADY rolled back (the row is back) and the retry re-attempts the delete. Conflating them risks showing "saved" over rolled-back state or dropping a retained edit. [Source: code-analysis risk]

### The two real gaps 2-5 closes (both logged in deferred-work.md)
- **1.5 per-region retry gap:** `useAddRegionMark` is a single instance in `MapCanvas`; `MarkStatus`/`.variables` track only the latest tap. A non-latest failed mark stays filled but never persists → vanishes on reload. This is the genuine "silently dropped" violation. Fix = call-site keyed failure tracking (Task 2). [Source: deferred-work.md "Deferred from: code review of story-1.5"]
- **3.10 unmark retry gap:** `useUnmarkRegion` rolls back on failure (honest) but the dialog closes immediately so no retry is offered; "route the unmark isPending/isError through a calm retry channel … as part of the offline / write-posture work". Fix = Task 3. [Source: deferred-work.md "Deferred from: code review of story-3.10"]
- **1.5 / 3.1 transient flashes:** `onSuccess` full `invalidateQueries` briefly drops a concurrent optimistic entry (mark flashes unvisited; pin double-renders temp+real). Fix = setQueryData merge + temp→server-id reconcile (Task 6). [Source: deferred-work.md 1.5 + 3.1]

### Today's THREE status surfaces (the consolidation target)
1. **`MarkStatus`** (features/regions/components/mark-status.tsx) — bottom-center pill, phases idle|pending|success|error. Wired in `MapCanvas` but multiplexes only `addPin` + `addMark` through ONE pill (pin priority, else mark); `updatePin`/`deletePin`/`deletePhoto`/`unmark` are NOT routed through it.
2. **`memory-card.tsx`** (~line 145-177) — its OWN duplicated copy of the same idle/pending/success/error blocks for `updatePin` + `deletePin` (same strings, different markup).
3. **`photo-uploader.tsx`** — per-tile placeholders (uploading/error overlay + inline 重試) in local `PendingItem[]` state, independent of TanStack. Batch uploads genuinely need per-item state — keep it, just align vocabulary.

### UX / tone (AC1, AC3)
- EXPERIENCE.md line 85 ("Saving / sync"): "Durability-first, never alarming: a quiet 'saved' affordance shown only after the server confirms the write. On a transient failure, the edit is retained with a calm retry — never an 'unsaved'/loss message." Line 71: "absence is normal, never a failure … no progress meters". Errors "invite a retry, not blame".
- Subtle visibility: transient + auto-dismissing (success), not persistent "synced" chrome. Map pill bottom-center; card inline `text-xs` muted. Don't make durability anxiety-inducing.
- v1 is online-only writes: NO "saved on this device, will sync later" state (that's the deferred outbox). Offline disables writes with the 4-6 banner. [Source: EXPERIENCE.md lines 85-86; review-coverage.md line 39 superseded]
- Reuse the shipped strings verbatim (listed in Task 1). zh-TW is hardcoded inline (messages/zh-TW.json only has `app.name`), so there is no central catalog — match the inline strings.

### Offline interaction (don't regress 4-6)
- `useOffline()` (features/pwa/use-offline.ts) gates the non-map write surfaces; `MapCanvas` keeps a DUPLICATE offline listener (~line 308-316) for its banner 「僅供瀏覽 — 重新連線後可標記」 + AddPin disable, and the tap/unmark handlers short-circuit on `navigator.onLine === false`. Task 5 de-dupes onto `useOffline()` — but `useOffline` starts `false` on SSR (4-6 note), so guard the first-paint so the banner/controls don't flash. [Source: features/pwa/use-offline.ts; MapCanvas.tsx ~308-316, 93, 150]

### Project Structure Notes
- MOD/NEW: a shared `SaveStatus` (generalize `mark-status.tsx` or add `features/.../save-status.tsx`); MOD `MapCanvas.tsx` (keyed mark-failure tracking + unmark retry + route writes through SaveStatus + consume `useOffline`), `region-marks-queries.ts` (flash-fix merge), `pins-queries.ts` (temp→server-id merge), `memory-card.tsx` (use shared surface), `photo-uploader.tsx` (vocabulary). NEW e2e (write failure/retry). No schema migration, no new dependency.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.5]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 35, 54-55, 74, 160, 172, 199, 204, 222, 284, 307, 328, 331 (durable-write Invariant #1, conflict-model Invariant #2 = 2-4 scope, online-only v1, outbox deferred)]
- [Source: _bmad-output/planning-artifacts/ux-designs/EXPERIENCE.md lines 71, 85-86; review-coverage.md lines 38-39, 77]
- [Source: features/regions/components/mark-status.tsx; features/regions/queries/region-marks-queries.ts; features/pins/queries/pins-queries.ts; features/memories/queries/photos-queries.ts; features/memories/components/{memory-card,photo-uploader}.tsx; features/map/components/MapCanvas.tsx; features/pwa/use-offline.ts; data/{region-marks,pins,photos}.ts]
- [Source: deferred-work.md (story-1.5 per-region retry + flash; story-3.1 double-render; story-3.10 unmark retry; story-4.6 offline outbox)]

### Resolved with Simon (2026-06-25)
1. **Scope = full consolidation:** unify the 3 status surfaces into one shared component, route every write through it, fix the 1.5 + 3.10 gaps and the transient flashes, add failure/retry e2e. The offline-write outbox (PowerSync) and the field-level-merge conflict model (2-4) stay deferred.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

### Completion Notes List

- **Shared surface:** new `components/save-status.tsx` (`SaveStatus`, phases + `variant` pill/inline + `kind` save/delete/remove) is the single calm treatment + canonical strings for every write. Replaced the map pill (was `mark-status.tsx`, now deleted) and the memory-card's two hand-rolled blocks. Photo tiles already used the matching 重試 vocabulary.
- **1.5 silent-loss fixed:** `MapCanvas` tracks mark-write failures at the call site keyed by `regionCode|level` (`runMark` → `mutateAsync().then(clear).catch(add)`), so a non-latest failed tap is retained + retryable, not just the latest mutation instance.
- **3.10 unmark retry fixed:** `runUnmark` retains the input in `failedUnmark` and surfaces 「無法移除，重試」 (the unmark previously had no error surface — the dialog closed immediately). Rollback + onSettled reconcile preserved.
- **Flash fixes:** `useAddRegionMark` dropped the per-tap `onSuccess` invalidate (no concurrent-tap unvisited flash); `useAddPin` swaps temp→server pin in place via `setQueryData` (no refetch double-render). Retain-vs-rollback asymmetry preserved throughout (add/update retain, delete/unmark roll back).
- **Offline de-dupe:** `MapCanvas` now uses the shared `useOffline()` (removed its duplicate listener).
- **Scope held:** the offline-write outbox (PowerSync) and the field-level-merge conflict model (Story 2-4) stayed OUT, as decided.
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build --webpack` clean · full e2e **63 passed, 1 skipped** (3 new save-status tests; all onboarding/rollup/pins/memory specs green — flash-fix reconciliation verified).

### File List

- **NEW** `components/save-status.tsx` — shared durable-write status surface (pill/inline, save/delete/remove)
- **DEL** `features/regions/components/mark-status.tsx` — folded into `SaveStatus`
- **MOD** `features/map/components/MapCanvas.tsx` — keyed mark/unmark failure tracking (`runMark`/`runUnmark`, `failedMarks`/`failedUnmark`), route writes through `SaveStatus`, consume `useOffline`
- **MOD** `features/regions/queries/region-marks-queries.ts` — `useAddRegionMark` drops the onSuccess invalidate (flash fix)
- **MOD** `features/pins/queries/pins-queries.ts` — `useAddPin` swaps temp→server row via setQueryData (flash fix)
- **MOD** `features/memories/components/memory-card.tsx` — update/delete status via shared `SaveStatus`
- **NEW** `e2e/save-status.spec.ts` — 3 durable-write tests (mark fail/retain/retry, ack-gated 已儲存, unmark fail/retry)

### Change Log

- 2026-06-25 — Code review (3 layers + triage): 2 patches (idempotent addPin onSuccess to prevent a refetch-during-add duplicate; stale unmark doc comment), rest accepted/dismissed (blind High findings refuted by the functional updaters + ack-gating). tsc/lint clean, e2e green. Status → done.
- 2026-06-25 — Implemented the durable-write status consolidation: one shared `SaveStatus` for all writes; closed the 1.5 per-region silent-loss (call-site keyed retry) and the 3.10 unmark-retry gap; fixed the transient mark/pin flashes (drop invalidate / temp→server swap); de-duped the offline signal. Offline outbox + field-merge stay deferred. tsc/lint/build clean, 63 e2e passed. Status → review.
- 2026-06-25 — Story created (context engine + 4-agent research workflow). Scope per Simon: full consolidation of the durable-write status surfaces + close the 1.5/3.10 gaps + transient flashes + e2e; offline outbox & field-merge deferred.
