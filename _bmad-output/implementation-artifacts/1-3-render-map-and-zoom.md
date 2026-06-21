# Story 1.3: Render the map + continuous zoom

Status: ready-for-dev

<!-- Validation optional. Run validate-create-story for a quality check before dev-story. -->

## Story

As a user,
I want a continuous parchment map I can fluidly zoom from world to admin-1,
so that I can find the places I've been.

## Acceptance Criteria

1. **Map renders from the PMTiles.** On app open, MapLibre GL renders the boundary tileset (`public/tiles/boundaries.pmtiles`, built in Story 1.2) via the `pmtiles://` protocol — the parchment-styled world map, with the `countries` and `regions` layers from those tiles.
2. **Parchment visual identity.** Background = canvas `#F2E8D5`; region borders = `#96835E`; unvisited land is the bare paper (no fill yet — visited fill arrives in Story 1.5). The map reads as the Mapsake atlas, not a default MapLibre basemap (no OSM raster, no default colors).
3. **Continuous zoom, three tiers.** One map, no mode toggle: countries carry the view at low zoom; admin-1 `regions` fade in from ~z3 (per-feature minzoom is already baked into the tiles). Pan/zoom is smooth across world → country → admin-1.
4. **World landing.** A returning user lands on the world view (chosen-view selection is Epic 4).
5. **zh-TW labels.** Region labels show `name_zh` (Traditional Chinese) where present, English `name` otherwise, rendered with the Noto Sans TC family. No tofu/boxes for CJK.
6. **Smooth on a mid-range phone.** Pan/zoom holds ~60fps at admin-1 (the de-risk spike acceptance) — verify on a phone viewport.

## Tasks / Subtasks

- [ ] **Task 0 — Dependencies (needs approval)**
  - [ ] Add `maplibre-gl` and `pmtiles` (runtime deps). **These are NEW deps → confirm before installing.** Import MapLibre's CSS (`maplibre-gl/dist/maplibre-gl.css`).
- [ ] **Task 1 — Register the PMTiles protocol once (AC: 1)**
  - [ ] In a root client provider (or a `features/map` hook), `import { Protocol } from "pmtiles"`, `maplibregl.addProtocol("pmtiles", protocol.tile)` inside a `useEffect([])`, with cleanup on unmount. Register exactly once for the app lifetime.
- [ ] **Task 2 — Map canvas component (AC: 1, 2, 4)**
  - [ ] `features/map/components/MapCanvas.tsx` — a **client component** (`'use client'`). `useRef` for the container, `useEffect` to `new maplibregl.Map({...})`, clean up on unmount. SSR-safe (MapLibre is browser-only; no import at module top-level that runs on server, or guard).
  - [ ] Style object: `background` paint = `var canvas #F2E8D5`; `glyphs` endpoint for Latin label fonts; **`localIdeographFontFamily: "'Noto Sans TC','Noto Sans CJK TC',sans-serif"`** so CJK labels render locally (no giant glyph download). Source `boundaries` = `{ type:"vector", url:"pmtiles:///tiles/boundaries.pmtiles" }` (dev path; prod = Supabase Storage URL — make it env-configurable).
  - [ ] Land on world view: `center:[0,20], zoom:1.5`.
- [ ] **Task 3 — Layers + zoom tiers (AC: 2, 3)**
  - [ ] `countries`: fill (transparent/paper) + line (border `#96835E`), visible all zooms; `regions`: fill (paper) + line (border), the tiles' baked minzoom makes admin-1 appear from ~z3. No mode toggle; one continuous map.
  - [ ] Confirm tiers flow world → country → admin-1 on zoom, over the shared tileset.
- [ ] **Task 4 — Labels (AC: 5)**
  - [ ] Symbol layers for `countries` + `regions`: `text-field` = `["coalesce", ["get","name_zh"], ["get","name"]]`; Nunito Sans/Noto Sans TC via glyphs + `localIdeographFontFamily`; muted color `#6F5C40`, sizes per DESIGN.md map-label. Latin labels may be tracked/uppercased; **Han labels must NOT be letter-spaced/uppercased**.
