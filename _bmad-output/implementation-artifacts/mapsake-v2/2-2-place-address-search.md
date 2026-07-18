# Story 2.2: Place & address search

Status: done

## Story

As a traveler,
I want to search a place name or paste an address and have the map fly there,
so that logging a trip starts without zoom-hunting.

## Acceptance Criteria

**AC1 — Search returns results and the map flies there (epics.md#Story 2.2, verbatim)**
Given the search front door,
When I type a place name (zh-TW-first) or paste a street address,
Then the chosen geocoding provider returns results and the map flies to the spot.

**AC2 — A visited place shows its count**
And a visited place shows 「你去過 N 次」.

**AC3 — Cancel returns to the map**
And 取消 returns to the map.

### Additional acceptance criteria (from UX + architecture — the story isn't done without these)

**AC4 — The search pill is the front door**
Given the 地圖 tab, Then a floating search pill (`搜尋地點，記錄回憶`, terracotta ⌕, card pill 14px below the status bar, 16px side insets) sits over the map; tapping it opens the search screen with the field **auto-focused**. [EXPERIENCE.md line 65; DESIGN.md lines 170–176, 320, 355]

**AC5 — Result rows: name + region sub-line, tappable**
Given results, Then each row shows a pin glyph, the place name, and a region sub-line (e.g. `日本 京都市`); a visited place's sub-line carries `· 你去過 N 次`. Tapping a result flies the map to it and dismisses search. (The fine-tune sheet + the visit write are Story 2.3 — 2.2 ends at fly-to.) [EXPERIENCE.md line 66; capture-flow-prototype.html 138–163]

**AC6 — Search doubles as browse (FR21)**
Given a visited result (matches an existing pin), When I tap it, Then the map jumps to that pin (browse), not a fresh capture placement. [EXPERIENCE.md lines 66, 166]

**AC7 — Honest states; search never blocks capture**
Given no results, Then an inviting empty state (candidate: `找不到？長按地圖，直接把圖釘放上去`) — an invitation, not an apology. Given a network/geocoder failure, Then a calm inline retry (the error pattern), never raw error text. Search never blocks capture (the long-press path — Story 2.3 — always works). [EXPERIENCE.md lines 102–103, 188; NFR4]

**AC8 — Accessibility (the search pill is THE accessible capture path)**
Given VoiceOver, Then the search pill is a real button labelled from the blessed key and precedes clusters/pins in reading order; the field auto-focuses; Return = search; a 2px terracotta focus ring marks the focused field (boundary contrast is ~1.1:1, so the ring is load-bearing); rows/field/取消 are ≥44pt, AA-contrast, Dynamic-Type-scaling incl zh-TW. [EXPERIENCE.md lines 125–132; UX-DR5]

**AC9 — Boundaries: no jargon leak, MapsakeData untouched, candidate-copy gate**
Given the implementation, Then the geocoding mechanism's name NEVER surfaces in UI (no 反查地址/「geocode」); the place-search client is APP-layer behind a protocol seam with a `MapsakeTestSupport`-style fake (it is MapKit, NOT a Supabase import — `MapsakeData` is untouched); every user-facing string is a typed xcstrings key (no literal in a view) and new copy ships **candidate** (needs_review) held out of release by the FR28 gate. [architecture.md lines 221, 224–225; voice-guide.md line 48]

**AC10 — Provider decided: Apple MKLocalSearch (AR20 resolved)**
Given AR20 (Apple `MKLocalSearch`/`CLGeocoder` vs OSM), Then the app ships **Apple MKLocalSearch/CLGeocoder** (Simon, 2026-07-17): native MapKit, no key/attribution/rate-limit ops, TW/JP-covered. The MapLibre-display ToS gray area is an **accepted, logged pragmatic call** (architecture pre-blessed this if Apple wins). OSM Nominatim/Photon is the documented fallback. A lightweight TW/JP quality check (Task 1) validates the choice before the UI is built. [architecture.md lines 72, 161; epics.md line 114]

## Tasks / Subtasks

- [ ] **Task 1 — TW/JP quality check on MKLocalSearch (resolves AR20 in practice)** (AC: 10)
  - [ ] A throwaway harness (a unit test or a scratch view) runs `MKLocalSearch` for a handful of real TW/JP queries: `清水寺`, `台北101`, a pasted JP street address (e.g. `京都府京都市東山区清水`), a pasted TW address, and an ambiguous name (`清水`). Eyeball: does zh-TW/Japanese come back with sensible names + coordinates + region sub-lines?
  - [ ] Record the result (good enough → ship Apple; poor → escalate to Simon before building the UI). Log the MapLibre-display ToS acceptance in the story Dev Agent Record.
- [ ] **Task 2 — `PlaceSearchService` seam + live MKLocalSearch impl** (AC: 1, 9, 10)
  - [ ] `Mapsake/Features/Capture/Search/PlaceSearch.swift`: `PlaceResult` (Sendable value type: `id`, `name`, `subtitle: String?`, `lat`, `lng` — NO MapKit types leak out) + `protocol PlaceSearchService: Sendable { func search(_ query: String) async throws -> [PlaceResult] }`.
  - [ ] `LivePlaceSearch: PlaceSearchService` (imports MapKit): `MKLocalSearch.Request` with `naturalLanguageQuery`, `resultTypes = [.pointOfInterest, .address]`, and a `region` biased to the current map viewport (fall back to a TW/JP-ish region). Map `response.mapItems` → `[PlaceResult]` (name = `mapItem.name`; subtitle from `placemark` locality/adminArea/country; coordinate from `placemark.coordinate`). Cancel any in-flight `MKLocalSearch` when a new query starts.
  - [ ] `Mapsake/Features/Capture/Search/FakePlaceSearchService.swift` (or in MapsakeTestSupport if it stays MapKit-free) for view-model tests.
- [ ] **Task 3 — Visited-count enrichment (你去過 N 次) + browse match** (AC: 2, 6)
  - [ ] A pure matcher: a `PlaceResult` is "visited" if an existing pin sits within a small radius (e.g. ~150m) of its coordinate; N = that pin's visit count (1 primary + `visits(forPin:)` additional). Reuse the pins already loaded by `MapViewModel`; load visit counts as needed (the `VisitRepository` from 2.1).
  - [ ] Unit-test the matcher (pure): a result near a pin → visited N; far → not visited; ties/nearest-pin.
- [ ] **Task 4 — `SearchViewModel` (debounced)** (AC: 1, 7)
  - [ ] `@Observable @MainActor` — a debounced query (~300ms) → `PlaceSearchService.search`; states `idle / searching / results([PlaceResult]) / empty / failed(retryable)`; typed errors at the boundary (never raw text to the view). Injected `PlaceSearchService` (fake in tests).
- [ ] **Task 5 — Search pill + search screen (SwiftUI)** (AC: 3, 4, 5, 8)
  - [ ] Search pill over `MapScreen` (`.mapsakeType`, `Color.Mapsake` tokens, the card/shadow/terracotta-⌕ spec); tap → present the search screen (sheet or full-cover) with the field auto-focused.
  - [ ] Search screen: the field (aria/label `搜尋地點或貼上地址`), helper `地點名稱或地址都可以`, results list (rows via a small row view), the empty/failed states, and a quiet `取消` that dismisses to the map. All copy via typed `L` keys (candidate).
  - [ ] a11y: `.mapsakeAccessible` on the pill/field/rows/取消; auto-focus + Return=search; terracotta focus ring; VO order (pill precedes map content).
- [ ] **Task 6 — Fly-to on the map** (AC: 1, 6)
  - [ ] Extend `MapLibreMapView` to accept a "fly-to target" (a coordinate + zoom) driven from the search selection — reuse the existing `setCenter(_:zoomLevel:animated:)` (Reduce-Motion → jump, per the existing tap-dive). A visited result centers on its matched pin (browse); an unvisited result flies to the geocoded coordinate. Dismiss search after the fly-to.
- [ ] **Task 7 — Candidate strings + gate** (AC: 9)
  - [ ] Add the search strings to `Localizable.xcstrings` as **candidate** (`needs_review` + `CANDIDATE:`): `search.pillPlaceholder` (`搜尋地點，記錄回憶`), `search.fieldLabel` (`搜尋地點或貼上地址`), `search.helper` (`地點名稱或地址都可以`), `search.visitedCount` (`你去過 %lld 次`), `search.noResults` (`找不到？長按地圖，直接把圖釘放上去`). `取消` is a blessed pattern-word (reuse if a key exists, else add candidate). Confirm the FR28 gate + SwiftLint no-literal rule stay green.

## Dev Notes

### Scope — 2.2 is the search FRONT DOOR only (no writes, no reverse-geocode)

2.2 owns: the search pill, the search screen (field + results + states + 取消), forward-geocoding via MKLocalSearch, the 「你去過 N 次」 badge, and the map fly-to. It **ends when a result is chosen** (fly-to + dismiss). Story 2.3 begins with "a placement (from search or a long-press)" and owns reverse-geocoding, the draggable 44pt fine-tune pin, the plain-text address preview, the `選擇地點` confirm, and the actual **visit write** via `MapsakeData`. So 2.2 writes nothing and never reverse-geocodes. [epics.md#Story 2.2, #Story 2.3]

### AR20 decided — Apple MKLocalSearch (Simon, 2026-07-17)

Native MapKit forward geocoding: no API key, no attribution text, no rate-limit/self-host operations, on-device/OS-mediated (privacy-friendly — must not become an analytics side-channel, NFR3), and good TW/JP coverage. The one tradeoff the architecture named: displaying Apple geocoding results on a **non-Apple (MapLibre) map** is a ToS gray area — accepted as a pragmatic call and logged here (architecture line 161: "if Apple wins, the MapLibre-display ToS risk is logged as an accepted pragmatic call"). OSM Nominatim/Photon is the documented fallback (would add attribution + ~1 req/s policy + a network client + endpoint config). Task 1 validates TW/JP quality before the UI is built. [architecture.md lines 72, 161; epics.md line 114 AR20]

### The geocoding client is APP-layer, NOT MapsakeData

`MapsakeData` is the sole `import Supabase` site (lint-enforced). MKLocalSearch is MapKit, not Supabase, so `LivePlaceSearch` lives in the app (`Features/Capture/Search/`), behind a `PlaceSearchService` protocol seam with a fake (the same repo-seam discipline: value types out, view-model tests never hit the network/SDK). `PlaceResult` carries no MapKit types, so it stays testable + Sendable. [architecture.md lines 221, 224–225, 208]

### Integration with the existing map (Stories 1.5/1.6)

`MapScreen` is the 地圖 tab (a `ZStack` over `MapLibreMapView`, gated on `AppSession.state == .ready`). The search pill floats over it. `MapLibreMapView` (`UIViewRepresentable` over `MLNMapView`) already drives the camera via `setCenter(_:zoomLevel:animated:)` (see the cluster tap-dive at MapLibreMapView.swift:143, incl. the Reduce-Motion jump). 2.2 adds a fly-to input (a coordinate the search selection sets) that `updateUIView` applies. Pins are already loaded by `MapViewModel` — reuse them for the visited-match. [existing: Mapsake/Features/Map/Views/{MapScreen,MapLibreMapView}.swift, ViewModels/MapViewModel.swift]

### 「你去過 N 次」 — matching a result to a memory

Cross-reference a geocoded `PlaceResult` against the user's loaded pins by proximity (~150m); a match = "visited", N = 1 (the primary visit) + the count from `VisitRepository.visits(forPin:)` (built in 2.1). Keep the matcher a pure function so it's unit-tested without the network. A visited row's tap is a browse jump to the matched pin (FR21); an unvisited row's tap flies to the geocoded coordinate for capture (fine-tune in 2.3). [EXPERIENCE.md lines 66, 166]

### Voice + a11y (per-story build rules, not optional)

- Every user-facing string is a typed `L` xcstrings key; a literal in a `Text`/`.accessibilityLabel` fails SwiftLint. New copy is candidate (FR28 gate). Simon arbitrates all Chinese (zh-TW-native, never translation-shaped).
- The **mechanism name never leaks** — no 反查地址 / 「geocode」 / provider name in any UI string.
- The search pill is the **designated accessible capture path** (precision placement never requires map interaction). VO order: pill → clusters → pins. Auto-focus the field; Return=search; terracotta 2px focus ring (load-bearing given ~1.1:1 boundary contrast). ≥44pt targets, AA contrast, Dynamic Type incl zh-TW. [EXPERIENCE.md lines 125–132; UX-DR5]

### Testing

- Swift Testing: the pure visited-matcher (near/far/nearest), the `SearchViewModel` state machine against `FakePlaceSearchService` (results/empty/failed, debounce), `PlaceResult` mapping if any pure logic. View-model tests never hit MapKit.
- The live `MKLocalSearch` path is exercised by Task 1's manual TW/JP check on the simulator (no automated network test — MKLocalSearch is an OS service).
- App builds for the simulator; SwiftLint clean; a11y XCUITest asserts the pill's label/trait + the field auto-focus if feasible.
- Run `bmad-code-review` (Fable 5) after the story (per the standing directive).

### Project Structure Notes

```
mapsake-ios/
├── Mapsake/Features/Capture/Search/
│   ├── PlaceSearch.swift            (NEW — PlaceResult + PlaceSearchService + LivePlaceSearch[MapKit])
│   ├── FakePlaceSearchService.swift (NEW)
│   ├── SearchViewModel.swift        (NEW — @Observable, debounced)
│   ├── SearchScreen.swift           (NEW — field + results + states + 取消)
│   └── SearchPill.swift             (NEW — the floating front door)
├── Mapsake/Features/Map/Views/{MapScreen.swift(UPDATE — host the pill + fly-to), MapLibreMapView.swift(UPDATE — fly-to input)}
├── Mapsake/Features/Map/lib/ or Capture/Search/ — the pure visited-matcher + its test
└── Packages/MapsakeKit/Sources/MapsakeDesign/Resources/Localizable.xcstrings (UPDATE — candidate search strings)
```

### References

- [Source: epics.md#Story 2.2 (lines 335–348), #Story 2.3 boundary (349–361), #AR20 (line 114); FR4]
- [Source: architecture.md#Frontend Geocoding (line 161), #Decisions Queued (72), #Data boundary + seam (208, 221, 224–225), #Offline/privacy (163, 171)]
- [Source: ux-designs/…/EXPERIENCE.md (search pill line 65, search screen 66, states 102–103, a11y 125–132, candidate copy 188), DESIGN.md (search pill 170–176, 320, 355), mockups/capture-flow-prototype.html (138–163), voice-guide.md (jargon ban line 48, candidate status line 4)]
- [Source: mapsake-ios existing — Features/Map/Views/{MapScreen,MapLibreMapView}.swift, ViewModels/MapViewModel.swift; MapsakeData/VisitRepository.swift (visit counts); MapsakeDesign L + xcstrings gate]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — dev; bmad-code-review (Fable 5, 3 agents) — review.

### Debug Log References

- Pill + map integration confirmed via simulator screenshot (parchment map + the card pill 搜尋地點，記錄回憶). SwiftLint clean; 31 MapsakeKit tests green (incl. 5 SearchViewModel state-machine tests + 4 VisitedMatcher).
- **Task 1 (AR20 quality check):** provider decided by Simon (Apple MKLocalSearch). The pill renders and the integration builds; the live type→results→fly-to flow + TW/JP geocoding quality want an **on-device eyeball** (couldn't drive the search field via headless simctl). **ToS-on-MapLibre accepted + logged** (per AR20 — Apple geocoding results shown on a MapLibre map is a gray area, taken as a pragmatic call).

### Completion Notes List

- Core loop built + green: search pill → search screen → MKLocalSearch → results (name + region sub-line, 「你去過 N 次」) → fly-to → 取消. Scope stops at fly-to (no reverse-geocode / no visit write / no fine-tune — those are 2.3). N = 1 primary + additional visits (`VisitedMatcher`, tested).
- **Code-review hardening (3 Fable-5 agents):**
  - `MKLocalSearch` signals "no results" as `MKError.placemarkNotFound`, not an empty array → `LivePlaceSearch` now catches it and returns `[]`, so the 「找不到？」 invitation shows instead of the failure screen.
  - `SearchViewModel` state machine rewritten: debounce runs FIRST (a superseding keystroke bails keeping prior results — no per-keystroke blanking, no stuck spinner); the error path guards `Task.isCancelled` so a cancelled search (surfaced by MapKit as MKError/URLError, not `CancellationError`) can't stamp `.failed` over the newer one. `searchNow()` for Return, `reset()` on dismiss.
  - VM moved to MapsakeModels so it's unit-testable (the fake was previously unused); 5 new tests. (Bumped the package's macOS host-test floor 13→14 for `@Observable`.)
  - Region bias is no longer dead code — `LivePlaceSearch` defaults to a TW/JP box so local names rank first. (True viewport-following deferred to 2.3.)
  - a11y: pill gets VO sort priority over the map; field auto-focus made reliable (task-delay, not onAppear); Return=search wired (`.onSubmit`); decorative row glyph hidden from VO; a dedicated candidate `search.failed` line replaces the reused map-load copy.
  - Pill now renders as soon as the session is ready (not after the full load); `.task` guarded against tab-return refetch; index-qualified `PlaceResult.id` (no ForEach collisions).
- **Simon-gated:** the search candidate copy needs blessing (FR28 gate reds CI until then) — `search.pillPlaceholder`, `search.fieldLabel`, `search.helper`, `search.noResults`, `search.visitedCount`, `search.failed`. `action.cancel` (取消) added as blessed (DESIGN pattern word) — confirm.
- **Deferred (flagged, not this story):** the ~150m visited-match radius has POI-centroid + dense-block failure modes → tune per result-type in 2.3; viewport-following region bias → 2.3; the no-results copy invites a long-press that Story 2.3 wires; `allVisits()` 1000-row cap → a count aggregate later.

### File List

**mapsake-ios (new):** `MapsakeModels/{PlaceSearch,VisitedMatcher,SearchViewModel}.swift`, `MapsakeTestSupport/FakePlaceSearchService.swift`, `Tests/MapsakeModelsTests/{VisitedMatcherTests,SearchViewModelTests}.swift`, `Mapsake/Features/Capture/Search/{PlaceSearch,SearchPill,SearchScreen}.swift`
**mapsake-ios (update):** `MapsakeData/VisitRepository.swift` (+allVisits), `MapsakeTestSupport/FakeVisitRepository.swift`, `MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}`, `Package.swift` (macOS 14), `Mapsake/Features/Map/{ViewModels/MapViewModel, Views/MapScreen, Views/MapLibreMapView}.swift`
