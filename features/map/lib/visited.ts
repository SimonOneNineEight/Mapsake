// Visited-region map helpers (kept in features/map so MapLibre never leaks out).
import type { Map as MlMap, PointLike } from "maplibre-gl";
import type { RegionLevel } from "@/data/region-marks";
import { VISITED_HATCH_IMAGE } from "../style";

const sourceLayerFor = (level: RegionLevel) => (level === "admin1" ? "regions" : "countries");

/**
 * Generate the diagonal-hatch texture and register it (idempotent). The hatch is the
 * always-on non-color cue on visited land (DESIGN region-visited). Drawn programmatically
 * so no asset ships; used as a screen-space `fill-pattern` so it's zoom-stable.
 */
export function createVisitedHatch(map: MlMap): void {
  if (map.hasImage(VISITED_HATCH_IMAGE)) return;
  const size = 8;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return;
  ctx.strokeStyle = "rgba(110, 60, 40, 0.4)"; // darker terracotta — luminance delta from #B5663E
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  // 45° lines that tile seamlessly across the 8px cell
  ctx.moveTo(0, size);
  ctx.lineTo(size, 0);
  ctx.moveTo(-size, size);
  ctx.lineTo(size, -size);
  ctx.moveTo(0, size * 2);
  ctx.lineTo(size * 2, 0);
  ctx.stroke();
  map.addImage(VISITED_HATCH_IMAGE, ctx.getImageData(0, 0, size, size), { pixelRatio: 2 });
}

export interface TappedRegion {
  regionCode: string;
  countryCode: string;
  level: RegionLevel;
}

/**
 * The topmost markable feature under a tap → its ISO codes + level (no server-side
 * point-in-polygon; MapLibre knows the feature under the tap). At z≥3 the `regions`
 * layer renders above `countries`, so a tap there resolves to the admin-1 region.
 *
 * Skips features with a malformed ISO (some global tiles carry e.g. `"CHN"` on an
 * admin-1 feature) and returns the first VALID feature underneath — so where a bad
 * blob overlaps a real region (the Taiwan/China tile overlap), the tap still marks
 * the real one rather than persisting an un-renderable, roll-up-polluting mark.
 * admin-1 = ISO 3166-2 (CC-XXX); country = ISO 3166-1 alpha-2 (CC).
 */
export function regionFromPoint(map: MlMap, point: PointLike): TappedRegion | null {
  const feats = map.queryRenderedFeatures(point, {
    layers: ["regions-fill", "countries-fill-base", "countries-fill-world"],
  });
  for (const f of feats) {
    const props = f.properties ?? {};
    const iso = typeof props.iso === "string" ? props.iso : "";
    const level: RegionLevel = f.sourceLayer === "regions" ? "admin1" : "country";
    const validIso =
      level === "admin1" ? /^[A-Z]{2}-[A-Z0-9]+$/.test(iso) : /^[A-Z]{2}$/.test(iso);
    if (!validIso) continue;
    const countryCode =
      level === "admin1" ? (typeof props.country === "string" ? props.country : iso) : iso;
    return { regionCode: iso, countryCode, level };
  }
  return null;
}

/**
 * Apply the user's marks as `visited` feature-state and clear any feature no longer
 * marked. Returns the new key-set (used as the previous set on the next call).
 * Keys are `"<sourceLayer>|<regionCode>"`.
 */
export function applyVisitedState(
  map: MlMap,
  marks: ReadonlyArray<{ regionCode: string; level: RegionLevel }>,
  prev: Set<string>,
): Set<string> {
  const next = new Set<string>();
  for (const m of marks) {
    const sourceLayer = sourceLayerFor(m.level);
    next.add(`${sourceLayer}|${m.regionCode}`);
    map.setFeatureState({ source: "boundaries", sourceLayer, id: m.regionCode }, { visited: true });
  }
  for (const key of prev) {
    if (next.has(key)) continue;
    const sep = key.indexOf("|");
    const sourceLayer = key.slice(0, sep);
    const id = key.slice(sep + 1);
    map.setFeatureState({ source: "boundaries", sourceLayer, id }, { visited: false });
  }
  return next;
}
