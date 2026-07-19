---
baseline_commit: 913253c1b933626f9a1d568b3801c0c5372c23d5  # mapsake-ios HEAD before 2.3
---

# Story 2.3: Fine-tune placement & create the visit

Status: done

## Story

As a traveler,
I want to nudge the pin to the exact spot and confirm,
so that my memory lands where it actually happened.

## Acceptance Criteria

**AC1 — Fine-tune a placement, then confirm creates a visit (epics.md#Story 2.3, verbatim)**
Given a placement (from search or a long-press on the map),
When the fine-tune step opens,
Then a draggable 44pt pin shows a reverse-geocoded address preview as plain text (never the mechanism's name), with a tap-anywhere-to-move alternative (WCAG 2.5.7),
When I confirm with 選擇地點,
Then a visit is created on the (possibly existing) pin via `MapsakeData`.

### Additional acceptance criteria (from UX + architecture — the story isn't done without these)

**AC2 — Two entry paths converge on fine-tune**
Given the map, When I **long-press** an empty spot, Then fine-tune opens at that coordinate (the one deliberate map-write gesture, `在這裡記錄回憶`). Given a **search result** tap (Story 2.2), Then fine-tune opens at the result's coordinate, carrying whether it matched an existing pin (the 「你去過 N 次」 identity). [EXPERIENCE.md lines 108–109, 67]

**AC3 — The create-visit write rule (Shape A)**
Given the placement's FINAL (post-nudge) coordinate, When I confirm, Then `MapsakeData` performs exactly one write: **an additional `visits` insert** if the placement resolves to an existing pin (see §Decision), OR **a `pins` insert** (a `PinInsert`; that row IS the primary visit) for a new place. Never a separate `visits` row for a primary. Never a hand-rolled insert. [architecture.md line 122; epics.md#2.3]

**AC4 — Confirmed write, calm failure (NFR4)**
Given the confirm, Then the write is **acknowledged before success is shown** (not optimistic); the write surfaces `saving / saved / saveFailed(retryable:)`; a failure retains the entry and offers a calm inline retry — never a loss message, never 錯誤/失敗 nouns, never a red fill. (The felt save-moment animation is Story 2.6; 2.3 owns the write call + these states + a minimal confirmation.) [architecture.md line 210; EXPERIENCE.md lines 91, 94; NFR4]

**AC5 — Region/country codes on a new pin**
Given a NEW pin, Then its `country_code` (ISO-3166-1 alpha-2) and `region_code` (ISO-3166-2) are derived from the placement so the map's geographic clustering (FR2) and derived visited fill (FR3) light up; a code that can't be resolved is left NULL (a bare pin is valid, tolerated). [architecture.md line 30; §Region/country derivation]

**AC6 — The draggable pin + non-drag equivalent (WCAG 2.5.7)**
Given fine-tune, Then a 44pt terracotta teardrop pin sits at the placement with the hint `按住拖曳微調`; **dragging** it nudges the placement AND **tapping anywhere on the fine-tune map moves the pin there** (single-pointer alternative). VoiceOver exposes **nudge actions (adjustable up/down/left/right)**; precision placement never *requires* map interaction (the search pill remains the guaranteed accessible path). [EXPERIENCE.md lines 67, 109, 126; DESIGN.md line 359]

**AC7 — The fine-tune sheet + jargon ban**
Given fine-tune, Then a sheet shows the place name (serif) + the reverse-geocoded address as **plain text**, a primary **選擇地點** confirm, and a quiet **重新搜尋** secondary (→ back to search). The geocoding mechanism's name NEVER surfaces (no 反查地址/「reverse geocode」). [EXPERIENCE.md line 67; voice-guide.md line 48]

**AC8 — Boundaries + reverse-geocode seam**
Given the implementation, Then reverse-geocoding uses the AR20 winner (Apple `CLGeocoder`) behind a **protocol seam** with a `MapsakeTestSupport`-style fake (app-layer, MapKit/CoreLocation — NOT a Supabase import; `MapsakeData` stays Supabase-only); every user-facing string is a typed `L` key; new copy ships candidate (FR28), except the blessed `選擇地點`. [architecture.md lines 161, 221]

## Tasks / Subtasks

- [x] **Task 1 — Reverse-geocode seam + live CLGeocoder** (AC: 1, 7, 8)
  - [x] `PlacePreview` + `protocol ReverseGeocoder` in **MapsakeModels** (`ReverseGeocoder.swift`). Deviation: `regionCode` is NOT carried on `PlacePreview` — it isn't derivable from a `CLPlacemark`, so it's resolved from the map at confirm (Task 2). `PlacePreview` = `name/addressLine/countryCode` (the geocoder's honest output). Live impl app-side.
  - [x] `LiveReverseGeocoder` (CoreLocation, app-side): `CLGeocoder().reverseGeocodeLocation` → plain-text deduped address line from the localized placemark; `countryCode = placemark.isoCountryCode`. Mechanism name never surfaces.
  - [x] `FakeReverseGeocoder` in MapsakeTestSupport (no CoreLocation).
- [x] **Task 2 — Region/country derivation at write time** (AC: 5)
  - [x] `country_code` from the reverse-geocode's `isoCountryCode` (flows through `PlacePreview.countryCode` into `PinInsert`).
  - [x] `region_code` (ISO-3166-2) via `MLNMapView.visibleFeatures(at:styleLayerIdentifiers:["regions-fill"])` reading the promoted `iso` (see `FineTuneMapController.regionCodeAt`), resolved at confirm and passed into `FineTuneViewModel.confirm(regionCode:)`. Both NULL-tolerant.
- [x] **Task 3 — The create-visit write (MapsakeData)** (AC: 3, 4)
  - [x] Pure decision `CaptureWritePlanner.plan(...)` (MapsakeModels) → `CaptureWrite.newPin(PinInsert)` | `.additionalVisit(VisitInsert)`; executed via the `CaptureWriter` seam (live `LiveCaptureWriter` wraps `PinRepository`/`VisitRepository` from 2.1). Confirmed write mapped to `saving/saved/saveFailed(retryable:)` in `FineTuneViewModel`.
  - [x] After `saved`, `MapScreen` calls `MapViewModel.load()` so the new pin/visit appears.
- [x] **Task 4 — Long-press entry on the map** (AC: 2, 6)
  - [x] `UILongPressGestureRecognizer` on `MapLibreMapView` (fires on `.began`), converts point → coordinate, surfaces via `onLongPress` callback → `MapScreen` opens fine-tune. Read-only pan/zoom + cluster tap-dive preserved.
- [x] **Task 5 — Fine-tune screen + draggable/tap-to-move pin** (AC: 1, 6, 7)
  - [x] `FineTuneScreen.swift` + `FineTuneMapView.swift`: parchment map centered on the placement; 44pt terracotta `FineTunePinView` (`MLNAnnotationView`, `isDraggable`) + **tap-anywhere-to-move**; `按住拖曳微調` hint; `FineTuneViewModel` (@Observable, MapsakeModels) holding coordinate + debounced reverse-geocode + write state.
  - [x] Sheet: place name (`.sheetHeading` serif) + plain-text address (`.note`), `MapsakePrimaryButton(L.choosePlace)`, quiet `MapsakeQuietButton(L.research /* 重新搜尋 */)`.
  - [x] a11y: VO nudge custom actions (up/down/left/right) on the pin → `FineTuneViewModel.nudge`; buttons carry `mapsakeAccessible` via the design components; pin = 44pt. Search pill remains the guaranteed accessible path.
- [x] **Task 6 — Wire the entries into MapScreen** (AC: 2)
  - [x] Search selection now opens fine-tune at the result's coordinate (single `CaptureRoute` cover, content swaps search↔fine-tune). Long-press opens fine-tune at the pressed coordinate. On 選擇地點 → write; on `saved` → dismiss + `load()`; on 重新搜尋 → back to search. Note: 2.2's fly-to-on-select (incl. the visited FR21 browse-jump) is REPLACED by fine-tune per story scope; browse-jump returns in Epic 4.
- [x] **Task 7 — Candidate strings** (AC: 7, 8)
  - [x] `選擇地點` BLESSED (`L.choosePlace`). Added candidates (`needs_review` + `CANDIDATE:`): `finetune.dragHint` (按住拖曳微調), `finetune.research` (重新搜尋), `map.longPressCapture` (在這裡記錄回憶), `capture.saveFailed` (還沒存好，先留著，再試一次), `finetune.untitledPlace` (未命名的地點 — fallback pin name). Candidate gate REDs CI + no-literal SwiftLint rule honest — expected until Simon blesses.
- [x] **Task 8 — Tests + review**
  - [x] Unit (MapsakeModelsTests): `CaptureWriteTests` (write-branch decision + proximity overload) + `FineTuneViewModelTests` (debounce preview, proximity re-check at final coord, `saving/saved/saveFailed`, retry, inert-once-saved, nudge-clears-failure) — 12 new, 43 total green via `swift test`. Live CLGeocoder + map region-query are on-device (manual eyeball, Simon-gated).
  - [x] App builds for the simulator (`xcodebuild build`/`test` SUCCEEDED); SwiftLint exit 0; `bmad-code-review` (Fable 5) next.

## Dev Notes

### Decision — 2nd-visit vs new pin = PROXIMITY MERGE (Simon, 2026-07-18)

On 選擇地點, run the existing `VisitedMatcher` (~150m, from Story 2.2) against the FINAL (nudged) coordinate — a match → `VisitInsert` (another visit on that pin); no match → `PinInsert` (new primary). Same rule for both entries (search + long-press); re-checked after the user drags. Matches the multi-visit-per-place model. **Known caveat (carried from 2.2):** the ~150m radius is coarse in dense blocks — a drop ~100m from an unrelated pin silently merges. Accepted for this cut; radius tuning tracked with 2.2's follow-up. [architecture.md line 122]

### The write path (reuses Story 2.1)

`PinRepository.insert(PinInsert)` and `VisitRepository.insert(VisitInsert)` already exist (2.1). `PinInsert` = { userId, name, lat, lng, countryCode?, regionCode?, note?, memoryDate?, muted? } (exif_taken_at is trigger-owned, omitted). `VisitInsert` = { pinId, userId, visitDate?, note? }. Both go through the ONE shared `MapsakeDataClient` (from `AppSession`); RLS owner-scopes on the anon `auth.uid()`. Writes are **confirmed** (await the insert, then show success) — NFR4. At this stage `memory_date`/`visit_date`/`note`/photos are NOT set (those are 2.4/2.5); 2.3 creates the bare visit (name + coordinate + codes). A bare visit is valid.

### Reverse-geocode = Apple CLGeocoder (AR20 winner), plain text only

Apple won AR20 (Story 2.2). `CLGeocoder.reverseGeocodeLocation` is on-device-Apple, no key/attribution. Build the preview from the localized `CLPlacemark` (name, thoroughfare, subLocality, locality, administrativeArea, country) as ONE plain-text line — never the word 反查地址 / "reverse geocode" / the provider name (voice-guide + DESIGN don'ts). Debounce the reverse-geocode as the pin moves (like the search debounce). The preview is best-effort: if it fails, show the coordinate-less name/blank calmly, never an error.

### Region/country derivation — reuse the tiles, don't invent a table

`country_code` is easy: `CLPlacemark.isoCountryCode` gives alpha-2 (`JP`, `TW`) — matches the tiles' country `iso`. `region_code` (ISO-3166-2 like `JP-26`) is NOT in `CLPlacemark` directly; derive it by querying the map's `regions` source at the final coordinate (`visibleFeatures(at:styleLayerIdentifiers:["regions-fill"])` → the feature's `iso`), which is exactly what the visited fill keys on — so a new pin lights the same region it visually sits in. Both codes NULL-tolerant (a bare pin renders as a point, tolerated per the read path). [architecture.md line 30; existing MapLibreMapView regions source]

### Scope — 2.3 ends at the created visit; date/photos/save-moment are 2.4–2.6

2.3 owns: the two entries, the fine-tune pin + reverse-geocode preview, and the create-visit write (with its states + a minimal confirmation). It does NOT own the date step (2.4), photos/EXIF/note (2.5), or the felt save-moment animation + loop/recap (2.6). On `saved`, 2.3 dismisses to the map with the new pin visible (2.4 will later insert the date step before dismiss). No edit/remove (2.9), no approximate-region 「記錄這個地區」 dashed pin (2.8). [epics.md#Stories 2.4–2.9]

### Integration points (existing code)

- `MapLibreMapView` (UIViewRepresentable): add the long-press recognizer + surface the coordinate; keep the read-only pan/zoom + the cluster tap-dive. Fine-tune's own small map can reuse this view or a lightweight variant.
- `MapScreen`: currently the search selection sets a `flyTo`; 2.3 changes it to open fine-tune (carrying the match). Add the long-press → fine-tune path.
- `MapViewModel`: reuse `load()` to refresh after a write; it already loads pins + visit counts.
- `VisitedMatcher` (MapsakeModels, from 2.2): reuse for the existing-pin match at confirm.

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{ReverseGeocoder(PlacePreview+protocol), FineTuneViewModel, CaptureWrite(decision)}.swift  (NEW — testable)
├── Packages/MapsakeKit/Sources/MapsakeTestSupport/FakeReverseGeocoder.swift  (NEW)
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/{CaptureWriteTests, FineTuneViewModelTests}.swift  (NEW)
├── Mapsake/Features/Capture/FineTune/{ReverseGeocoder(LiveReverseGeocoder), FineTuneScreen}.swift  (NEW)
├── Mapsake/Features/Map/Views/MapLibreMapView.swift  (UPDATE — long-press + region-query helper)
├── Mapsake/Features/Map/Views/MapScreen.swift  (UPDATE — open fine-tune from search + long-press)
└── Packages/MapsakeKit/Sources/MapsakeDesign/Resources/Localizable.xcstrings  (UPDATE — candidate finetune strings)
```

### References

- [Source: epics.md#Story 2.3 (lines 349–361), #Epic 2 backbone (182), #FR5/FR6 (142–143), #Stories 2.4/2.8]
- [Source: architecture.md#Data Architecture Shape A (122, 30), #write state (210), #geocoding (161), #data boundary (221), #dates (207)]
- [Source: EXPERIENCE.md (fine-tune 67, interaction primitives 108–109, a11y 126, save-failure 91/94), DESIGN.md (pin-marker 359, sizes 192), voice-guide.md (jargon ban 48, 選擇地點 32), mockups/capture-flow-prototype.html frame 3, .working/ds-cards/screens/finetune.html]
- [Source: mapsake-ios existing — Features/Map/Views/{MapScreen,MapLibreMapView}.swift; MapsakeData/{PinRepository,VisitRepository}.swift (insert paths from 2.1); MapsakeModels/{VisitedMatcher,PlaceSearch}.swift; MapsakeDesign L.choosePlace (選擇地點, blessed)]

## Review Findings (bmad-code-review, Fable 5, 2026-07-19)

3 adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Boundary discipline, jargon ban, write-path, and calm-failure posture confirmed solid + well-tested. 11 patches applied, 5 deferred, 3 dismissed.

Patches (applied — see Change Log):
- [x] [Review][Patch] VoiceOver nudge non-functional — `.adjustable` w/o inc/dec + raw `▲▼◀▶` literal action names + no label (AC6/AC8) → 4 localized L-key custom actions + accessibilityLabel [FineTuneMapView.swift]
- [x] [Review][Patch] Stale/nil preview at confirm → NULL/wrong country_code+name; `confirm` now awaits the in-flight geocode for the final coord before deriving codes/name [FineTuneViewModel.swift]
- [x] [Review][Patch] Region query nil when pin panned off-viewport — recenter to the coordinate before `visibleFeatures` [FineTuneMapView.swift]
- [x] [Review][Patch] Double-tap-to-zoom teleported the pin — tap now `require(toFail:)` the map's double-tap [FineTuneMapView.swift]
- [x] [Review][Patch] `重新搜尋` not disabled while saving (cover yank + dup capture) — disabled during `.saving` [FineTuneScreen.swift]
- [x] [Review][Patch] `.canceling` drag committed as a move — now a no-op (only `.ending`) [FineTuneMapView.swift]
- [x] [Review][Patch] `isPreviewing` cleared by a superseded task's `defer` — generation-guarded [FineTuneViewModel.swift]
- [x] [Review][Patch] move/nudge during `.saving` mutated the coord under the write — guarded [FineTuneViewModel.swift]
- [x] [Review][Patch] Unclamped nudge at poles/antimeridian → invalid coord — clamp lat/wrap lng [FineTuneViewModel.swift]
- [x] [Review][Patch] `Coordinator.parent` never refreshed (stale-closure landmine) — refreshed in `updateUIView` [FineTuneMapView.swift]
- [x] [Review][Patch] Dead `map.longPressCapture` string (never surfaced; blessed no-results copy already guides long-press) — removed [L.swift, Localizable.xcstrings]

Deferred (noted, not blocking):
- [x] [Review][Defer] CLGeocoder per-call, no `cancelGeocode` (throttling) — on-device geocoder tuning; `confirm`-await mitigates the confirm-time impact.
- [x] [Review][Defer] Fine-tune cover has no direct cancel — AC7 lists only 選擇地點 + 重新搜尋; a close/cancel affordance is a Simon UX call.
- [x] [Review][Defer] `fullScreenCover(item:)` search⇄fine-tune identity swap is iOS-version-dependent — Simon on-device check on min iOS.
- [x] [Review][Defer] FR21 search-as-browse (visited result → jump-to-pin) removed per AC2 — returns in Epic 4 browse; `MapLibreMapView.flyTo` capability kept for it.
- [x] [Review][Defer] Empty-geocode (open ocean) → blank sheet (cosmetic) — writes correctly as 未命名的地點; polish on-device.

Dismissed: long-press not restricted to empty spot (proximity merge handles it coherently); MapsakeTestSupport fakes "unused" (story deliverables for previews/XCUITest; unit tests use local stubs per the SearchViewModelTests Supabase-isolation precedent); no explicit 已儲存 (the felt save-moment + recap is Story 2.6's scope).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review to run on Fable 5 (bmad-code-review pin).

### Debug Log References

- `swift build` (MapsakeKit) — clean.
- `swift test` (MapsakeKit) — 45 tests pass (14 new: `CaptureWriteTests` ×3, `FineTuneViewModelTests` ×11 incl. 2 review-patch tests).
- `xcodebuild build -scheme Mapsake -destination 'generic/platform=iOS Simulator'` — **BUILD SUCCEEDED** (re-run post-patch).
- `xcodebuild test -scheme Mapsake -destination 'platform=iOS Simulator,name=iPhone 17'` — **TEST SUCCEEDED** (one transient xctrunner launch hiccup auto-retried).
- `swiftlint lint` — exit 0 (no-literal + Supabase-boundary rules clean, post-patch).
- `scripts/check-candidate-strings.sh` — RED (9 candidate strings await Simon's FR28 blessing — expected).

### Completion Notes List

- **Architecture (seams in MapsakeModels, live impls app-side, mirrors SearchViewModel):** `ReverseGeocoder`+`PlacePreview`, `CaptureWriter`+`CaptureWrite`+`CaptureWritePlanner`, and `FineTuneViewModel` (@Observable @MainActor) live in the extension-safe, dependency-free MapsakeModels — so the debounce + write state machine + the proximity-merge decision are unit-tested off the network. Live `CLGeocoder` and the `PinRepository`/`VisitRepository` wrappers are app-side (CoreLocation/Supabase never enter MapsakeModels).
- **Proximity merge (Simon's decision):** `VisitedMatcher` gained a coordinate overload; `FineTuneViewModel.confirm` re-runs the ~150m match against the FINAL nudged coordinate → a match writes a `VisitInsert` on that pin, no match writes a `PinInsert`. Exactly one write. Verified by `nudgingIntoAnExistingPinFlipsTheDecisionToAVisit`.
- **Codes:** `country_code` from `CLPlacemark.isoCountryCode` (via `PlacePreview`); `region_code` from the fine-tune map's `regions-fill` layer (`visibleFeatures(at:)` → promoted `iso`), resolved at confirm and passed into `confirm(regionCode:)`. Both NULL-tolerant (a bare pin is valid).
- **Calm write (NFR4/AC4):** confirmed write (await → then success); failure → `saveFailed(retryable:)`, retains the entry, primary re-tap retries, a nudge clears the failure; no loss message, no 錯誤/失敗 noun, no red fill. Confirm is inert once `.saving`/`.saved` (no double-write).
- **Deviations / judgment calls (flag for review):**
  1. `PlacePreview` omits `regionCode` (not derivable from a placemark) — region is sourced from the map instead. Cleaner single-responsibility seam than a perpetually-nil field.
  2. Search selection now ALWAYS opens fine-tune (both visited + unvisited), replacing 2.2's fly-to; the FR21 visited browse-jump moves to Epic 4. Matches the story's "instead of only flying… open fine-tune."
  3. Added a 5th candidate `finetune.untitledPlace` (fallback pin name) not in Task 7's list — a `pins.name` is structurally required, so a long-press whose geocode fully fails still needs a name. Injected into the VM as a String (MapsakeModels can't reach the catalog).
- **On-device eyeball (Simon-gated):** live zh-TW reverse-geocode text quality, the drag/tap/VO-nudge feel, and the region-query hitting the right admin1 — all need a booted sim/device (the package tests stub these seams).
- **Simon-gated to go green:** bless the 9 FR28 candidates (`finetune.dragHint/research/untitledPlace/pinLabel/nudgeUp/nudgeDown/nudgeLeft/nudgeRight`, `capture.saveFailed` — flip `needs_review`→`translated`, strip `CANDIDATE:`); apply the 1.4 multi-visit migration (`supabase db push`) so a real write lands against the deployed schema.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Packages/MapsakeKit/Sources/MapsakeModels/ReverseGeocoder.swift`
- `Packages/MapsakeKit/Sources/MapsakeModels/CaptureWrite.swift`
- `Packages/MapsakeKit/Sources/MapsakeModels/FineTuneViewModel.swift`
- `Packages/MapsakeKit/Sources/MapsakeTestSupport/FakeReverseGeocoder.swift`
- `Packages/MapsakeKit/Sources/MapsakeTestSupport/FakeCaptureWriter.swift`
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/CaptureWriteTests.swift`
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/FineTuneViewModelTests.swift`
- `Mapsake/Features/Capture/FineTune/LiveReverseGeocoder.swift`
- `Mapsake/Features/Capture/FineTune/LiveCaptureWriter.swift`
- `Mapsake/Features/Capture/FineTune/FineTuneMapView.swift`
- `Mapsake/Features/Capture/FineTune/FineTuneScreen.swift`

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/VisitedMatcher.swift` (coordinate overload)
- `Packages/MapsakeKit/Sources/MapsakeDesign/Localization/L.swift` (5 candidate keys)
- `Packages/MapsakeKit/Sources/MapsakeDesign/Resources/Localizable.xcstrings` (5 candidate strings)
- `Mapsake/Features/Map/Views/MapLibreMapView.swift` (long-press recognizer + callback)
- `Mapsake/Features/Map/Views/MapScreen.swift` (two entries → fine-tune via CaptureRoute cover)

## Change Log

- 2026-07-19 — 2.3 implemented (dev-story, Opus 4.8): reverse-geocode seam + live CLGeocoder, proximity-merge create-visit write (new pin vs added visit, re-checked at final coord), fine-tune screen (draggable/tap/VO-nudge pin + plain-text address + 選擇地點/重新搜尋), long-press + search entries. 43 MapsakeKit tests green, app build + SwiftLint green, 5 FR28 candidates pending blessing. Status → review.
- 2026-07-19 — code-review (Fable 5, 3 adversarial layers): 11 patches applied — VoiceOver nudge rebuilt (4 localized L-key custom actions + label, dropped the broken `.adjustable`), confirm now awaits the in-flight geocode so codes match the final coord, region query recenters before `visibleFeatures`, double-tap no longer teleports the pin, `重新搜尋` disabled while saving, `.canceling` drag is a no-op, `isPreviewing` generation-guarded, move/nudge guarded during save, coordinates clamped, coordinator `parent` refreshed, dead `map.longPressCapture` removed. 5 deferred (geocoder throttling, cover cancel, cover identity-swap, FR21 browse, empty-geocode sheet), 3 dismissed. 45 MapsakeKit tests green (2 new), app build + SwiftLint green, 9 FR28 candidates pending blessing (added 5 a11y strings, removed 1). Status → done.
