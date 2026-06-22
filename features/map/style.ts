import type {
  ExpressionSpecification,
  FilterSpecification,
  StyleSpecification,
} from "maplibre-gl";

// DESIGN.md tokens as literals — a MapLibre style needs concrete colors.
export const MAP_COLORS = {
  ocean: "#EADFC8", // sea + map background — a deeper milky tone so land reads distinct from water
  land: "#FBF4E4", // unvisited land fill (DESIGN surface tone); lifts gently off the ocean
  visited: "#B5663E", // hero terracotta — visited region fill (Story 1.5), driven by feature-state
  surface: "#FBF4E4", // label halo (cream)
  border: "#96835E", // region-border
  textMuted: "#6F5C40", // map labels
} as const;

// Image registered at runtime (MapCanvas, via styleimagemissing) for the visited
// texture cue — an always-on hatch so visited is never signaled by color alone.
export const VISITED_HATCH_IMAGE = "visited-hatch";

// Latin label glyphs (CJK is rendered locally via localIdeographFontFamily).
// Dev uses MapLibre's public demo glyphs; prod should self-host Nunito Sans PBFs.
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const LABEL: ExpressionSpecification = ["coalesce", ["get", "name_zh"], ["get", "name"]];

// Unvisited = paper; visited = terracotta, keyed on the per-feature `visited`
// feature-state (set from the user's marks in MapCanvas). promoteId = `iso`.
const FILL_COLOR: ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "visited"], false],
  MAP_COLORS.visited,
  MAP_COLORS.land,
];
// Hatch overlay shows only on visited features. feature-state is NOT allowed in a
// layer `filter`, so drive visibility via fill-opacity (a paint property) instead.
const VISITED_HATCH_OPACITY: ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "visited"], false],
  1,
  0,
];

// Soft warm-brown border on bare land; a darker brown on visited regions so the edge
// reads against the terracotta fill (border #96835E and fill #B5663E are both warm
// browns — too low-contrast to delineate the visited edge without this).
const LINE_COLOR: ExpressionSpecification = [
  "case",
  ["boolean", ["feature-state", "visited"], false],
  MAP_COLORS.textMuted,
  MAP_COLORS.border,
];

// ADM0 land model. Countries WITHOUT admin-1 render their country fill at every zoom
// (it's their only land). Countries WITH admin-1 render the country fill only below
// the takeover zoom; above it the ADM1 union is the land, so the ADM0/ADM1 coastline
// mismatch can't leave a cream coastal sliver. Done with a layer `filter` on the
// `has_admin1` property + a layer `maxzoom` — feature-state and zoom can't be combined
// in a single paint expression.
const HAS_ADMIN1: FilterSpecification = ["==", ["get", "has_admin1"], true];
const NO_ADMIN1: FilterSpecification = ["!=", ["get", "has_admin1"], true];
const ADMIN1_TAKEOVER_ZOOM = 6;

