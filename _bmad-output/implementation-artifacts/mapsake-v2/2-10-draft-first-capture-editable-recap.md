---
baseline_commit: 9a22cb4308cdadf9cafbd2cbf77c3bbba1fcbb64
---

# Story 2.10: Draft-first capture + editable recap

Status: done

## Story

As someone logging a trip,
I want to review and edit everything I captured before it's saved, with the recap acting as the confirmation,
So that a mistake (wrong place, wrong date, unwanted photo) never lands on my map, and nothing is written until I say so.

This reopens the Epic 2 capture flow after Simon's 2026-07-20 simulator pass. Decision (Simon): **draft-first — collect everything in memory through the loop, commit only at the recap.**

## Acceptance Criteria

**AC1 — No write until the recap confirm.** Completing a place (上傳 or 不加照片，直接記錄) writes NOTHING to the database. It appends a complete in-memory draft (placement + date + note + photo refs) to the session. The DB write happens once, when the user taps the recap's confirm (看看地圖).

**AC2 — The recap is an editable confirmation.** The recap lists every drafted place. The user can (a) edit a place's name, date, and note, (b) add/remove its photos, and (c) remove the place entirely, all before committing. Removing the last place leaves an empty recap with a calm way out (no crash, no orphaned commit).

**AC3 — Commit writes the whole batch, merge-correct.** On confirm, each draft is written via the Story 2.3 create-visit path (new pin, or an additional visit onto a proximity-matched pin). The merge is **batch-aware**: two drafts at the same place (within the ~150m radius) in one session collapse onto ONE pin (the first creates it, the rest become additional visits) — re-logging the same place mid-trip must never produce two pins. Approximate (region-record) drafts are excluded from the merge, exactly as at fine-tune.

**AC4 — Commit is atomic-enough and retry-safe.** A partial failure (network drop mid-batch) leaves the recap intact with a calm 儲存中/未能儲存 state and a retry that resumes WITHOUT duplicating already-written pins/visits/photos (per-draft committed-state + per-ref stable photo-id + uploaded set, the Story 2.5 idempotency lifted to the batch). On full success the session resets and the map refreshes to show the new pins.

**AC5 — Loop-cancel returns to the recap, not the void.** After 記錄下個地點, canceling the place search returns to the recap when the session already has drafts (never dismisses the whole flow, losing the trip). Canceling the very first search (no drafts yet) still dismisses calmly.

**AC6 — Save-moment copy tells the truth.** The per-place moment no longer says 已儲存 (nothing is saved yet). It acknowledges the place was **added to this trip** (a new FR28 candidate). The felt "saved" confirmation belongs after the commit.

