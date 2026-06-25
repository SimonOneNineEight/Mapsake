# Story 2.5: Save / sync status (durable-write posture)

Status: ready-for-dev

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

- [ ] **Task 1 — Shared `SaveStatus` component (AC: 1, 3)** [features/regions/components/mark-status.tsx → generalize, or a new features/*/components/save-status.tsx]
  - [ ] Generalize the current `MarkStatus` (phases `idle|pending|success|error`, ack-gated 「已儲存」, calm 「無法儲存，重試」) into a reusable `SaveStatus` that owns the canonical strings ONCE and supports a `variant` for the map **pill** (bottom-center, the current treatment) vs an **inline** treatment for the memory card. Fold in the auto-dismiss-on-success that the file comment flagged as "Epic 6" (success shows briefly then clears — keep it calm, no persistent "synced" chrome). Keep `pointer-events-none` on non-interactive phases; the error phase stays a tappable retry.
  - [ ] Canonical strings (reuse verbatim — do NOT invent variants): 「儲存中…」 / 「已儲存」 / 「無法儲存，重試」, and the delete variant 「刪除中…」 / 「無法刪除，重試」, and the inline photo 「重試」.
- [ ] **Task 2 — Per-region keyed retry: close the 1.5 silent-loss (AC: 2)** [features/map/components/MapCanvas.tsx, features/regions/queries/region-marks-queries.ts]
  - [ ] The durable-write RETAIN already holds (`useAddRegionMark` has no onError rollback). The gap is that the single mutation instance only tracks the LATEST tap, so a non-latest failed mark is never surfaced/retried → it stays filled but never persists (silent loss on reload). Fix by tracking failures **at the call site, keyed by `regionCode|level`**: the tap handler does `addMark.mutateAsync(input).catch(() => recordFailedMark(input))`; a small `failedMarks` map (keyed) drives a retry. Retry re-fires `addMark.mutateAsync(failed)` and clears the key on success. This makes every failed mark ret(ain)+retryable regardless of order, without a global store.
  - [ ] Surface those failures through the shared `SaveStatus` (the map pill). When ≥1 mark write is failed, show the retry; while any is in flight, show 「儲存中…」; on ack, 「已儲存」 then auto-dismiss.
- [ ] **Task 3 — Failed-unmark retry: close the 3.10 gap (AC: 2)** [features/map/components/MapCanvas.tsx, region-marks-queries.ts useUnmarkRegion]
  - [ ] Today the `RegionRemoveDialog` closes immediately on confirm (`setPendingUnmark(null)`), so `useUnmarkRegion`'s `isError` is never shown — a failed unmark rolls back (honest) but offers no retry. Fix: on unmark failure, surface a calm retry via the shared `SaveStatus` (re-fire the same `UnmarkRegionInput`). Keep the rollback + the `onSettled` reconcile (don't double-fire the per-pin delete loop on retry — the delete loop is idempotent enough but verify). Preserve the destructive-confirm and the offline-disable.
- [ ] **Task 4 — Route the memory-card edits through the shared surface (AC: 1, 3)** [features/memories/components/memory-card.tsx]
  - [ ] Replace the hand-rolled `updatePin` / `deletePin` 儲存中…/已儲存/無法儲存，重試 / 無法刪除，重試 blocks with the shared `SaveStatus` (inline variant). Keep update = retain-on-failure, delete = rollback-on-failure (the asymmetry). Preserve the offline read-only gating (`useOffline()` → 「僅供瀏覽 — 重新連線後可編輯」).
- [ ] **Task 5 — Align the photo-tile vocabulary + de-dupe offline (AC: 1, 3)** [features/memories/components/photo-uploader.tsx, features/map/components/MapCanvas.tsx, features/pwa/use-offline.ts]
  - [ ] Keep per-tile placeholders (batch uploads need per-item state) but align the uploading/error/retry vocabulary + retry affordance with the shared treatment so it reads consistently.
  - [ ] Have `MapCanvas` consume `useOffline()` instead of its own duplicate `navigator.onLine` useState/listener (~line 308-316), so one signal drives the write-disabled posture (mind the 4-6 SSR-starts-false first-paint note — don't flash the banner).
- [ ] **Task 6 — Fix the transient flashes (AC: 1)** [region-marks-queries.ts useAddRegionMark, features/pins/queries/pins-queries.ts useAddPin]
  - [ ] 1.5 unvisited-flash + 3.1 temp/real double-render: replace the `onSuccess` full `invalidateQueries` with a `setQueryData` merge of the acked row, so a concurrent in-flight write's optimistic entry isn't dropped by a refetch. **For pins this MUST reconcile the temp UUID → the server-returned `Pin` (id, created_at)** so the cache doesn't desync (the 3.1 double-render). For marks the optimistic row is already shape-correct (idempotent upsert) — merge/keep it without a disruptive refetch. Verify against the "pins cache key on auth change" note (link-in-place keeps the uid, so unaffected here).
- [ ] **Task 7 — Tests (AC: 1, 2, 3)** [e2e + any unit]
  - [ ] e2e (intercept the PostgREST write endpoints to force a transient failure, then succeed on retry): a failed region mark **retains** the fill AND surfaces 「無法儲存，重試」; tapping retry persists it (assert it survives a reload). A **non-latest** failed mark among rapid taps is independently retryable (the 1.5 fix). A failed unmark surfaces a retry (the 3.10 fix). A failed `updatePin`/`deletePin` shows the calm retry in the card (update retains, delete rolled back but offers retry).
  - [ ] No "已儲存" appears before the ack (intercept + delay the write, assert 「儲存中…」 shows first, 「已儲存」 only after the fulfilled response).
  - [ ] No-regression: full e2e suite green; `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build --webpack` clean. Re-confirm the existing onboarding/rollup/pins/memory specs (the flash-fix touches reconciliation).

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-06-25 — Story created (context engine + 4-agent research workflow). Scope per Simon: full consolidation of the durable-write status surfaces + close the 1.5/3.10 gaps + transient flashes + e2e; offline outbox & field-merge deferred.