- [ ] **Task 5 — Page integration (AC: 1, 4)**
  - [ ] Replace the Story 1.1 sample `app/page.tsx` with the map (full-viewport `MapCanvas`). The map is the home surface.
- [ ] **Task 6 — Verify (AC: 1-6)**
  - [ ] Run the app; screenshot world + a zoomed-in admin-1 view (e.g. Japan prefectures, Taiwan counties) showing zh labels + borders on parchment.
  - [ ] Phone viewport: confirm smooth pan/zoom at admin-1 (the spike). A Playwright e2e in `e2e/` asserting the canvas renders + a region label is present.

## Dev Notes

### Depends on Story 1.2 (just built + reviewed)
- Tileset: `public/tiles/boundaries.pmtiles` — **two vector layers** `countries` (minzoom 0) + `regions` (admin-1, minzoom 3). Per-feature props: `iso` (ISO 3166-1 a2 / ISO 3166-2), `country`, `name`, `name_zh`. [Source: 1-2 File List + review]
- Region codes are **ISO** (`JP`, `JP-26`) — the same `iso` the visited-marks store (Story 1.4/1.5) will key on for feature-state. Use `iso` as the feature-state key. [Source: architecture#Data Architecture]
- Sample tileset covers TWN/JPN/USA only until the global run; that's fine for rendering + the perf spike.

### Stack & libraries (verified 2026-06)
- **maplibre-gl** + **pmtiles** (npm). Protocol pattern: register `new Protocol().tile` via `maplibregl.addProtocol("pmtiles", ...)` once in a `useEffect([])` at a root client provider; reference tiles as `pmtiles://…`. [Source: protomaps/maplibre docs; architecture#The Map subsystem]
- **Client-only:** MapLibre touches `window`; the map component is `'use client'` and constructs the map in `useEffect`. Don't import maplibre-gl in a Server Component path. [Next 16 App Router]
- **CJK labels:** use `localIdeographFontFamily` so Han glyphs render from the local Noto Sans TC (loaded via `next/font` in Story 1.1) instead of a multi-MB glyph download. Latin glyphs still need a `glyphs` URL (self-host font PBFs or a free glyph endpoint — pick one, document it).
- Feature-state visited styling, pins, clustering = LATER stories (1.5, Epic 3). This story renders the empty parchment atlas only.

### Conventions (from architecture + Story 1.1/1.2)
- Feature-first: map code in `src? no → features/map/` (root layout, per Story 1.1 deviation). [Source: 1-1 deviations]
- Tokens, never hardcoded hex in components — but MapLibre style JSON needs literal colors; pull them from the DESIGN.md values (canvas `#F2E8D5`, region-border `#96835E`, text-muted `#6F5C40`) and centralize them in one `features/map/style.ts` so they're not scattered.
- Tailwind v3, light-only, zh-TW primary — all still apply.

### Project Structure Notes
- New: `features/map/components/MapCanvas.tsx`, `features/map/lib/pmtiles-protocol.ts` (or a provider), `features/map/style.ts` (the MapLibre style + token colors). `app/page.tsx` becomes the map host. Possibly a `MapProvider` in the layout for the one-time protocol registration.

### Testing standards
- First real e2e here: Playwright in `e2e/` — load the app, wait for the MapLibre canvas, assert a known region label (e.g. "京都府" when zoomed to Japan) renders. The phone-perf check is a manual/observed spike (document the result); don't gate CI on fps.

### References
- [Source: epics.md#Epic 1 › Story 1.3 (post-split)]
- [Source: architecture.md#The Map subsystem]
- [Source: EXPERIENCE.md#Map & Localization; #Interaction Primitives]
- [Source: DESIGN.md (canvas/border/label tokens; map-label typography)]
- [Source: 1-2-admin1-boundary-tiles.md (tileset layers, props, ISO codes)]

## Dev Agent Record

### Agent Model Used

(to be filled by dev-story)

### Debug Log References

### Completion Notes List

- Context engine analysis completed — render story (1.3), consumes the Story 1.2 PMTiles (countries/regions layers, ISO props). Pins/visited-fill/clustering are later stories.

### File List
