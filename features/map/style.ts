import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

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
    },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": MAP_COLORS.ocean } },
      // Land is the lighter paper, lifting off the deeper ocean; visited terracotta
      // arrives via feature-state in Story 1.5.
      {
        id: "countries-fill",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        // Terracotta when visited (feature-state), paper otherwise; the color fades
        // in (~300ms) as the quiet mark confirmation. MapCanvas drops the transition
        // to 0 under prefers-reduced-motion.
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
      // hatch is zoom-stable. (Small-region pin fallback is Story 1.6.)
      {
        id: "countries-visited-hatch",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        paint: { "fill-pattern": VISITED_HATCH_IMAGE, "fill-opacity": VISITED_HATCH_OPACITY },
      },
      {
        id: "regions-visited-hatch",
        type: "fill",
        source: "boundaries",
        "source-layer": "regions",
        paint: { "fill-pattern": VISITED_HATCH_IMAGE, "fill-opacity": VISITED_HATCH_OPACITY },
      },
      {
        id: "regions-line",
        type: "line",
        source: "boundaries",
        "source-layer": "regions",
        paint: { "line-color": MAP_COLORS.border, "line-width": 0.5 },
      },
      {
        id: "countries-line",
        type: "line",
        source: "boundaries",
        "source-layer": "countries",
        paint: { "line-color": MAP_COLORS.border, "line-width": 0.9 },
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
    ],
  };
}
