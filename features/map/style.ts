import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

// DESIGN.md tokens as literals — a MapLibre style needs concrete colors.
export const MAP_COLORS = {
  ocean: "#EADFC8", // sea + map background — a deeper milky tone so land reads distinct from water
  land: "#FBF4E4", // unvisited land fill (DESIGN surface tone); lifts gently off the ocean
  surface: "#FBF4E4", // label halo (cream)
  border: "#96835E", // region-border
  textMuted: "#6F5C40", // map labels
} as const;

// Latin label glyphs (CJK is rendered locally via localIdeographFontFamily).
// Dev uses MapLibre's public demo glyphs; prod should self-host Nunito Sans PBFs.
const GLYPHS = "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf";
const LABEL: ExpressionSpecification = ["coalesce", ["get", "name_zh"], ["get", "name"]];

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
        paint: { "fill-color": MAP_COLORS.land },
      },
      {
        id: "regions-fill",
        type: "fill",
        source: "boundaries",
        "source-layer": "regions",
        paint: { "fill-color": MAP_COLORS.land },
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
