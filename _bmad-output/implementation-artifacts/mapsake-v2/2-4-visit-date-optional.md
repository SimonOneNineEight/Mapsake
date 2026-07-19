---
baseline_commit: 6a40679e7d841f8483b3c24f707d74eecd405d5e  # mapsake-ios HEAD before 2.4
---

# Story 2.4: Visit date (optional)

Status: done

## Story

As a traveler,
I want to set when I was there, or skip it,
so that dating a memory is easy but never forced.

## Acceptance Criteria

**AC1 — The date step (epics.md#Story 2.4, verbatim)**
Given the date step, When it opens, Then it shows the serif question 「哪一天去的呢？」, shortcut chips (the session's previous date, 今天), and the iOS date wheel, And 略過 is the single skip; the visit may be saved with no date (FR7), And the date is stored as `CalendarDate` on the visit.

### Additional acceptance criteria (from UX + architecture — the story isn't done without these)

**AC2 — The date step sits between fine-tune and the write; the write moves here**
Given fine-tune, When I confirm with 選擇地點, Then instead of writing immediately (Story 2.3's behavior), the resolved placement (final coordinate + proximity match + name + country/region codes) is carried into a **date step**; the **single** create-visit write now happens at the end of the date step — either the primary (with the chosen date) or 略過 (no date). Still exactly one write via `MapsakeData` (a `PinInsert` for a new pin, a `VisitInsert` for a proximity-matched pin) — never a create-then-update. [EXPERIENCE.md line 34 (capture stack: fine-tune → date → …), Story 2.3 scope note "2.4 will insert the date step before dismiss"]

**AC3 — The date lands on the right column (Shape A)**
Given a chosen date, When the write runs, Then a **new pin** carries it as `PinInsert.memory_date` (the pins row IS the primary visit) and an **additional visit** carries it as `VisitInsert.visit_date`. 略過 → that field stays NULL (a bare, undated visit is valid, FR7). The value is a `CalendarDate` (y/m/d) — never a bare `Date`, never `convertFromSnakeCase`. [architecture.md lines 122, 207]

**AC4 — The sub-line identity 「{place} · 第 N 次」**
Given the date step, Then under the question a sub-line shows the place name + the visit ordinal 第 N 次, where N = the proximity match's `visitCount` + 1 (a new pin → 第 1 次; a match with N prior visits → 第 (N+1) 次). 第 N 次 is the blessed pattern (pin/re-live surfaces). [EXPERIENCE.md line 68, arbitrated vocab line 51]

**AC5 — Chips are TRUE shortcuts only; the wheel is the any-other-date path**
Given the date step, Then the chip row shows 今天 always, and 「{M 月 D 日} · 上個地點」 **only when the session carries a previous date** (consecutive places in a trip share a date; the session is the suggestion source). There is NO 選其他日期 chip — the iOS date wheel below IS the any-other-date path. Tapping a chip sets the selected date; spinning the wheel sets any date; the selected date defaults to 今天. The session-date carry is populated by the capture loop (Story 2.6); in 2.4's single-shot flow the previous-date chip is typically absent (the input is nil). [EXPERIENCE.md line 68]

**AC6 — Calm confirmed write, unchanged posture (NFR4)**
Given the primary (or 略過), Then the write is acknowledged before success is shown; it surfaces `saving / saved / saveFailed(retryable:)`; a failure retains the entry and offers a calm inline retry — never a loss message, never 錯誤/失敗 nouns, never a red fill. The write state machine moves from Story 2.3's fine-tune step into the date step; confirm is inert once `.saving`/`.saved` (no double-write). On `saved`, dismiss to the map + refresh (the felt save-moment animation + loop/recap are Story 2.6). [architecture.md line 210; NFR4]

**AC7 — Voice + candidates (FR28)**
Given the copy, Then 哪一天去的呢？ is BLESSED (`L.dateQuestion`), 第 N 次 is the blessed pattern, and the date-step primary reuses BLESSED 記錄 (`L.record`) for this cut (it becomes 下一步：上傳照片 once Story 2.5's photo step exists). New copy ships as `needs_review` candidates: 略過 (the single skip), 今天 (the today chip), the 「{M 月 D 日} · 上個地點」 previous-date chip pattern. The iOS date wheel is native (no custom copy). [EXPERIENCE.md line 56 process contract; voice-guide.md]

**AC8 — Types + boundary**
Given the implementation, Then the date-step controller lives in **MapsakeModels** (@Observable, testable against the `CaptureWriter` fake — the write logic is unit-tested off the network); the SwiftUI `DatePicker(.wheel)` binds a `Date` and converts to/from `CalendarDate` at the boundary with an explicit calendar (`Calendar.current`); every user-facing string is a typed `L` key; `MapsakeModels` stays free of Supabase/CoreLocation/MapKit. [architecture.md line 207, 221]

## Tasks / Subtasks

- [x] **Task 1 — Carry the date into the pure write decision** (AC: 2, 3)
  - [x] Extend `CaptureWritePlanner.plan(...)` with a `date: CalendarDate?` param → sets `PinInsert.memoryDate` (new pin) or `VisitInsert.visitDate` (additional visit). No other field changes. Keep it pure.
  - [x] Unit tests (`CaptureWriteTests`): a dated new pin sets `memory_date`; a dated additional visit sets `visit_date`; 略過 (nil) leaves both NULL; existing no-date behavior unchanged.
- [x] **Task 2 — Split fine-tune: resolve the placement, don't write** (AC: 2)
  - [x] Introduce `ResolvedPlacement` (MapsakeModels, Sendable value): final `lat/lng`, `match: VisitedMatch?`, `name: String`, `countryCode: String?`, `regionCode: String?`, `userId`. `FineTuneViewModel.confirm(regionCode:)` becomes `resolve(regionCode:)`: it still awaits the in-flight geocode, computes the proximity match at the FINAL coordinate, resolves the write name, and produces a `ResolvedPlacement` — but **no longer writes**. Surface it via an `onResolved` callback (or a `resolved` output) instead of `writeState`.
  - [x] Move the `CaptureWriter` + the `saving/saved/saveFailed` state machine OUT of `FineTuneViewModel` into the date step (Task 3). Fine-tune keeps: coordinate, debounced preview, resolve. Update `FineTuneViewModelTests` accordingly (the write-branch/state tests move to the date-step tests).
- [x] **Task 3 — DateStepViewModel** (AC: 3, 4, 5, 6, 8)
  - [x] `Packages/MapsakeKit/Sources/MapsakeModels/DateStepViewModel.swift` (@Observable @MainActor): inputs = the `ResolvedPlacement`, `today: CalendarDate` (injected — app computes from `Date()`), `previousSessionDate: CalendarDate?`, a `CaptureWriter`. State: `selectedDate: CalendarDate` (default = `today`), `writeState` (idle/saving/saved/saveFailed — moved from fine-tune). Derived: `visitOrdinal` = `(placement.match?.visitCount ?? 0) + 1`; `placeName`.
  - [x] `select(_ date: CalendarDate)` (chip/wheel), `save()` → write with `selectedDate` via `CaptureWritePlanner.plan(..., date:)` + `CaptureWriter`; `skip()` → write with `date: nil`; both map to the calm state machine, inert once saving/saved.
  - [x] Unit tests (`DateStepViewModelTests`): ordinal (new pin = 1, match with 2 = 3); `save()` sets `memory_date`/`visit_date` from `selectedDate`; `skip()` writes NULL; failure → `saveFailed(retryable:)` then retry; inert once saved.
- [x] **Task 4 — DateStepScreen** (AC: 1, 4, 5, 7)
  - [x] `Mapsake/Features/Capture/Date/DateStepScreen.swift`: serif `L.dateQuestion` (`.sheetHeading`/`.sheetTitle`), sub `「{placeName} · 第 N 次」` (`.screenSubtitle`), a chip row (`MapsakeChip`): 今天 always; the 上個地點 chip only when `previousSessionDate != nil`; then a native `DatePicker(selection:, displayedComponents: .date).datePickerStyle(.wheel)` bound to a `Date` bridged to `vm.selectedDate` via `Calendar.current`. Primary `MapsakePrimaryButton(L.record)` → `vm.save()`; quiet `MapsakeQuietButton(略過)` → `vm.skip()`. Saving/saved/saveFailed handled as in Story 2.3's fine-tune sheet (disable primary + secondary while saving; calm retry line on failure; on saved → onSaved).
  - [x] a11y: chips carry `mapsakeAccessible` (via `MapsakeChip`); the DatePicker is native-accessible; ≥44pt targets; the primary/secondary via the design components.
- [x] **Task 5 — Wire the flow into the capture stack** (AC: 2, 6)
  - [x] `MapScreen` (`CaptureRoute`): add a `.dateStep(DateStepViewModel)` case. Fine-tune's `onResolved` builds the `DateStepViewModel` (inject `today` from `Date()`/`Calendar.current`, `previousSessionDate = nil` for now, `LiveCaptureWriter(client:)`) and routes to it. On `saved` → dismiss + `MapViewModel.load()`. `重新搜尋`/back semantics preserved. Remove the now-dead write wiring from the fine-tune path.
- [x] **Task 6 — Candidate strings** (AC: 7)
  - [x] Add candidates (`needs_review` + `CANDIDATE:`): `capture.skip` (略過), `date.today` (今天). Reuse BLESSED `L.dateQuestion` (哪一天去的呢？) and `L.record` (記錄); `visit.ordinal` (第 %lld 次) blessed. **Deferred to Story 2.6:** `date.previousPlaceChip` (「%@ · 上個地點」) + the previous-date chip UI — they need 2.6's session-date carry + dynamic 「M 月 D 日」 label (the input is definitionally nil until then; AC5 renders 今天 + wheel only for 2.4). Confirm the candidate gate reds CI until Simon blesses (expected).
- [x] **Task 7 — Tests + review**
  - [x] `swift test` (MapsakeKit) green incl. the new `DateStepViewModelTests` + moved write tests; `xcodebuild build`/`test` green; SwiftLint clean. `bmad-code-review` (Fable 5) after. Live date-wheel feel + zh-TW date formatting are on-device (manual eyeball).

## Dev Notes

### The flow refactor — the write moves from fine-tune to the date step (the crux)

Story 2.3 wrote the visit at 選擇地點 (in `FineTuneViewModel.confirm`). The date must land on the SAME create write (Shape A: one write, no create-then-update — architecture line 122/207). The capture order is fine-tune → **date** → (photos → save-moment, later). So the write moves to the end of the date step:

- `FineTuneViewModel`: `confirm(regionCode:)` → `resolve(regionCode:)` — awaits the in-flight geocode (the 2.3 review fix stays), computes the proximity match at the FINAL coordinate (the Simon-locked proximity merge), resolves the write name + `countryCode` (from preview) + `regionCode` (from the map) into a `ResolvedPlacement`, and emits it. It NO LONGER holds `CaptureWriter` or `writeState`.
- `DateStepViewModel`: owns `CaptureWriter` + the `saving/saved/saveFailed` state machine (moved verbatim from 2.3, same calm posture) + the `selectedDate`. `save()`/`skip()` call `CaptureWritePlanner.plan(match:, userId:, name:, lat:, lng:, countryCode:, regionCode:, date:)` then the writer.
- The proximity match is computed at fine-tune resolve time (final coordinate) and carried in `ResolvedPlacement` — the date step does not re-run it (the coordinate is fixed once we leave fine-tune).

This keeps "exactly one write" (AC3), the calm-failure posture (AC6), and the boundary (AC8) intact while inserting the date.

### CalendarDate + the wheel bridge

`CalendarDate` (MapsakeModels) is y/m/d, `Comparable`, ISO `yyyy-MM-dd` on the wire — already the decode type for `pins.memory_date` / `visits.visit_date`. The SwiftUI `DatePicker` works in `Date`; bridge at the screen boundary: `date → CalendarDate` via `Calendar.current.dateComponents([.year,.month,.day], from:)`, and `CalendarDate → Date` via `toDate(in: .current)`. Never store a bare `Date` on the model. `今天` = `CalendarDate` from `Date()` in `Calendar.current`, injected into the VM (keeps MapsakeModels free of "now").

### 「第 N 次」 ordinal

`VisitedMatch.visitCount` = 1 primary + additional visits (Story 2.2). This NEW visit's ordinal = `(match?.visitCount ?? 0) + 1`: a brand-new pin → 第 1 次; a proximity match that already had 2 visits → this is 第 3 次. Shown in the sub-line only (recap rows omit 第 N 次 — that's Story 2.6).

### Session-date carry is Story 2.6

The 上個地點 chip needs "the previous place's date in this session" — that carry is populated by the capture loop (記錄下個地點), which is Story 2.6. Build the date step to ACCEPT `previousSessionDate: CalendarDate?` and render the chip when non-nil; in 2.4's single-shot flow it's nil, so only 今天 + the wheel show. Do not build the session store now (2.6 owns it).

### The primary label for this cut

The final flow's date-step primary is 下一步：上傳照片 (leads into Story 2.5's photo step). Photos don't exist yet, so for 2.4 the primary reuses BLESSED `L.record` (記錄) and performs the terminal write + dismiss. Story 2.5 will insert the photo step after the date step and move the terminal write into Story 2.6's save-moment. Note this forward-dependency in the Dev Agent Record so 2.5 re-points it rather than duplicating.

### Integration points (existing code)

- `FineTuneViewModel` / `FineTuneScreen` (Story 2.3): confirm → resolve; the sheet's 選擇地點 now advances to the date step instead of writing. Keep the draggable pin, reverse-geocode preview, and the review-hardened behaviors (await-geocode, region recenter, VO nudges, guards).
- `MapScreen` `CaptureRoute` (Story 2.3): add `.dateStep`; content-swap in the same `fullScreenCover` (search → fine-tune → date), so no dismiss/re-present flicker.
- `CaptureWritePlanner` / `CaptureWriter` / `PinInsert`/`VisitInsert` (Stories 2.1/2.3): reuse; `PinInsert.memoryDate` and `VisitInsert.visitDate` already exist.
- `MapsakeChip` (MapsakeDesign): the shortcut chips (selected = terracotta-soft + ink 500; ≥44pt).
- `CalendarDate`, `VisitedMatcher`/`VisitedMatch` (MapsakeModels): reuse.

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{ResolvedPlacement, DateStepViewModel}.swift  (NEW — testable)
├── Packages/MapsakeKit/Sources/MapsakeModels/CaptureWrite.swift  (UPDATE — plan(... date:))
├── Packages/MapsakeKit/Sources/MapsakeModels/FineTuneViewModel.swift  (UPDATE — resolve, not write)
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/{DateStepViewModelTests, CaptureWriteTests(update), FineTuneViewModelTests(update)}.swift
├── Mapsake/Features/Capture/Date/DateStepScreen.swift  (NEW)
├── Mapsake/Features/Capture/FineTune/FineTuneScreen.swift  (UPDATE — 選擇地點 → resolve → date step)
├── Mapsake/Features/Map/Views/MapScreen.swift  (UPDATE — CaptureRoute .dateStep)
└── Packages/MapsakeKit/Sources/MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}  (UPDATE — 3 candidates)
```

### References

- [Source: epics.md#Story 2.4 (363–375), #Epic 2 backbone (315–317), #FR7]
- [Source: architecture.md#Shape A (122), #Dates/CalendarDate (207), #Shape-A read (209), #data boundary (221, 229), #write state (210)]
- [Source: EXPERIENCE.md (capture stack 34, date step 68, arbitrated vocab 51, process contract 56, saving/failure 90–91), DESIGN.md (chips), voice-guide.md]
- [Source: mapsake-ios existing — Features/Capture/FineTune/{FineTuneScreen,FineTuneViewModel}, Features/Map/Views/MapScreen (CaptureRoute); MapsakeModels/{CaptureWrite,CalendarDate,VisitedMatcher}; MapsakeDesign/{MapsakeChip, L.dateQuestion (blessed), L.record (blessed)}]

## Review Findings (bmad-code-review, Fable 5, 2026-07-19)

3 adversarial layers. AC1–AC8 verdicts: all SATISFIED (AC2 with the F1 caveat, now patched). Boundary/jargon/date-types confirmed clean. 5 patches applied, 4 deferred, 2 dismissed.

Patches (applied — see Change Log):
- [x] [Review][Patch] Pin could move during `resolve()`'s geocode await → torn write (coord/codes/match disagree); the 2.3 move-guard was lost in the refactor. Fixed: `FineTuneViewModel.isResolving` guards `move()`, set across `resolve` [FineTuneViewModel.swift, FineTuneScreen.swift]
- [x] [Review][Patch] Non-Gregorian device calendar (Buddhist/Japanese) wrote a corrupt year into the Gregorian `date` column. Fixed: `CalendarDate.from(_:)`/`today()`/`toDateLocal()` extract via an explicit local-Gregorian calendar [CalendarDate.swift, DateStepScreen.swift]
- [x] [Review][Patch] `openDateStep` could dead-end silently if `client` were nil — client now required at flow entry (`openFineTune`) [MapScreen.swift]
- [x] [Review][Patch] Wheel + 今天 chip stayed live during `.saving` (could show a date the write didn't use) — disabled while saving [DateStepScreen.swift]
- [x] [Review][Patch] Double-tap 選擇地點 re-entry — screen `isResolving` now stays set through the hand-off [FineTuneScreen.swift]

Deferred (noted, not blocking):
- [x] [Review][Defer] The date step has no non-writing exit (both buttons write; a persistent `saveFailed` traps the user). A capture-stack cancel/back affordance is a flow-wide Simon UX call (EXPERIENCE line 68 lists only 選擇/略過) — decide in Story 2.6 with the full stack + loop/recap. Same class as 2.3's deferred fine-tune-cancel.
- [x] [Review][Defer] Stale pins across the save→`load()` gap: an immediate re-capture of the same spot can duplicate a pin / show 第 1 次. Pre-existing (2.3), narrow window; a real fix needs a post-write local insert or an await-before-recapture.
- [x] [Review][Defer] Non-idempotent insert (no client id) → an ambiguous timeout + retry can double-write. Architectural; needs an idempotency key across `PinInsert`/`VisitInsert`.
- [x] [Review][Defer] The date wheel is unbounded (future dates accepted). Recommend Simon cap it at 今天 (the re-live thesis is past-memories) — a product call, not imposed here.

Dismissed: `FineTuneViewModel.log` "unused" (it is used in `runGeocode`); `saveFailed(retryable:)` Bool always true (pre-existing intentional shape).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review on Fable 5.

### Debug Log References

- `swift build` (MapsakeKit) — clean.
- `swift test` (MapsakeKit) — 52 tests pass (write-branch tests moved to `DateStepViewModelTests` ×7; `CaptureWriteTests` +2 date cases; `FineTuneViewModelTests` rewritten for `resolve` + a gated move-during-resolve regression test).
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED** (one transient xctrunner launch hiccup auto-retried).
- `swiftlint lint` — exit 0.
- Candidate strings — 11 `needs_review` (added `capture.skip`, `date.today`; `visit.ordinal` is blessed as arbitrated vocab).

### Completion Notes List

- **The flow refactor (the crux):** the create-visit write moved from `FineTuneViewModel` into a new `DateStepViewModel`. Fine-tune's 選擇地點 now `resolve(regionCode:)`s a `ResolvedPlacement` (final coord + proximity match + name + codes, awaiting the in-flight geocode so codes match the final coord — the 2.3 review fix survives) and hands it to the date step, which owns the `CaptureWriter` + the `saving/saved/saveFailed` state machine. One write, still Shape A (`PinInsert.memory_date` / `VisitInsert.visit_date`), never create-then-update.
- **Date types:** `CaptureWritePlanner.plan(..., date:)` lands the `CalendarDate` on the right column; `DateStepScreen` bridges the native `DatePicker` (Date) ↔ `CalendarDate` via `Calendar.current`. Added `CalendarDate.today(in:)` (app convenience; the VM takes `today` injected for deterministic tests).
- **第 N 次:** `visit.ordinal` (第 %lld 次) added as BLESSED (it's arbitrated vocab, EXPERIENCE line 51) with an `L.visitOrdinal(_:)` accessor mirroring `L.visitedCount`; the identity line is `Text(placeName · L.visitOrdinal(n))` — a data-derived String, so no `Text("literal")` and the ordinal comes from the catalog.
- **Scoped deferral (AC5):** the 「{M 月 D 日} · 上個地點」 previous-date chip renders only when `previousSessionDate != nil`, which requires the capture-loop session carry — that's **Story 2.6**. In 2.4's single-shot flow it's nil, so only 今天 + the wheel show (AC5-compliant). The `DateStepViewModel` already accepts + tracks `previousSessionDate` (tested), so 2.6 only adds the carry + the dynamic-label chip. Did NOT add a `date.previousPlaceChip` candidate now (2.6 owns it, with the dynamic-label mechanism).
- **Primary label:** reuses BLESSED `L.record` (記錄) for this cut; Story 2.5 inserts the photo step after the date step and re-points the primary to 下一步：上傳照片, moving the terminal write into Story 2.6's save-moment.
- **Simon-gated:** bless the FR28 candidates (now 11 total across 2.3+2.4: the 9 from 2.3 + `capture.skip`, `date.today`); apply the 1.4 migration (`supabase db push`). On-device eyeball: the date-wheel feel + zh-TW date formatting.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Packages/MapsakeKit/Sources/MapsakeModels/ResolvedPlacement.swift`
- `Packages/MapsakeKit/Sources/MapsakeModels/DateStepViewModel.swift`
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/DateStepViewModelTests.swift`
- `Mapsake/Features/Capture/Date/DateStepScreen.swift`

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/CaptureWrite.swift` (plan(... date:))
- `Packages/MapsakeKit/Sources/MapsakeModels/FineTuneViewModel.swift` (confirm→resolve; write removed)
- `Packages/MapsakeKit/Sources/MapsakeModels/CalendarDate.swift` (today(in:))
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/{FineTuneViewModelTests (rewritten), CaptureWriteTests (+date)}.swift`
- `Packages/MapsakeKit/Sources/MapsakeDesign/Localization/L.swift` (skip, today, visitOrdinal)
- `Packages/MapsakeKit/Sources/MapsakeDesign/Resources/Localizable.xcstrings` (capture.skip, date.today candidates; visit.ordinal blessed)
- `Mapsake/Features/Capture/FineTune/FineTuneScreen.swift` (選擇地點 → resolve → onResolved)
- `Mapsake/Features/Map/Views/MapScreen.swift` (CaptureRoute .dateStep + openDateStep)

## Change Log

- 2026-07-19 — 2.4 implemented (dev-story, Opus 4.8): date step inserted between fine-tune and the write; the write moved into `DateStepViewModel` and carries the `CalendarDate` (memory_date / visit_date); 略過 = no date (FR7); serif 哪一天去的呢？ + 「place · 第 N 次」 + 今天 chip + iOS date wheel. 51 MapsakeKit tests green, app build + SwiftLint green. Status → review.
- 2026-07-19 — code-review (Fable 5, 3 layers): 5 patches — `isResolving` guard (no move during resolve), local-Gregorian date extraction (non-Gregorian device calendars), client required at flow entry, wheel/chip disabled while saving, double-tap hand-off closed. 4 deferred (capture-stack cancel/back → 2.6, stale-pins-across-reload, non-idempotent insert, unbounded date wheel), 2 dismissed. 52 MapsakeKit tests green, app build + SwiftLint green. Status → done.
