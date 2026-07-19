# Story 2.3: Fine-tune placement & create the visit

Status: ready-for-dev

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

- [ ] **Task 1 — Reverse-geocode seam + live CLGeocoder** (AC: 1, 7, 8)
  - [ ] `Mapsake/Features/Capture/FineTune/ReverseGeocoder.swift`: `PlacePreview` (Sendable value: `name: String?`, `addressLine: String`, `countryCode: String?`, `regionCode: String?` where derivable) + `protocol ReverseGeocoder: Sendable { func lookup(lat: Double, lng: Double) async throws -> PlacePreview }`. Put the value type + protocol in MapsakeModels (testable), the live impl app-side.
  - [ ] `LiveReverseGeocoder` (CoreLocation): `CLGeocoder().reverseGeocodeLocation` → build a **plain-text** address line from the localized placemark fields (zh-TW on a zh-TW device); `countryCode` = `placemark.isoCountryCode`. Never surface the mechanism name.
  - [ ] `FakeReverseGeocoder` in MapsakeTestSupport (no CoreLocation).
- [ ] **Task 2 — Region/country derivation at write time** (AC: 5)
  - [ ] `country_code` from the reverse-geocode's `isoCountryCode` (alpha-2, matches the tiles' country iso).
  - [ ] `region_code` (ISO-3166-2) by querying the map's `regions` boundary source at the final coordinate — `MLNMapView.visibleFeatures(at:styleLayerIdentifiers:["regions-fill"])` reads the same `iso` attribute the visited fill uses (reuse the PMTiles data rather than a name→code table). Both NULL-tolerant.
- [ ] **Task 3 — The create-visit write (MapsakeData)** (AC: 3, 4)
  - [ ] A capture write coordinator: given the final coordinate + resolved existing-pin (per §Decision) + name/codes, call `PinRepository.insert(PinInsert)` (new pin) OR `VisitRepository.insert(VisitInsert)` (existing pin) — both from Story 2.1. Confirmed write; map its result to `saving / saved / saveFailed(retryable:)`.
  - [ ] After a `saved`, refresh the map's pins so the new pin/visit appears (reuse `MapViewModel.load()` or an incremental add).
- [ ] **Task 4 — Long-press entry on the map** (AC: 2, 6)
  - [ ] Add a `UILongPressGestureRecognizer` to `MapLibreMapView` (alongside the existing tap-dive); on long-press, convert the point → coordinate and surface it to `MapScreen` (a callback/state) to open fine-tune. Read-only pan/zoom otherwise preserved.
- [ ] **Task 5 — Fine-tune screen + draggable/tap-to-move pin** (AC: 1, 6, 7)
  - [ ] `Mapsake/Features/Capture/FineTune/FineTuneScreen.swift`: a map centered on the placement with a 44pt terracotta pin overlay; **drag** to nudge + **tap-anywhere-to-move**; the `按住拖曳微調` hint; a `FineTuneViewModel` (@Observable, in MapsakeModels for testability) holding the coordinate + debounced reverse-geocode + the write state.
  - [ ] The sheet: place name (`.mapsakeType(.sheetHeading)` serif) + the plain-text address (`.note`/`.screenSubtitle`), `MapsakePrimaryButton(L.choosePlace /* 選擇地點, blessed */)`, and a quiet `重新搜尋` secondary.
  - [ ] a11y: VO nudge actions on the pin (`.accessibilityAdjustableAction`/custom actions up/down/left/right), `.mapsakeAccessible` on the confirm/secondary, the pin ≥44pt.
- [ ] **Task 6 — Wire the entries into MapScreen** (AC: 2)
  - [ ] From Story 2.2's search selection: instead of only flying to the coordinate, open fine-tune (carry the `VisitedMatch` if present). From long-press: open fine-tune at the pressed coordinate. Present fine-tune (sheet/cover); on 選擇地點, run the write; on `saved`, dismiss + refresh; on `重新搜尋`, return to search.
- [ ] **Task 7 — Candidate strings** (AC: 7, 8)
  - [ ] `選擇地點` is BLESSED (key `vocab.choosePlace` already exists as `L.choosePlace`). Add candidates: `finetune.dragHint` (`按住拖曳微調`), `finetune.research` (`重新搜尋`), `map.longPressCapture` (`在這裡記錄回憶`), and a calm `capture.saveFailed` line — all `needs_review` (FR28). Confirm the gate + no-literal SwiftLint rule stay honest (they redden CI until Simon blesses — expected).
- [ ] **Task 8 — Tests + review**
  - [ ] Unit (MapsakeModels/MapsakeTestSupport): the write-branch decision (new pin vs existing visit) against fakes; the `FineTuneViewModel` state machine (reverse-geocode debounce, `saving/saved/saveFailed`); the region/country derivation logic where pure. Live CLGeocoder + the map region-query are on-device (manual eyeball).
  - [ ] App builds for the simulator; SwiftLint clean; `bmad-code-review` (Fable 5) after.

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

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
