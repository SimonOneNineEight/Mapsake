---
baseline_commit: b80e025cc6d180099ffd8a266a2a22a8cdbeb54e  # mapsake-ios HEAD before 2.6
---

# Story 2.6: The save moment, loop & recap

Status: done

## Story

As a traveler,
I want a felt confirmation and an easy way to keep going or stop,
so that logging a ten-place trip is a pleasure, not data entry.

## Acceptance Criteria

**AC1 — The save moment (epics.md#Story 2.6, verbatim; FR10, NFR4)**
Given a save, When the server acknowledges the write (NFR4), Then the save moment plays (settle + ripple + light haptic via `.mapsakeMotion`, Reduce-Motion → toast only) and 已儲存 shows with 「{place} · 第 N 次」.

**AC2 — The loop & recap (epics.md#Story 2.6, verbatim; FR11/FR12)**
Given the loop, When the memory is saved, Then I can 記錄下個地點 (→ search, session date carried) or 完成這次記錄 (→ recap), And the recap shows every place logged (place · date · photo count, no 第 N 次 rows).

### Additional acceptance criteria (from UX + architecture)

**AC3 — Save-moment timing + Reduce Motion**
Given the save moment, Then the pin **settle** (falls/lands/springs, `.7s cubic-bezier(.2,.8,.3,1.1)`) + a **ripple** ring (`.9s` ease-out, `.45s` delay) + a **light haptic** play, gated through the single `.mapsakeMotion` choke point; under Reduce Motion there is NO settle/ripple — the toast 已儲存 + serif line appear with the state change only (haptic still fires). The moment shows ONLY after the write is acknowledged. [EXPERIENCE.md lines 71, 98, 112; architecture 223]

**AC4 — Session-date carry activates the deferred previous-place chip**
Given the loop's 記錄下個地點, Then the capture session carries the just-used date forward so the next date step shows the 「{M 月 D 日} · 上個地點」 chip (the Story 2.4/2.5 deferral, now wired). Consecutive places in a trip share the date as a one-tap shortcut; the session is the suggestion source. [EXPERIENCE.md lines 68, 72, 145]

**AC5 — The recap (FR12)**
Given 完成這次記錄, Then a recap shows serif 「你記錄了 N 個地點」, a warm factual sub, and a card of rows **place · date · photo count** — **no 第 N 次 in recap rows** (Simon: clutter); undated/photoless rows render clean (no empty date/count). CTA 看看地圖 → dismiss to the map and reset the session. [EXPERIENCE.md line 73]

**AC6 — The write already happened; 2.6 wraps its acknowledgement**
Given the create-then-upload write (Story 2.5, in `PhotoStepViewModel`), Then on `saved` the photo step no longer dismisses — it produces a `CaptureResult` (place, date, visit ordinal, photo count) that (a) plays the save moment and (b) is recorded into the session for the recap. The write is NOT re-issued here; 2.6 owns only the acknowledged-moment + loop/recap orchestration. [architecture NFR4]

**AC7 — Voice + candidates + a11y**
Given the copy: 已儲存 (`L.saved`), 第 N 次 (`L.visitOrdinal`), 記錄 (`L.record`) are BLESSED. New candidates (FR28, `needs_review`): 記錄下個地點, 完成這次記錄, 看看地圖, 你記錄了 %lld 個地點, the recap warm-sub (Simon-arbitrated), the recap row photo-count, the 「%@ · 上個地點」 previous-date chip, and 儲存中 (the in-progress state, EXPERIENCE line 90). The save moment announces 已儲存 to VoiceOver (AC-a11y, EXPERIENCE line 122). [EXPERIENCE.md lines 51, 90; voice-guide.md]

**AC8 — Types + boundary**
Given the implementation, Then `CaptureSession` + `CaptureResult` + `CaptureLogEntry` are pure MapsakeModels value/observable types (unit-testable: record → entries + lastDate carry; recap-row formatting where pure); the save-moment animation + haptic live app-side behind `.mapsakeMotion`; every user-facing string is a typed `L` key. `MapsakeModels` stays UI-free. [architecture 221, 223]

## Tasks / Subtasks

- [x] **Task 1 — Session model** (AC: 4, 5, 8)
  - [x] `CaptureResult` (place, date: CalendarDate?, visitOrdinal, photoCount) + `CaptureLogEntry` (place, date, photoCount) in MapsakeModels. `CaptureSession` (@Observable @MainActor): `entries: [CaptureLogEntry]`, `lastDate: CalendarDate?`, `record(_ CaptureResult)` (append + carry date when non-nil), `count`, `reset()`.
  - [x] Unit tests: record appends + carries the date; a skipped-date result doesn't overwrite `lastDate`; reset clears.
- [x] **Task 2 — PhotoStepViewModel produces a CaptureResult** (AC: 6)
  - [x] On `saved`, expose `captureResult: CaptureResult?` (place = `draft.placement.name`, date = `draft.date`, ordinal = `draft.placement.visitOrdinal`, photoCount = the count actually inserted = uploaded minus skipped). Unit-tested.
- [x] **Task 3 — Save-moment screen + animation** (AC: 1, 3, 7)
  - [x] `Mapsake/Features/Capture/SaveMoment/SaveMomentScreen.swift`: a pin **settle** (offset→rest with the spec spring) + a **ripple** ring (scale+fade, `.45s` delay) driven by `.mapsakeMotion` (Reduce Motion → static); a light `UIImpactFeedbackGenerator(.light)` on appear; the 已儲存 toast + serif 「{place} · 第 N 次」 (`L.saved`, `L.visitOrdinal`); the loop buttons. `.accessibilityLabel` announces 已儲存. `.mapsakeMotion`-gated so a Reduce-Motion UI test proves no animation.
  - [x] Loop buttons: primary `記錄下個地點` (→ search, session date carried); ghost `完成這次記錄` (→ recap).
- [x] **Task 4 — Recap screen** (AC: 2, 5, 7)
  - [x] `Mapsake/Features/Capture/Recap/RecapScreen.swift`: serif 「你記錄了 N 個地點」 + warm sub; a card of `CaptureLogEntry` rows (place · date · photo count, no 第 N 次; clean when undated/photoless); CTA 看看地圖 → dismiss + `session.reset()` + `MapViewModel.load()`.
- [x] **Task 5 — Flow rewire (loop + session)** (AC: 2, 4, 6)
  - [x] `MapScreen`: hold a `CaptureSession` (@State). Add `CaptureRoute` cases `.saveMoment(CaptureResult)` + `.recap`. Photo step `onSaved` → record the result into the session + route to `.saveMoment` (NOT dismiss). Save moment 記錄下個地點 → `.search`; 完成這次記錄 → `.recap`. Recap 看看地圖 → `route = nil` + reset. `openDateStep` passes `previousSessionDate: session.lastDate`. Starting a fresh capture from the pill (not the loop) resets the session.
- [x] **Task 6 — Activate the deferred previous-date chip** (AC: 4)
  - [x] `DateStepScreen`: render the 「{M 月 D 日} · 上個地點」 chip when `model.previousSessionDate != nil` (the Story 2.4 deferral). Format the date label (`MMMd`, zh-Hant) + the `date.previousPlaceChip` candidate; selecting it sets the date. `DateStepViewModel.isPreviousSelected` already exists.
- [x] **Task 7 — Candidate strings** (AC: 7)
  - [x] Candidates (`needs_review`): `capture.nextPlace` (記錄下個地點), `capture.finish` (完成這次記錄), `recap.cta` (看看地圖), `recap.heading` (你記錄了 %lld 個地點), `recap.sub` (warm factual — Simon-arbitrated), `recap.photoCount` (%lld 張照片), `date.previousPlaceChip` (%@ · 上個地點), `save.inProgress` (儲存中). Reuse BLESSED `L.saved`/`L.visitOrdinal`/`L.record`.
- [x] **Task 8 — Tests + review**
  - [x] `swift test` (session model + captureResult + pure recap-row formatting) green; `xcodebuild build`/`test` green (incl. the Reduce-Motion no-animation assertion if feasible in XCUITest, else on-device); SwiftLint clean. `bmad-code-review` (Fable 5). The felt animation timing/haptic are on-device eyeball.

## Dev Notes

### The write is already done — 2.6 wraps the acknowledgement

Story 2.5's `PhotoStepViewModel` performs the confirmed create-then-upload write. 2.6 does NOT re-issue it. On `saved`, instead of dismissing, the photo step yields a `CaptureResult`; `MapScreen` records it into the `CaptureSession` and presents the save moment. This matches NFR4 (the moment shows only after the ack) and keeps "exactly one write".

### CaptureSession spans capture cycles; the pill resets, the loop continues

The session lives at `MapScreen` (@State), above the per-capture `CaptureRoute` flow. The loop's 記錄下個地點 keeps the same session (carrying `lastDate` → the previous-place chip). 完成這次記錄 → recap → 看看地圖 resets it. Entering capture fresh from the search pill (a NEW trip) resets the session first. `lastDate` only advances on a dated save (a 略過'd capture doesn't clobber the carried date).

### Save-moment animation (app-side, `.mapsakeMotion`-gated)

The settle + ripple are SwiftUI animations on a stylized pin/ripple overlay (not a live MapLibre pin-drop — that's a heavier on-device polish; note it). Timings per EXPERIENCE line 71 (settle `.7s cubic-bezier(.2,.8,.3,1.1)`; ripple `.9s` ease-out, `.45s` delay). Both go through `MapsakeMotion.resolved(_:reduceMotion:)` so Reduce Motion yields no animation (the existing motion gate + its unit test). The light haptic (`UIImpactFeedbackGenerator(.light)`) fires on appear regardless (haptics aren't motion). The serif line reuses `L.saved` + `L.visitOrdinal`.

### Integration points

- `PhotoStepViewModel` (2.5): add `captureResult`; `onSaved` in `MapScreen` reads it.
- `MapScreen` `CaptureRoute` (2.3–2.5): + `.saveMoment`, `.recap`; hold the `CaptureSession`; `openDateStep(previousSessionDate:)`.
- `DateStepScreen`/`DateStepViewModel` (2.4/2.5): the previous-date chip (deferred) now renders.
- `MapsakeMotion` / `.mapsakeMotion` (MapsakeDesign, from 2.3): the gate for settle + ripple.
- `MapsakeChip` (MapsakeDesign): the previous-date chip.

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{CaptureSession, CaptureResult}.swift  (NEW)
├── Packages/MapsakeKit/Sources/MapsakeModels/PhotoStepViewModel.swift  (UPDATE — captureResult)
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/CaptureSessionTests.swift  (NEW)
├── Mapsake/Features/Capture/SaveMoment/SaveMomentScreen.swift  (NEW)
├── Mapsake/Features/Capture/Recap/RecapScreen.swift  (NEW)
├── Mapsake/Features/Capture/Date/DateStepScreen.swift  (UPDATE — previous-date chip)
├── Mapsake/Features/Map/Views/MapScreen.swift  (UPDATE — CaptureSession + .saveMoment/.recap)
└── Packages/MapsakeKit/Sources/MapsakeDesign/{L.swift, Localizable.xcstrings}  (UPDATE — 8 candidates)
```

### References

- [Source: epics.md#Story 2.6 (394–409), #FR10/FR11/FR12]
- [Source: EXPERIENCE.md (save moment 71, loop 72, recap 73, saving 90, reduce-motion 98, save-anim 112, VO 122, worked example 145–149), architecture (motion gate 223, boundary 221)]
- [Source: mapsake-ios — PhotoStepViewModel (2.5), MapScreen CaptureRoute, DateStepViewModel.isPreviousSelected/previousSessionDate (2.4), MapsakeMotion/.mapsakeMotion, MapsakeChip, L.saved/L.visitOrdinal/L.record (blessed)]

## Review Findings (bmad-code-review, Fable 5, 2026-07-19)

3 adversarial layers. AC1–AC8 all SATISFIED (AC3 letter-fixed). One Blind-Hunter "High" (photoCount double-subtract) was a FALSE POSITIVE — Edge + Auditor verified the arithmetic is correct (skipped refs are also inserted into `uploadedRefs`, so `uploadedRefs.count − skippedCount` = actually inserted; test covers it). 7 patches applied.

Patches (applied — see Change Log):
- [x] [Review][Patch] Mid-loop the map model wasn't reloaded → re-logging a place in the same loop read stale pins → a DUPLICATE pin + wrong 第 N 次. Restored `model?.load()` in `onSaved` [MapScreen.swift]
- [x] [Review][Patch] A long-press capture didn't reset an abandoned session → stale entries/lastDate leaked into the next trip. Long-press now resets (like the pill) [MapScreen.swift]
- [x] [Review][Patch] The ripple bypassed the single `.mapsakeMotion` gate (architecture 223) + could freeze on a mid-moment Reduce-Motion toggle. Routed through `MapsakeMotion.resolved`; the ring is gated so a later RM-off reveals only a faded-out ring [SaveMomentScreen.swift]
- [x] [Review][Patch] "VoiceOver announces 已儲存" was a passive container label, not an announcement. Now posts `AccessibilityNotification.Announcement` [SaveMomentScreen.swift]
- [x] [Review][Patch] `previousSessionDate == today` rendered two selected chips. The previous chip is suppressed when it equals today [DateStepScreen.swift]
- [x] [Review][Patch] `CaptureLogEntry` Equatable was broken by the per-instance `id`. Content-based `==` [CaptureSession.swift]
- [x] [Review][Patch] `儲存中` (`L.saveInProgress`) was dead. Wired into the photo-step saving state (EXPERIENCE line 90) [PhotoStepScreen.swift]

Dismissed: photoCount "double-subtract" (false positive — arithmetic correct, verified by 2 layers + the unit test); the previous-chip `dateLabel` nil-fallback-to-today (practically unreachable — the date came from a completed save).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review on Fable 5.

### Debug Log References

- `swift test` (MapsakeKit) — 66 tests pass (3 `CaptureSessionTests`; `captureResult` test).
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED**.
- `swiftlint lint` — exit 0. Candidate strings — 30 `needs_review` (8 new).

### Completion Notes List

- **The write is not re-issued.** 2.5's `PhotoStepViewModel` already does the confirmed create-then-upload; 2.6 adds `captureResult` (place/date/ordinal/photoCount), and `MapScreen.onSaved` records it into a `CaptureSession` + routes to `.saveMoment` instead of dismissing. NFR4 holds (moment only after the ack).
- **Session-date carry activates the 2.4-deferred chip.** `CaptureSession.lastDate` (advanced only by a DATED save) feeds `openDateStep(previousSessionDate:)`; `DateStepScreen` now renders the 「{date} · 上個地點」 chip. Added a `MapsakeChip(dynamic:)` String overload for the data-derived label (the today chip stays the blessed-resource init).
- **Save moment.** `SaveMomentScreen`: pin settle (`.timingCurve(0.2,0.8,0.3,1.1, 0.7)`) + ripple ring (`.easeOut(0.9).delay(0.45)`) via `MapsakeMotion.resolved(_:reduceMotion:)` (the one motion gate → static under Reduce Motion, ripple not rendered); a light `UIImpactFeedbackGenerator` on appear (haptic isn't motion); 已儲存 + serif 「place · 第 N 次」; VoiceOver announces 已儲存. **On-device eyeball:** the settle/ripple feel + haptic. The animation is a SwiftUI overlay, not a live MapLibre pin-drop (noted as a heavier polish).
- **Loop + recap.** `記錄下個地點` → `.search` keeping the session (carry); `完成這次記錄` → `.recap`. `RecapScreen`: 你記錄了 N 個地點 + warm sub + rows (place · date · photo count, no 第 N 次; clean when undated/photoless); 看看地圖 → dismiss + reset + `load()`. The search pill resets the session (a fresh trip); the loop keeps it.
- **Simon-gated:** bless the 8 FR28 candidates (incl. the Simon-arbitrated recap warm-sub); the 1.4 migration + Storage RLS from 2.5 still gate real writes. `MapsakeChip(dynamic:)` accessibility uses the data string directly (not the catalog) — correct for a dynamic label.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Packages/MapsakeKit/Sources/MapsakeModels/CaptureSession.swift` (CaptureSession + CaptureResult + CaptureLogEntry)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/CaptureSessionTests.swift`
- `Mapsake/Features/Capture/SaveMoment/SaveMomentScreen.swift`
- `Mapsake/Features/Capture/Recap/RecapScreen.swift`

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/PhotoStepViewModel.swift` (captureResult)
- `Packages/MapsakeKit/Sources/MapsakeDesign/Components/MapsakeChip.swift` (dynamic String label overload)
- `Packages/MapsakeKit/Sources/MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}` (8 candidates)
- `Mapsake/Features/Capture/Date/DateStepScreen.swift` (previous-date chip)
- `Mapsake/Features/Map/Views/MapScreen.swift` (CaptureSession + .saveMoment/.recap + loop wiring)

## Change Log

- 2026-07-19 — 2.6 implemented (dev-story, Opus 4.8): the save moment (settle + ripple + light haptic via the `.mapsakeMotion` gate; Reduce-Motion → toast; 已儲存 + 「place · 第 N 次」), the capture loop (記錄下個地點 keeps the session / 完成這次記錄 → recap), the session recap (你記錄了 N 個地點 + rows), and the session-date carry that activates the 2.4-deferred 上個地點 chip. `CaptureSession`/`CaptureResult` in MapsakeModels; `MapsakeChip(dynamic:)` overload. 66 MapsakeKit tests green, app build + SwiftLint green, 30 FR28 candidates pending blessing. Status → review.
- 2026-07-19 — code-review (Fable 5, 3 layers): 7 patches — mid-loop map reload (no duplicate pin), long-press session reset, ripple through the single motion gate (+ frozen-ripple fix), real VoiceOver 已儲存 announcement, suppress the duplicate today/previous chip, content-based CaptureLogEntry Equatable, wired 儲存中. One Blind finding was a false positive (photoCount, disproven by 2 layers). 66 MapsakeKit tests green, app build + SwiftLint green. Status → done.
