# Story 1.6: Derived visited fill & geographic clusters

Status: ready-for-dev

## Story

As a traveler,
I want the regions I've been to shown as visited, with pins grouped by geography,
so that my map reads as a personal atlas even before I add anything on iOS.

## Acceptance Criteria

**AC1 — Derived visited fill (memories ∪ legacy marks), read-only on iOS**
Given existing pins and legacy web region-marks,
When the map renders,
Then the visited fill is derived from **memories (pins) ∪ legacy region-marks** (read-only on iOS — no region-marking gesture), shown as terracotta `terracotta-hero`.

**AC2 — Always-on hatch (never color alone, NFR8)**
Given a visited region,
Then a screen-space, zoom-stable **hatch texture** overlays it, so visited is never signaled by color alone (NFR8 / UX-DR6).

**AC3 — Geographic clusters with counts**
Given a zoomed-out map with pins,
Then pins cluster **by geography** — one aggregate pin per region/country carrying the count of memories inside — and tapping it dives in (zooms to that region); close zoom shows individual pins.

## Tasks / Subtasks

- [ ] **Task 1 — Read the visited data** (AC: 1)
  - [ ] `MapsakeData`: a `RegionMarkRepository` (read `region_marks`: `region_code, country_code, level`) alongside the existing `PinRepository`. Add a `RegionMark` read struct (explicit CodingKeys).
  - [ ] Derive the visited ISO sets: **admin1** = `{pin.region_code} ∪ {mark.region_code where level=admin1}`; **country** = `{pin.country_code} ∪ {mark.region_code where level=country}`. Read-only (iOS never writes region_marks).
- [ ] **Task 2 — Apply visited fill + hatch to the map** (AC: 1, 2)
  - [ ] Drive the `regions`/`countries` fill by a runtime style expression: `iso ∈ visitedSet → terracotta-hero, else land` (feature-state is unreliable on maplibre-native iOS; use an `IN`/`match` expression over the visited ISO list, updated when data loads). Mirror the ADM0/ADM1 land model (regions for admin1, countries for country-level).
  - [ ] Add the **always-on hatch**: a programmatically-drawn hatch image (`MLNStyle.setImage`), applied as a `fill-pattern` on visited features (opacity driven by the same visited expression). Screen-space so it's zoom-stable. (Port v1's `createVisitedHatch` geometry from `features/map/lib/visited.ts`.)
  - [ ] AA: the visited swatch is certified (DESIGN 3.22:1 for boundary legibility); the hatch is the non-color cue.