export function buildStyle(pmtilesUrl: string): StyleSpecification {
  return {
    version: 8,
    glyphs: GLYPHS,
    sources: {
      boundaries: {
        type: "vector",
        url: `pmtiles://${pmtilesUrl}`,
        attribution: "Boundaries © geoBoundaries (CC BY)",
        // Stable feature id from the ISO code: dedupes labels across tile
        // boundaries AND is the feature-state key for visited fill (Story 1.5).
        promoteId: { countries: "iso", regions: "iso" },
      },
      // Memory pins (Story 3.1): a client-driven GeoJSON source, updated from the user's
      // pins in MapCanvas. Clustering + zoom fade-in are Story 3.3.
      pins: {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      },
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": MAP_COLORS.ocean } },
      // Land is the lighter paper, lifting off the deeper ocean; visited terracotta
      // arrives via feature-state in Story 1.5.
      // Country fill, split by has_admin1. Terracotta when visited (feature-state),
      // paper otherwise; color fades in ~300ms (MapCanvas zeroes it for reduced motion).
      // The has-admin1 copy stops at the takeover zoom so the ADM1 union becomes the land.
      {
        id: "countries-fill-base",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        filter: NO_ADMIN1,
        paint: { "fill-color": FILL_COLOR, "fill-color-transition": { duration: 300, delay: 0 } },
      },
      {
        id: "countries-fill-world",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        filter: HAS_ADMIN1,
        maxzoom: ADMIN1_TAKEOVER_ZOOM,
        paint: { "fill-color": FILL_COLOR, "fill-color-transition": { duration: 300, delay: 0 } },
      },
      {
        id: "regions-fill",
        type: "fill",
        source: "boundaries",
        "source-layer": "regions",
        paint: { "fill-color": FILL_COLOR, "fill-color-transition": { duration: 300, delay: 0 } },
      },
      // Texture cue (DESIGN region-visited): an always-on hatch over visited land so
      // visited is never signaled by color alone. fill-pattern is screen-space, so the
      // hatch is zoom-stable. (Small-region pin fallback — DESIGN UX-DR6 — is deferred.)
      {
        id: "countries-visited-hatch-base",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        filter: NO_ADMIN1,
        // Hatch fades in over ~300ms with the terracotta so a fresh tap doesn't flash
        // hatch-on-pale before the color catches up.
        paint: {
          "fill-pattern": VISITED_HATCH_IMAGE,
          "fill-opacity": VISITED_HATCH_OPACITY,
          "fill-opacity-transition": { duration: 300, delay: 0 },
        },
      },
      {
        id: "countries-visited-hatch-world",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        filter: HAS_ADMIN1,
        maxzoom: ADMIN1_TAKEOVER_ZOOM,
        paint: {
          "fill-pattern": VISITED_HATCH_IMAGE,
          "fill-opacity": VISITED_HATCH_OPACITY,
          "fill-opacity-transition": { duration: 300, delay: 0 },
        },
      },
      {
        id: "regions-visited-hatch",
        type: "fill",
        source: "boundaries",
        "source-layer": "regions",
        paint: {
          "fill-pattern": VISITED_HATCH_IMAGE,
          "fill-opacity": VISITED_HATCH_OPACITY,
          "fill-opacity-transition": { duration: 300, delay: 0 },
        },
      },
      {
        id: "regions-line",
        type: "line",
        source: "boundaries",
        "source-layer": "regions",
        paint: { "line-color": LINE_COLOR, "line-width": 0.5 },
      },
      {
        id: "countries-line-base",
        type: "line",
        source: "boundaries",
        "source-layer": "countries",
        filter: NO_ADMIN1,
        paint: { "line-color": LINE_COLOR, "line-width": 0.9 },
      },
      {
        // has-admin1 country outline drops at the takeover zoom with its fill, so no
        // orphan ADM0 coastline floats in the sea once the ADM1 union is the land.
        id: "countries-line-world",
        type: "line",
        source: "boundaries",
        "source-layer": "countries",
        filter: HAS_ADMIN1,
        maxzoom: ADMIN1_TAKEOVER_ZOOM,
        paint: { "line-color": LINE_COLOR, "line-width": 0.9 },
      },
      {
        id: "country-labels",
        type: "symbol",
        source: "boundaries",
        "source-layer": "country_labels",
        layout: {
          "text-field": LABEL,
          "text-font": ["Open Sans Regular"],
          // Small + gently zoom-ramped (the map scales, not the type). Generous
          // text-padding lets MapLibre's collision culling thin the world-zoom
          // crowd, labels reveal as you zoom in. No importance rank in the tiles
          // yet, so which labels survive a tie is geometric, not by prominence.
          "text-size": ["interpolate", ["linear"], ["zoom"], 1, 9, 3, 10.5, 6, 12],
          "text-padding": 14,
        },
        paint: {
          "text-color": MAP_COLORS.textMuted,
          "text-halo-color": MAP_COLORS.surface,
          "text-halo-width": 1.0,
        },
      },
      {
        id: "region-labels",
        type: "symbol",
        source: "boundaries",
        "source-layer": "region_labels",
        minzoom: 4,
        layout: {
          "text-field": LABEL,
          "text-font": ["Open Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 4, 9, 8, 11.5],
          "text-padding": 8,
        },
        paint: {
          "text-color": MAP_COLORS.textMuted,
          "text-halo-color": MAP_COLORS.surface,
          "text-halo-width": 1.0,
        },
      },
      // Memory pins (Story 3.1) — terracotta marker on top of everything. A simple circle
      // for now; the teardrop + clustering + zoom fade-in are Story 3.3.
      {
        id: "pins-marker",
        type: "circle",
        source: "pins",
        paint: {
          "circle-radius": 6,
          "circle-color": MAP_COLORS.visited,
          "circle-stroke-color": MAP_COLORS.surface,
          "circle-stroke-width": 2,
        },
      },
    ],
  };
}
