import centroids from "../region-centroids.json";

// Code → [lng, lat] representative point (Story 4.7 follow-up). Lets the "Places visited" list fly
// the map to a region that has no pins (a bare backfill mark stores only its ISO code). Generated
// by scripts/build-centroids.mjs from Natural Earth, keyed identically to the marks. Bundled so it
// works offline. Returns null for an unknown code (then the list just closes, as before).
const MAP = centroids as Record<string, number[]>;

export function regionCentroid(code: string): [number, number] | null {
  const c = MAP[code];
  return c && c.length === 2 ? [c[0], c[1]] : null;
}
