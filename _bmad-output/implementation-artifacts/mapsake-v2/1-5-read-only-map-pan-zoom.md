# Story 1.5: Read-only map with pan & zoom

Status: ready-for-dev

## Story

As a traveler,
I want to open the app and see a fluid world map,
so that I have the canvas my memories will live on.

## Acceptance Criteria

**AC1 — Parchment map via the v1 PMTiles pipeline**
Given the map tab,
When the app opens,
Then the map renders the parchment identity (ocean background, paper land, region/country borders, labels) from the v1 boundaries PMTiles, matching the v1 style's look.

**AC2 — Native pan + pinch-zoom fluidity (NFR1)**
Given the map,
When I pan and pinch-zoom,
Then it sustains ~60fps on an iPhone 12-class device with no frame-jolt (NFR1; no unexpected scale/viewport jumps).

**AC3 — Three-tab shell**
Given the app,
Then a three-tab bottom bar is present — **地圖 / 去過的地點 / 設定** — with the map on the 地圖 tab (the other two can be placeholder screens for now).

**AC4 — MapLibre integration approach decided + recorded (AR21)**
Given the FR1–3 map build,
Then the MapLibre integration approach (**MapLibreSwiftUI DSL vs a `UIViewRepresentable` over `MLNMapView`**) is decided, recorded (in this story's Dev Agent Record + a note in the repo), and justified against the needs of Story 1.6 (feature-state visited fill, the hatch fill-pattern, geographic cluster styling).

## Tasks / Subtasks

- [ ] **Task 0 — Resolve AR21 (the map-layer decision)** (AC: 4)
  - [ ] Decide DSL vs `UIViewRepresentable`. Weigh: 1.6 needs a **feature-state-driven fill** (visited), a **screen-space `fill-pattern` hatch**, and **custom cluster symbol layers** — confirm the chosen path exposes runtime style mutation + custom layers. Record the decision + rationale. (Recommendation to validate: a thin `UIViewRepresentable` over `MLNMapView` gives full access to the style/runtime-styling API the later stories need; the DSL is the fallback-to-raw pattern the architecture already anticipates.)
- [ ] **Task 1 — Add MapLibre + bundle the tiles** (AC: 1)
  - [ ] Add `maplibre-gl-native-distribution` (6.x, native PMTiles) to the **App** target (not MapsakeKit).
  - [ ] Bundle `boundaries.pmtiles` (copy from `travel-map/public/tiles/boundaries.pmtiles`) as an app resource; reference it via the native `pmtiles://` protocol (landed in maplibre-native iOS 6.10). Note the file size; if large, revisit bundling-vs-serving (offline read is Epic 4, so bundling is preferred).
- [ ] **Task 2 — The parchment style** (AC: 1)
  - [ ] Port the v1 style (`travel-map/features/map/style.ts`) to an iOS style JSON (bundled) or programmatic layers: background `ocean`, `countries`/`regions` fills = `land`, region/country lines = `border`, country/region labels. The **ADM0/ADM1 land model** (has_admin1 filter + `ADMIN1_TAKEOVER_ZOOM = 6`) must carry over so no cream coastal sliver appears. Colors are DESIGN tokens (values in Dev Notes).
  - [ ] CJK labels via `localIdeographFontFamily` (Noto/PingFang) + Latin glyphs; for now the demo glyph URL is acceptable (self-hosting + full offline glyphs is later polish / Epic 4).
- [ ] **Task 3 — The map screen** (AC: 1, 2)
  - [ ] A `Features/Map` SwiftUI screen hosting the MapLibre view (per Task 0), read-only: pan + pinch-zoom only. **No write gestures** (long-press capture is Epic 2). Default camera = world view (the saved default view is Epic 5; world for now).
  - [ ] Fluidity: confirm 60fps pan/zoom on a device/instrument; no frame-jolt on appear/transition (NFR1).
- [ ] **Task 4 — Three-tab shell** (AC: 3)
  - [ ] A `TabView` with 地圖 (the map), 去過的地點 (placeholder), 設定 (placeholder), styled per `tab-bar` (card-toned, terracotta active, 11pt labels — from Story 1.2 tokens). Tab labels come from typed `L` keys (add 設定 as a candidate string; 地圖/去過的地點 are blessed).
  - [ ] Replace the current `ContentView` design smoke screen with this shell as the app root.

## Dev Notes

### Where this builds — `mapsake-ios`, `Features/Map`

iOS app code in the `mapsake-ios` repo. `Features/Map/{Views,ViewModels}` per the feature-first structure. The map uses the design tokens from Story 1.2 and reads pins through `MapsakeData` from Story 1.3 (though **1.5 renders the base map only** — pins + visited fill are Story 1.6).
[Source: architecture.md#Frontend (iOS) Architecture; #Requirements → Structure Mapping]

### The parchment style tokens (from v1 `features/map/style.ts` — match exactly)

| Role | Hex | Style use |
|---|---|---|
| ocean (bg + sea) | `#EADFC8` | background-color |
| land (unvisited) | `#FBF4E4` | countries/regions fill |
| visited (1.6) | `#B5663E` | fill via feature-state (deferred to 1.6) |
| border | `#96835E` | region/country lines |
| label text | `#6F5C40` | symbol text-color |
| label halo | `#FBF4E4` | text-halo-color |

Layer order (v1): `bg` → country/region fills → (visited hatch — 1.6) → region/country lines → country/region labels → (pins — 1.6). The **ADM0/ADM1 land model** is load-bearing: countries WITH admin-1 render their country fill only below zoom 6 (`ADMIN1_TAKEOVER_ZOOM`); above it the ADM1 union is the land, so the coastline mismatch can't leak a cream sliver. Source `boundaries` has layers `countries`, `regions`, `country_labels`, `region_labels`; `promoteId = iso` (the feature-state key for 1.6's visited fill).
[Source: travel-map/features/map/style.ts]

### The AR21 decision — record it (AC4)

The architecture default is **MapLibreSwiftUI DSL**, "falling back to a `UIViewRepresentable` for anything the DSL doesn't expose (custom symbol layers for the visited hatch + geographic cluster pins)." Story 1.6 needs exactly those: feature-state visited fill, a screen-space hatch `fill-pattern`, and geographic cluster styling. So the decision is really "does the DSL expose enough, or start from the `UIViewRepresentable`?" **Decide here, record the rationale in the Dev Agent Record**, and add a short note in the iOS repo (e.g. `Features/Map/README` or a doc comment) so it's discoverable. If DSL, document the raw-fallback seam; if raw, the DSL is the documented alternative.
[Source: architecture.md#Frontend (iOS) Architecture — Map; #Decision Priority Analysis (deferred: MapLibreSwiftUI-DSL vs raw)]

### What 1.5 does NOT include (Story 1.6 + later)

- **Visited fill + the always-on hatch** (feature-state driven from memories ∪ legacy marks) → Story 1.6.
- **Geographic cluster pins + individual pins** → Story 1.6 (the `pins` source, cluster styling, counts).
- **Tap-to-open / dive-into-cluster** interactions → Story 1.6 / Epic 2.
- **Long-press capture** → Epic 2. **Saved default view** → Epic 5. Keep 1.5 read-only, base map + shell.
[Source: epics.md#Story 1.5, #Story 1.6]

### NFR1 fluidity + no frame-jolt

60fps pan/zoom on an iPhone 12-class device; capture interactions <100ms (not this story). **No unexpected scale/viewport jump ever** (the v1 login-zoom gripe, elevated to a principle) — the map appearing and any tab transition must not jolt the frame. maplibre-native renders on GPU; the main risk is doing heavy work on the main thread at appear.
[Source: PRD NFR1; DESIGN.md#Brand & Style — no viewport jumps]

### Learnings carried from 1.1–1.4

- Build/verify from the terminal (`DEVELOPER_DIR=…`); run on the sim with a normally-signed build; screenshot to confirm the map renders. `maplibre` needs a real GPU context — the sim provides one (unlike the v1 web e2e's SwiftShader workaround).
- Adding a **Swift package dependency** to the app target: Xcode **File → Add Package Dependencies** (GUI), or edit the app target's package refs. maplibre-native is a binary xcframework (iOS-only) — it will NOT build for the macOS host, so keep it out of MapsakeKit (which runs host unit tests) and off any `swift build`/`swift test` path.
- Synchronized groups are ON — new files under `Mapsake/Features/Map/` auto-join the app target.
- Strings go through typed `L` keys (SwiftLint blocks literals in views); add 設定 as a `needs_review` candidate for Simon.

### Project Structure Notes

```
mapsake-ios/Mapsake/
├── App/ (MapsakeApp.swift — root becomes the three-tab shell)
├── Core/AppShell.swift            # TabView: 地圖 / 去過的地點 / 設定
└── Features/
    ├── Map/Views/MapScreen.swift          # hosts the MapLibre view (read-only)
    ├── Map/Views/MapLibreMapView.swift     # UIViewRepresentable OR MapLibreSwiftUI (per AR21)
    ├── Map/parchment-style.json (or built in code)
    ├── Browse/Views/BrowsePlaceholder.swift  # 去過的地點 (Epic 4)
    └── Settings/Views/SettingsPlaceholder.swift  # 設定 (Epic 5)
Mapsake/Resources/boundaries.pmtiles    # bundled tiles (from travel-map/public/tiles)
```

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 1.5: Read-only map with pan & zoom]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Frontend (iOS) Architecture, #Decision Priority Analysis]
- [Source: travel-map/features/map/style.ts — the parchment style to port]
- [Source: travel-map/public/tiles/boundaries.pmtiles — the tiles to bundle]
- [Source: _bmad-output/implementation-artifacts/mapsake-v2/1-2-design-tokens-voice-accessibility-machinery.md — tokens, L keys, tab-bar]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
