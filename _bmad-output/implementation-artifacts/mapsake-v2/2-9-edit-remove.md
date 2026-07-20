---
baseline_commit: 2901bd71ebcf9b987f630ba19e52c45735ce63b9  # mapsake-ios HEAD before 2.9
---

# Story 2.9: Edit & remove

Status: done

## Story

As a traveler,
I want to fix or delete a memory,
so that my map stays true and mine.

## Acceptance Criteria

**AC1 — Edit (epics.md#Story 2.9, verbatim)**
Given a pin or visit, When I edit, Then I can change the pin name, a visit's date/note, and add/remove a visit's photos.

**AC2 — Delete + primary promotion (epics.md#Story 2.9, verbatim)**
Given a delete, When I delete a visit that is the primary, Then the **`promote_primary_visit` RPC** atomically promotes the most-recent remaining visit into the pin row (or NULLs `memory_date` if none remain), And deleting a pin removes its visits and photos, with a calm single confirm naming the thing and the consequence for content-bearing deletions.

### Additional acceptance criteria (from UX + architecture)

**AC3 — Which write for which edit (Shape A)**
Given the edit, Then a pin NAME edits `pins.name` (`PinUpdate`); the PRIMARY visit's date/note edit `pins.memory_date`/`pins.note` (`PinUpdate`); an ADDITIONAL visit's date/note edit `visits.visit_date`/`visits.note` (`VisitUpdate`). PATCH semantics — only the changed field is sent (a nil field is NOT nulled). No screen distinguishes pins vs visits; the sheet routes by the timeline entry's `source`. [architecture 122, 209]

**AC4 — Delete a visit (primary vs additional)**
Given a delete-visit, When the entry is the PRIMARY, Then `promote_primary_visit(target_pin)` runs (server-side, atomic, `SECURITY DEFINER` — NOT a client multi-write; it deletes the primary's `visit_id IS NULL` photos + promotes the newest additional, or NULLs `memory_date` if none). When the entry is an ADDITIONAL visit, Then its `visits` row + its photos are removed. After a delete, the sheet reloads its timeline; an empty pin (no remaining content) is handled calmly. [architecture 124]

**AC5 — Delete a pin (cascade)**
Given a delete-pin, Then the `pins` row is deleted — the FK `on delete cascade` removes its `visits` + `photos` rows; the sheet dismisses + the map refreshes. Storage OBJECT reaping (the bucket files) is server-side (architecture 63) — a documented follow-up, not client multi-delete. [architecture 63, pins/photos FK]

**AC6 — Calm single confirm (content-bearing deletions)**
Given a content-bearing deletion (a visit/pin with a date, note, or photos), Then ONE calm confirm names the thing + the consequence (…此動作無法復原); a contentless (bare) delete may skip the confirm or use the same calm one. Never 錯誤/失敗 nouns, never a red-alarm register; the destructive action uses `Color.Mapsake.destructive`. [EXPERIENCE.md line 82, 53; DESIGN destructive]

**AC7 — Add / remove photos**
Given a visit, Then REMOVE deletes the photo row + its Storage object; ADD reuses the Story 2.5 upload path (process → upload to `{user}/{pin}/{photo}` → insert row with the visit's `visit_id`), targeting the EXISTING pin/visit (no new visit created). Both refresh the sheet. [architecture 162; Story 2.5/2.7]

**AC8 — Types + boundary + confirm copy**
Given the implementation, Then `VisitUpdate` + the edit/delete orchestration are testable (MapsakeModels: `PinSheetViewModel` edit/delete against fakeable seams — the entry→write routing, primary-vs-additional delete choice, PATCH-only-changed); the repos + RPC + Storage-delete are MapsakeData; `MapsakeModels` stays UI-free; delete/confirm copy is typed `L` keys (new `needs_review` candidates, FR28). [architecture 221, 229]

## Tasks / Subtasks

- [x] **Task 1 — Update/delete value types + repos** (AC: 3, 4, 5, 7)
  - [x] `VisitUpdate` (visit_date/note, PATCH `encodeIfPresent`, CodingKeys); extend `PinUpdate` with `memoryDate` (edit the primary's date). Explicit CodingKeys; never `convertFromSnakeCase`.
  - [x] `PinRepository`: `update(id, PinUpdate) -> Pin`, `delete(id)`. `VisitRepository`: `update(id, VisitUpdate) -> Visit`, `delete(id)`. `PhotoRepository`: `delete(id)`. A `promotePrimaryVisit(pinId)` (RPC) + a Storage `remove(path)`. Live over PostgREST/RPC/Storage; RLS owner-scoped. Fakeable via an `EditWriter`/reader seam.
- [x] **Task 2 — The edit/delete orchestration (MapsakeModels)** (AC: 3, 4, 5, 7, 8)
  - [x] Extend `PinReader`→ an `EditSeam` (or a new protocol): `renamePin`, `updateEntry(date/note)` (routes primary→PinUpdate, additional→VisitUpdate by the entry's `source`/`visitId`), `deleteEntry` (primary→promote RPC, additional→delete visit+photos), `deletePin`, `removePhoto`, `addPhotos` (reuse the 2.5 processor+writer to the existing pin/visit). `PinSheetViewModel` exposes these + reloads after each. Content-bearing detection (`entryHasContent`) drives the confirm. Unit-tested against fakes (routing + delete-choice + reload).
- [x] **Task 3 — Edit UI on the pin sheet** (AC: 1, 6)
  - [x] `PinSheetScreen` (Story 2.7): an edit affordance (⋯ or 編輯) revealing — rename field (pin name), the selected visit's date (a date step/wheel) + note field, per-photo remove (a ✕ on each tile in edit mode), an add-photos button (→ the picker → upload to this visit), 刪除這次記錄 (delete visit) + 刪除這個地點 (delete pin). Destructive actions use `Color.Mapsake.destructive`.
- [x] **Task 4 — Calm confirm** (AC: 6)
  - [x] A `.confirmationDialog`/alert for content-bearing deletions: names the thing + 此動作無法復原; a calm confirm + 取消. Contentless deletes skip or reuse the calm confirm.
- [x] **Task 5 — Candidate strings** (AC: 8)
  - [x] Candidates (`needs_review`): 編輯, 刪除這次記錄, 刪除這個地點, the confirm body (…此動作無法復原), 加入照片, and any edit-mode labels. 取消/儲存 reuse blessed keys where they exist.
- [x] **Task 6 — Tests + review**
  - [x] `swift test` (VisitUpdate/PinUpdate PATCH encoding; `PinSheetViewModel` edit-routing + primary-vs-additional delete + reload) green; `xcodebuild build`/`test` green; SwiftLint clean. `bmad-code-review` (Fable 5). Live edit/delete + the promote RPC + Storage-delete are Simon-gated (need the 1.4 migration + RPC pushed) + on-device eyeball.

## Dev Notes

### Shape-A routing: the sheet already knows primary vs additional

The 2.7 timeline entry carries `source` (.primary/.additional) + `visitId`. Route by it: primary edits/deletes hit the `pins` row (`PinUpdate` / the promote RPC); additional hit the `visits` row (`VisitUpdate` / delete). No new "which table" logic — the merge already tagged it.

### The primary-delete RPC is server-side + atomic — never a client multi-write

`promote_primary_visit(target_pin)` (migration `20260716120200`) does, in one `SECURITY DEFINER` transaction: owner-guard + row-lock, delete the primary's own photos (`visit_id IS NULL`), promote the newest additional into the pin row (copy date/note/exif, re-point its photos, delete its `visits` row), or NULL `memory_date` if none remain. iOS just calls `supabase.rpc("promote_primary_visit", params: ["target_pin": pinId])`. Doing promote-then-delete client-side would half-fail offline + orphan data (architecture 124).

### Deletes: cascade + reaping

Delete-pin: the `pins` FK `on delete cascade` (photos.pin_id, visits.pin_id) removes rows. Delete-additional-visit: remove its photo rows + the visit row (visit_id has no cascade guarantee — delete the photos explicitly, then the visit). Storage OBJECT reaping (the bucket files) is server-side (architecture 63, "DB-triggered idempotent object reaping") — a documented follow-up; 2.9 does NOT client-multi-delete objects for a cascade (only a single explicit `removePhoto` deletes its object).

### Add-photos reuses Story 2.5

The photo processor (ImageProcessor) + `CaptureWriter.uploadPhoto`/`insertPhoto` already do process→upload→insert. Add-to-existing = the same, with the KNOWN `pinId`/`visitId` (no create). Reuse the `PhotoSource` picker + the processor + the writer; insert with the entry's `visit_id` (nil for the primary).

### Approximate-solidify (from 2.8) is a natural fit but NOT in 2.9's AC

Story 2.8 noted "drag to a real spot clears `is_approximate`". 2.8 already clears it at CAPTURE (a move in fine-tune). A post-save drag-to-move-on-map edit is a separate FR29 surface NOT in 2.9's AC (which is name/date/note/photos/delete) — deferred (would need a map-drag edit gesture + a `PinUpdate` of lat/lng/is_approximate).

### Simon-gated

The 1.4 migration (visits + the promote RPC) must be pushed before edit/delete validate end-to-end. `is_approximate` (2.8) likewise. Bless the FR28 delete/edit candidates.

### Integration points

- `PinUpdate` (extend), `VisitUpdate` (new), `Pin`/`Visit`/`Photo` (models).
- `PinRepository`/`VisitRepository`/`PhotoRepository` (+ update/delete), `MapsakeDataClient.supabase` (rpc + storage.remove).
- `PinSheetViewModel`/`PinSheetScreen` (2.7): the edit/delete surface.
- `ImageProcessor` + `CaptureWriter` (2.5): add-photos.
- `MapScreen`: refresh + dismiss on delete-pin.

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{Visit(VisitUpdate), Pin(PinUpdate+memoryDate), PinSheetViewModel(edit/delete + EditSeam)}.swift
├── Packages/MapsakeKit/Sources/MapsakeData/{PinRepository, VisitRepository, PhotoRepository}.swift (+ update/delete/rpc/remove)
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/{VisitUpdate/PinUpdate encode, PinSheetViewModel edit/delete}.swift
├── Mapsake/Features/Memory/{PinSheetScreen (edit UI + confirm), LivePinReader → LiveEditSeam}.swift
└── Packages/MapsakeKit/Sources/MapsakeDesign/{L.swift, Localizable.xcstrings}  (edit/delete candidates)
```

### References

- [Source: epics.md#Story 2.9 (438–452), #FR29]
- [Source: architecture.md#primary-visit delete RPC (124), #Shape-A read (209/122), #photo reaping (63), #boundary/red-flags (221/229)]
- [Source: EXPERIENCE.md (edit/remove 82, moment/destructive patterns 53), DESIGN destructive]
- [Source: migration `20260716120200_promote_primary_visit_rpc.sql`; mapsake-ios PinUpdate/Pin/Visit/Photo, PinSheetViewModel (2.7), PhotoRepository/CaptureWriter (2.5), MapScreen]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review on Fable 5.

### Debug Log References

- `swift test` (MapsakeKit) — 79 tests pass (77 dev + 2 review: pin-refetch renders a rename/primary edit; add-photos routes to the selected entry's visit). Earlier found bug: `load()` reset the selection to the most-recent, so editing an OLDER visit jumped the sheet back to the primary — fixed (load preserves the selected entry).
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED** (post-review). Full simulator suite green.
- `swiftlint lint` — exit 0. Candidate strings — 39 (+8 edit/delete).

### Completion Notes List

- **Shape-A routing.** `PinSheetViewModel` edits/deletes route by the timeline entry: PRIMARY → the `pins` row (`PinUpdate` / `promote_primary_visit` RPC); ADDITIONAL → the `visits` row (`VisitUpdate` / delete + its photos). The `EditSeam` (MapsakeModels) references only value types; `LiveEditSeam` (app) wraps the concrete Live repos + the RPC + Storage. Unit-tested (routing + primary-vs-additional delete choice + reload).
- **Repos.** Added update/delete to `LivePinRepository`/`LiveVisitRepository`/`LivePhotoRepository`, `promotePrimaryVisit` (RPC), Storage `remove` — all on the CONCRETE Live structs (not the protocols), so the fakes/tests stayed untouched. `PinUpdate` gained `memoryDate`; `VisitUpdate` is new (both PATCH-only-changed via `encodeIfPresent`).
- **Delete.** Primary → the server-side atomic promote RPC (never a client multi-write). Additional visit → delete its photo rows + objects (visit_id has no FK cascade), then the row. Pin → `delete` (FK cascade removes visits+photos rows; object reaping is server-side, deferred). A calm `.confirmationDialog` names the pin + 此動作無法復原; destructive actions use `Color.Mapsake.destructive`.
- **Add/remove photos.** Remove → delete the row + its object. Add → reuse the 2.5 pipeline (`PhotoSource.prepared` → `LivePhotoStorage.upload` → insert) to the EXISTING pin/visit at the next sort_order (lowercased path, like 2.5).
- **Selection preserved across reloads** (the found bug) — editing an older visit no longer snaps back to the primary.
- **Deferred (disclosed):** drag-to-move-a-pin-on-the-map (+ approximate-solidify) is a separate FR29 surface NOT in 2.9's AC (name/date/note/photos/delete) — 2.8 already clears approximate at capture; a post-save map-drag edit is a follow-up. Storage object reaping on a cascade delete is server-side (architecture 63). Clearing a note to NULL (vs setting) uses empty-string (renders as no note) — a full null-clear is a follow-up.
- **Simon-gated:** the 1.4 migration (visits + the promote RPC) + 2.8's is_approximate must be pushed before edit/delete validate end-to-end; bless the 8 FR28 edit/delete candidates. On-device: the edit flow + delete + the RPC.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Mapsake/Features/Memory/LiveEditSeam.swift` (review: row-before-object deletes, calm skip of an unpreparable ref, server-authoritative sort baseline)

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/{Pin.swift (PinUpdate.memoryDate), Visit.swift (VisitUpdate), PinSheetViewModel.swift (EditSeam + edit/delete + preserve-selection; review: PinReader.pin refetch, mutable pin, addPhotos drops startSort)}.swift`
- `Packages/MapsakeKit/Sources/MapsakeData/{PinRepository (+pin refetch), VisitRepository, PhotoRepository}.swift` (update/delete/promote/remove on the Live structs)
- `Mapsake/Features/Memory/LivePinReader.swift` (review: wire the pin refetch)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/{PinSheetViewModelTests, PinDecodeTests}.swift`
- `Packages/MapsakeKit/Sources/MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}` (8 edit/delete candidates)
- `Mapsake/Features/Memory/PinSheetScreen.swift` (edit mode + delete confirms; review: change-tracked commit, no history-swap in edit mode)
- `Mapsake/Features/Map/Views/MapScreen.swift` (wire the editor + onPinDeleted)

## Review Findings

Code review on Fable 5 — three parallel adversarial layers (Blind Hunter: diff-only; Edge Case Hunter: diff + full repo read; Acceptance Auditor: diff + spec + architecture/experience). All three independently converged on the same defect cluster; triaged and patched by Opus.

### Patched (7)

1. **[CRITICAL — all 3 reviewers] Primary-side edits never rendered.** `PinSheetViewModel.pin` was an immutable `let` and `load()` rebuilt the timeline from it, but `PinReader` had no way to refetch the pin — so a rename, a primary date/note edit, and (worst) a primary **delete/promote** all reloaded from the stale in-memory pin and showed as if nothing happened. AC1/AC4 were only server-side true. **Fix:** added `PinReader.pin(_:)` + `LivePinRepository.pin(_:)`; `pin` is now a `var` and `load()` refetches it first, so every primary-side write surfaces (and after a promote the sheet shows the promoted successor, not the deleted entry). This also removes the practical trigger for the promote-retry loss below.
2. **[HIGH — all 3] Dateless memory silently stamped with today's date.** Entering edit seeded `draftDate = entry.date ?? Date()` and 完成 unconditionally sent `CalendarDate.from(draftDate)`, so editing only the note on a name-only memory wrote today's date. **Fix:** commit is now change-tracked — the date is sent only when it differs from the SEED (not the entry), so an untouched dateless entry stays dateless and a no-op edit issues no write.
3. **[HIGH — all 3] Mid-edit visit swap wrote drafts onto the wrong visit.** History rows stayed tappable in edit mode; tapping another visit then 完成 committed the current drafts onto the swapped visit. **Fix:** history rows are non-tappable while editing (exit 編輯 to switch); deleting the selected visit also exits edit mode so its stale drafts can't commit.
4. **[HIGH — Blind Hunter] Rename revert / redundant double-writes.** Every 完成 unconditionally re-sent name+date+note. **Fix:** the same change-tracking (#2) sends only genuinely-changed fields — no redundant writes, no reverting a value the user didn't touch.
5. **[MEDIUM — Blind + Edge] Delete-object-before-row left a permanently broken tile.** `removePhoto`/`deleteEntry` removed the Storage object first, then the row — a partial failure left a row whose object was gone. **Fix:** row first, object second (best-effort); an orphaned object is reapable, a rowless-object tile is not.
6. **[MEDIUM — Edge] `addPhotos` aborted the whole batch on one unpreparable ref.** It `try`-threw out of the loop; the Story 2.5 path skips a limited-access unresolvable ref calmly. **Fix:** `guard let processed = try? …  else { continue }` — one bad photo no longer drops the rest.
7. **[MEDIUM — Edge] `addPhotos` sort baseline read a possibly-stale view cache** → colliding `sort_order` / a shuffling strip when adding before the initial read finished. **Fix:** the seam now computes the baseline from server truth (`photos(forVisit:)` / primary's `visit_id IS NULL`); dropped `startSortOrder` from the `EditSeam` signature.

### Deferred (documented)

- **[Edge Case Hunter] `promote_primary_visit` blind-retry hardening.** The RPC lacks an expected-state key, so a pure network retry of a committed promote could re-promote. Patch #1 removes the practical UI trigger (the sheet no longer shows the deleted entry, so the user won't re-tap). The full guard needs an expected-state param — an **RPC-signature migration that is Simon-gated (`supabase db push`)**; tracked as a follow-up, not shipped in 2.9.
- **Note null-clear** (empty→`""` vs `NULL`): already a disclosed follow-up; change-tracking now only writes note on an actual change, reducing drift. A true null-clear still needs explicit-null PATCH support.
- `selectedHasContent` is built + unit-tested but unread by the view (AC6 permits confirming contentless deletes too) — harmless unused surface, left as-is.

### Dismissed / verified-not-a-bug

- `EditSeam` primary-vs-additional routing, `promotePrimaryVisit` RPC discipline (no client multi-write), lowercase Storage paths, `CalendarDate` (never bare `Date`) at the column boundary, `encodeIfPresent` PATCH-omit semantics, MapsakeModels purity, and the FR28 candidate gate on all 8 new strings — all verified correct by the Acceptance Auditor against the spec + architecture.

New tests added for the two most-severe fixes: `loadRefetchesPrimaryPinSoRenameAndPrimaryEditRender` (#1) and `addPhotosRoutesToTheSelectedEntrysVisit` (AC7 routing coverage the auditor flagged as absent).

## Change Log

- 2026-07-19 — 2.9 implemented (dev-story, Opus 4.8): edit (pin name, visit date/note, add/remove photos) + delete (visit → the `promote_primary_visit` RPC for the primary / delete for an additional; pin → cascade) with a calm single confirm (…此動作無法復原). `EditSeam` + repo update/delete/RPC/remove; the 2.7 pin sheet gains edit mode. Found + fixed a selection-reset-on-reload bug. 77 MapsakeKit tests green, app build + SwiftLint green, +8 FR28 candidates. Status → review.
- 2026-07-19 — 2.9 code review (Fable 5, 3 adversarial layers) + patches (Opus 4.8): fixed 7 findings — the CRITICAL stale-pin defect (primary edits/promote never rendered → added a pin-refetch to the read seam), today's-date stamping on dateless memories, mid-edit wrong-visit writes, redundant/reverting writes (change-tracked commit), delete-row-before-object ordering, add-photos batch-abort + stale sort baseline. Deferred (documented): promote-RPC blind-retry hardening (needs a Simon-gated migration), note null-clear. 79 MapsakeKit tests green (+2), app build + SwiftLint + full simulator suite green. Status → done.
