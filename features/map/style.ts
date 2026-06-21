import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";

// DESIGN.md tokens as literals — a MapLibre style needs concrete colors.
export const MAP_COLORS = {
  canvas: "#F2E8D5", // parchment / unvisited land
  surface: "#FBF4E4", // label halo
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
      { id: "bg", type: "background", paint: { "background-color": MAP_COLORS.canvas } },
      // Fills are the paper now; visited terracotta arrives via feature-state in Story 1.5.
      {
        id: "countries-fill",
        type: "fill",
        source: "boundaries",
        "source-layer": "countries",
        paint: { "fill-color": MAP_COLORS.canvas },
      },
      {
        id: "regions-fill",
        type: "fill",
        source: "boundaries",
        "source-layer": "regions",
        paint: { "fill-color": MAP_COLORS.canvas },
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
        layout: { "text-field": LABEL, "text-font": ["Open Sans Regular"], "text-size": 12 },
        paint: {
          "text-color": MAP_COLORS.textMuted,
          "text-halo-color": MAP_COLORS.surface,
          "text-halo-width": 1.2,
        },
      },
      {
        id: "region-labels",
        type: "symbol",
        source: "boundaries",
        "source-layer": "region_labels",
        minzoom: 4,
        layout: { "text-field": LABEL, "text-font": ["Open Sans Regular"], "text-size": 11 },
        paint: {
          "text-color": MAP_COLORS.textMuted,
          "text-halo-color": MAP_COLORS.surface,
          "text-halo-width": 1.2,
        },
      },
    ],
  };
}
