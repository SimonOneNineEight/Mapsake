// Memory-pin map helpers (kept in features/map so MapLibre never leaks out).
import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import type { Pin } from "@/data/pins";

export const PINS_SOURCE = "pins";

// Minimal local GeoJSON shape (the `GeoJSON` global isn't exposed to app source here).
// Structurally assignable to what GeoJSONSource.setData accepts.
export interface PinFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    geometry: { type: "Point"; coordinates: number[] };
    properties: { id: string; name: string };
  }>;
}

/**
 * Build the GeoJSON FeatureCollection the `pins` source renders, from the user's pins.
 * Pure (no MapLibre) so it's unit-testable. Each pin → a Point at [lng, lat] carrying
 * its id + name. (Clustering is Story 3.3; this is the flat source it builds on.)
 */
export function pinsToGeoJSON(pins: ReadonlyArray<Pin>): PinFeatureCollection {
  return {
    type: "FeatureCollection",
    features: pins.map((p) => ({
      type: "Feature",
      id: p.id,
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name },
    })),
  };
}

/** Push the current pins into the `pins` GeoJSON source (no-op until the source exists). */
export function applyPins(map: MlMap, pins: ReadonlyArray<Pin>): void {
  const src = map.getSource(PINS_SOURCE) as GeoJSONSource | undefined;
  if (src) src.setData(pinsToGeoJSON(pins));
}