- [ ] **Task 3 — Geographic clusters** (AC: 3)
  - [ ] Bundle `region-centroids.json` (from `travel-map/features/places/region-centroids.json`). Group the user's pins by region (admin1) and country; compute counts.
  - [ ] Render **one aggregate cluster marker per region/country at its centroid** with the memory count (the `cluster-pin` component from Story 1.2 — terracotta pill + cream count). This is **geographic** grouping (by region), NOT MapLibre's proximity clustering.
  - [ ] Zoom behavior: below a region-grain zoom, show country/region aggregates; at close zoom, show **individual pins** (the standard pin-marker). A zoom threshold governs the swap.
  - [ ] Tap a cluster → **dive in** (animate the camera to that region's bounds). Tap uses the map's gesture → hit-test the marker → camera fly (Reduce-Motion → jump).
- [ ] **Task 4 — Verify** (AC: 1, 2, 3)
  - [ ] Seed a few pins/marks on the dev backend (or a test principal), run on the sim, screenshot: visited regions terracotta + hatch; cluster counts at zoomed-out; individual pins at close zoom; tapping a cluster zooms in.

## Dev Notes

### Read-only on iOS — visited fill is fully derived

Region-marking as a *user action* is removed on iOS (FR3). The visited fill is **derived** from memories ∪ legacy web region-marks and is read-only. iOS never inserts/updates `region_marks` (those rows come from the web client's history). The map's `tap` always reads (open pin / dive into cluster), never writes.
[Source: epics.md#Story 1.6; PRD FR3]

### The visited-set derivation (port from v1 `features/map/lib/visited.ts`)

- **admin1 visited** = union of every pin's `region_code` (non-null) and every `region_marks` row with `level = 'admin1'` (its `region_code`).
- **country visited** = union of every pin's `country_code` and every `region_marks` row with `level = 'country'`.
- Apply admin1 codes to the `regions` source-layer, country codes to the `countries` source-layer (matching the ADM0/ADM1 land model + `promoteId = iso`).
- `region_marks` schema: `user_id, level ('country'|'admin1'), region_code, country_code` (owner-RLS). The iOS read is RLS-scoped to the current principal.
[Source: travel-map/features/map/lib/visited.ts; travel-map/supabase/migrations/20260621120000_init_profiles_region_marks.sql]

### maplibre-native iOS: expression, not feature-state

The v1 web uses `feature-state` for visited fill; **maplibre-native iOS support for feature-state is unreliable**, which is exactly why AR21 chose the `UIViewRepresentable` (full runtime-styling API). Drive the fill with an `NSExpression` (`MLNFillStyleLayer.fillColor`) that tests membership of the tile feature's `iso` in the visited list, and update it when the data loads. Same pattern for the hatch layer's opacity.
[Source: architecture.md#Frontend (iOS) Architecture — Map; Story 1.5 AR21 decision]

### Geographic clustering ≠ proximity clustering

FR2 is explicit: cluster **by geography, not proximity** — one aggregate pin per region/country carrying the count, NOT MapLibre's radius-based geojson clustering (which v1 used). Group pins by `region_code`/`country_code`, place a marker at the region/country **centroid** (`region-centroids.json`), label it with the count. At close zoom, individual pins replace the aggregates. Tapping an aggregate flies the camera to the region.
[Source: epics.md#Story 1.6 (FR2); PRD FR2]

### Components + tokens (from Story 1.2)

`cluster-pin` (terracotta pill, cream count 15/700 + 個回憶 11/500, cream border, shadow; visual ≥40px, hit ≥44pt) and `pin-marker` (terracotta teardrop, cream inner dot) — the DESIGN specs. For 1.6, a circle marker is an acceptable first cut if the teardrop is fiddly (v1 shipped circles first); note the deferral. Colors: visited fill = `terracotta-hero #B5663E`; cluster/marker = `terracotta #9E4F2B`.
[Source: DESIGN.md#Components; travel-map/features/map/style.ts (v1 pin/cluster layers)]

### What 1.6 does NOT include

Tap-to-**open a pin's memory sheet** (that's Epic 2's sheet substance) — 1.6's pin tap can select/no-op or is deferred; the cluster tap (dive-in) is the required interaction. Long-press capture is Epic 2. The teardrop pin polish + small-region pin fallback (UX-DR6) can be deferred with a note.
[Source: epics.md#Story 1.6, #Epic 2]

### Learnings carried

- Build/verify from the terminal; run + screenshot on the sim. The map is a `UIViewRepresentable` over `MLNMapView` (Story 1.5) — extend its `makeUIView`/coordinator with the visited expression + cluster markers + tap handling (an `MLNMapViewDelegate` in a Coordinator).
- Reads go through `MapsakeData` repos (RLS-scoped to the anon principal from Story 1.3); the map view takes the derived data, never Supabase.
- New app files auto-join the target (synchronized groups). Bundle `region-centroids.json` like the tiles.
- Reduce-Motion: the camera fly on cluster-tap degrades to a jump (route through the motion gate / check `accessibilityReduceMotion`).

### Project Structure Notes

```
mapsake-ios/Mapsake/Features/Map/
├── ViewModels/MapViewModel.swift     # @Observable: loads pins + region-marks, derives visited sets + cluster groups
├── Views/MapLibreMapView.swift        # + Coordinator (MLNMapViewDelegate): apply visited expr, place cluster markers, tap→dive
├── Views/VisitedHatch.swift           # programmatic hatch image
└── lib/GeographicClusters.swift       # group pins by region/country → [ClusterMarker] at centroids
Mapsake/Resources/region-centroids.json
MapsakeData: RegionMarkRepository + RegionMark struct
```

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 1.6: Derived visited fill & geographic clusters]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Frontend (iOS) Architecture]
- [Source: travel-map/features/map/lib/visited.ts, features/map/style.ts, features/places/region-centroids.json]
- [Source: travel-map/supabase/migrations/20260621120000_init_profiles_region_marks.sql — region_marks schema]
- [Source: _bmad-output/implementation-artifacts/mapsake-v2/1-5-read-only-map-pan-zoom.md — the MapLibre view to extend]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