**AC7 — Fix: picked photos preview immediately.** In the photo step, a photo chosen via ＋其他照片 (the picker) shows a thumbnail right away, even when there are zero date-suggestions. (Today the grid only renders `suggestions`, so a picked photo that isn't a suggestion is invisible though the count rises — the bug in Simon's #6.)

**AC8 — Fix: the note captures and persists.** Text typed in the note field (including zh-TW) renders as it's typed and survives into the draft and the committed row. (Simon's #6/#7: the note appeared not to render or save.)

## Tasks / Subtasks

- [ ] **T1 — `PlaceDraft` value type (MapsakeModels).** A complete, editable captured place: `id`, `placement: ResolvedPlacement`, `date: CalendarDate?`, `note: String?`, `photoRefs: [PhotoAssetRef]`. Sendable/Equatable/Identifiable. Unit-test round-trip + equality.
- [ ] **T2 — `CaptureSession` holds `[PlaceDraft]` (MapsakeModels).** Replace `[CaptureLogEntry]` with drafts. `append(_:)`, `update(_:)` (by id), `remove(id:)`, `reset()`; derive `lastDate` from the newest DATED draft; expose recap-row data (place · date · photo count) from drafts. Keep the existing "only a dated place advances the carried date" rule. Update `CaptureSessionTests`.
- [ ] **T3 — Photo step becomes a draft collector (MapsakeModels + app).** `PhotoStepViewModel` drops the `CaptureWriter` and the write (`createVisitIfNeeded`/`uploadRemaining`); `save()`/`skipPhotos()` now build a `PlaceDraft` (placement + date + trimmed note + selected refs) and hand it back. Keep the selection/auth/suggestions/cap logic. Update its tests to assert the produced draft (not a write).
- [ ] **T4 — `CaptureCommitter` (MapsakeModels).** The batch write: given `CaptureWriter`, `PhotoSource`, and the live pins/visit-counts, fold over the session's drafts. For each, compute the proximity match against live pins ∪ pins created earlier in THIS batch (via `VisitedMatcher.match`, approximate excluded), route to `CaptureWritePlanner`, create the pin/visit, then upload+insert each photo ref (lowercased path, stable per-ref photo-id, skip-unpreparable-calmly). Track committed state so a retry resumes. Expose `.idle/.committing/.done/.failed(retryable)`. Heavily unit-tested against `FakeCaptureWriter` + a fake `PhotoSource`: batch merge (two same-place drafts → one pin + one additional visit), approximate stays its own pin, partial-failure retry doesn't duplicate.
- [ ] **T5 — Photo step preview + note fixes (app).** Add a selected-photos preview strip that renders `model.selected` thumbnails regardless of suggestions (AC7), with per-photo deselect. Ensure the note `TextField` binds and renders typed text in `Color.Mapsake.ink` and flows into the draft (AC8). 
- [ ] **T6 — Editable recap (app).** `RecapScreen` lists drafts with edit (name/date/note + add/remove photos, reusing PhotoPicker + a DatePicker) and remove. The confirm button triggers the committer; show 儲存中 while committing, a calm 未能儲存 + 再試一次 on failure, and on success dismiss to the map. Empty-recap state handled.
- [ ] **T7 — Wire the flow + loop-cancel (app, MapScreen).** Photo step `onSaved` appends the draft to the session and routes to the save moment (no map reload — nothing's written). Save moment loops or finishes to recap. Search `onCancel` returns to `.recap` when the session has drafts, else dismisses (AC5). Recap confirm runs the committer, then resets + reloads the map. `saveMoment` route no longer carries a `CaptureResult` write outcome (it's a draft ack now).
- [ ] **T8 — Copy (MapsakeDesign, FR28 candidates).** Save-moment 已加入這趟 (or better native phrasing — draft candidate, Simon blesses) replacing 已儲存 in this flow; recap edit/remove affordance labels; 儲存中 / 未能儲存 / 再試一次 for the commit. All `needs_review` + `CANDIDATE:`.
- [ ] **T9 — Verify.** `swift test` (MapsakeKit) green incl. the new committer/draft/session tests; `xcodebuild build` + `test -scheme Mapsake`; `swiftlint lint` exit 0.

## Dev Notes

**Current state being changed (read before editing — architecture line 122, Story 2.3/2.5/2.6):**
- `PhotoStepViewModel.commit()` today performs the terminal write: `createVisitIfNeeded` (pin/visit) + `uploadRemaining` (photos), idempotent by ref. This write MOVES to `CaptureCommitter`. Preserve the idempotency design (per-ref stable photo-id, uploaded set, created-id guard) at the batch level.
- `MapScreen.photoStep.onSaved` today records a `CaptureResult`, reloads the map (so the next loop's merge sees the just-saved pin), and routes to the save moment. In draft-first NOTHING is saved mid-loop, so the map reload after each place goes away — but the **batch-aware merge in `CaptureCommitter` now owns the "don't duplicate the same place" guarantee** that the mid-loop reload used to provide (see the comment at MapScreen photoStep onSaved).
- `CaptureWritePlanner.plan(...)` is unchanged — the committer calls it per draft. The proximity match is recomputed at commit against live + batch-created pins (the fine-tune-time `placement.match` becomes advisory; do NOT trust it for the write, or an intra-session duplicate slips through).
- `VisitedMatcher.match(lat:lng:pins:additionalVisitsByPin:within:)` (MapsakeModels, pure) is the matcher to reuse in the committer. Feed it the running pin list (live ∪ batch), approximate excluded.
- `SaveMomentScreen` copy 已儲存 (`L.saved`) is wrong in this flow. Keep the settle/ripple moment but change the words (AC6). The post-commit success is the new "landed on your map" beat (a brief state before the map, or just the map refresh — keep it calm).

**Boundary rules (unchanged):** the write coordinator + planner + draft + session stay in MapsakeModels (value types, no Supabase/UIKit/PhotoKit). `CaptureWriter`/`PhotoSource` are the seams; `LiveCaptureWriter`/`LivePhotoSource` are app-side. Storage paths lowercased. `CalendarDate` for dates. FR28 candidate gate on every new string.

**Out of scope (2.11):** same place + same DAY merging into one visit, and the undated collection. 2.10's commit does the existing new-pin-vs-additional-visit merge; 2.11 refines what a same-day match does and how undated memories group. Keep the committer's decision point clean so 2.11 can extend it.

**Deferred / accepted:** a crash mid-trip loses the unsaved session (Simon accepted this for draft-first). Offline commit surfaces a calm retry, not a queue.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (dev-story). Code review on Fable 5 (3 adversarial layers).

### Debug Log References

- `swift test` (MapsakeKit) — 84 tests (7 new committer tests: new-pin+photos, additional-visit, **batch-merge two-same-place→one-pin**, approximate isolation, resumable retry, skip-unpreparable, empty; draft-collector + session draft tests). Green.
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED** (post-review). Full simulator suite green.
- `swiftlint lint` — exit 0. Candidate strings — 42 (+3 draft-first, +1 retargeted recap.sub).

### Completion Notes List

- **Draft-first architecture.** New `PlaceDraft` (placement + date + note + photo refs) + `CaptureCommitter` (MapsakeModels, value-types only). The photo step (`PhotoStepViewModel`) dropped its `CaptureWriter` and now only `makeDraft(includePhotos:)`; the session (`CaptureSession`) holds `[PlaceDraft]` with append/update/remove; the recap runs the whole batch through the committer at 看看地圖.
- **Batch-aware merge** (`CaptureCommitter.route`): each draft matches against live pins ∪ pins created earlier in the SAME commit, so two same-place drafts collapse to one pin — replacing the mid-loop map reload the old flow used. Approximate drafts always their own pin, excluded from matching. Resumable: per-draft progress (routed flag, createdPin, uploadedRefs, stable per-ref photo-ids) survives a retry.
- **Editable recap** (`RecapEditSheet`): name/date(+toggle)/note/photos edit + remove; empty-recap has a calm 回到地圖. Loop-cancel returns to the recap (session non-empty) else dismisses.
- **Truthful copy:** save moment 已加入這趟 (was 已儲存, a lie pre-commit); recap sub retargeted to 確認後就會留在你的地圖上.
- **Bug fixes:** picked-photo preview strip (renders `selected` regardless of suggestions); note field flows into the draft + committed row (persist tested end-to-end).

### Review Findings

Fable 5, three parallel layers (Blind / Edge-Case / Acceptance). All three independently converged on one ship-blocker. Triaged + patched by Opus.

**Patched (6):**
1. **[CRITICAL — all 3] Edit/remove after a partial-failure commit diverged from committed progress** — the recap re-enabled editing on `.failed` while the committer kept per-draft progress across retries: editing an already-routed draft dropped the edit; removing a draft whose pin was written orphaned it AND broke batch-merge (a same-place sibling then duplicated the pin); photo-sort collisions. **Fix:** recap rows lock once a commit starts (`state != .idle`) — after a failure the only action is resume-retry, which closes every divergence + orphan-on-abandon path.
2. **[MEDIUM — Blind] Photo-step double-tap appended the place twice** (old write-latch was gone). **Fix:** a `drafted` latch fires `onDraft` once.
3. **[MEDIUM — all] Skipped photos became invisible** (the old 已略過 N 張 surface was removed; `skippedPhotoCount` read nowhere; success auto-dismissed). **Fix:** the recap footer shows `photosSkipped(n)`, and a commit that skipped a photo no longer auto-dismisses — the user leaves deliberately.
4. **[MEDIUM — Acceptance] Recap sub-line 這些回憶都在你的地圖上了 lied pre-commit.** **Fix:** retargeted the candidate to 確認後就會留在你的地圖上.
5. **[LOW] Recap edit-sheet photo add bypassed the 20-photo cap.** **Fix:** cap enforced on append.
6. **[LOW] `case .recap` with a nil committer rendered a blank inescapable cover.** **Fix:** an else safety-hatch dismisses.

**Deferred / documented:**
- **Renaming a draft that proximity-merges** silently keeps the existing pin's name (Shape-A: an additional visit has no name of its own). A semantic edge best handled in 2.11 (visit semantics) — documented, not a silent bug.
- **AC8 render half:** the note now definitively persists (tested end-to-end); the "didn't render while typing" symptom couldn't be reproduced in unit scope and may have been the persistence failure surfacing (now fixed) or a sim IME artifact — flagged for Simon's on-device re-verification.
- **Whole-trip in-memory loss** on a crash mid-loop (Simon-accepted for draft-first); large-batch commit has no per-place progress/cancel (calm single spinner) — a future polish.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Packages/MapsakeKit/Sources/MapsakeModels/PlaceDraft.swift`
- `Packages/MapsakeKit/Sources/MapsakeModels/CaptureCommitter.swift`
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/CaptureCommitterTests.swift`

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/{CaptureSession (holds [PlaceDraft]), PhotoStepViewModel (draft collector)}.swift`
- `Packages/MapsakeKit/Sources/MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}` (3 draft-first candidates + retargeted recap.sub)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/{CaptureSessionTests, PhotoStepViewModelTests}.swift`
- `Mapsake/Features/Capture/Photos/PhotoStepScreen.swift` (selected-photo strip, note fix, draft latch)
- `Mapsake/Features/Capture/Recap/RecapScreen.swift` (editable recap + edit sheet + commit + skip/lock)
- `Mapsake/Features/Capture/SaveMoment/SaveMomentScreen.swift` (已加入這趟, placeName)
- `Mapsake/Features/Map/Views/MapScreen.swift` (draft-first wiring, committer, loop-cancel→recap)

## Change Log

- 2026-07-20 — 2.10 spec authored (ready-for-dev). Draft-first capture: writes move from the photo step to a commit-at-recap `CaptureCommitter` with batch-aware merge; recap becomes an editable confirmation; loop-cancel returns to the recap; save-moment copy tells the truth; capture-step photo-preview + note bugs fixed. Baseline 9a22cb4.
- 2026-07-20 — 2.10 dev (Opus 4.8): draft-first implemented — `PlaceDraft` + `CaptureCommitter` (batch-aware merge, resumable retry), draft-collector photo step, editable recap + edit sheet, loop-cancel→recap, 已加入這趟 copy, photo-preview + note fixes. 84 MapsakeKit tests (7 new committer) + app build + SwiftLint green.
- 2026-07-20 — 2.10 code review (Fable 5, 3 adversarial layers) + patches (Opus): fixed 6 — the CRITICAL edit-after-partial-failure divergence (recap locks once a commit starts), photo-step double-tap latch, skipped-photo visibility, pre-commit recap-sub lie, edit-sheet photo cap, nil-committer blank cover. Deferred (documented): rename-on-merge semantics (→ 2.11), AC8 render-half on-device verify, whole-trip loss (accepted). 84 tests + app build + SwiftLint + full sim suite green. Status → done.
