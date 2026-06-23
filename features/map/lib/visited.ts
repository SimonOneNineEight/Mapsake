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

export type VisitedMark = { regionCode: string; level: RegionLevel; countryCode?: string };

/** Split a `"<sourceLayer>|<id>"` feature-state key back into its parts. */
function splitKey(key: string): { sourceLayer: string; id: string } {
  const sep = key.indexOf("|");
  return { sourceLayer: key.slice(0, sep), id: key.slice(sep + 1) };
}

/**
 * The set of feature-state keys to render visited, derived from the user's marks
 * (Story 1.6 roll-up). Keys are `"<sourceLayer>|<id>"` (e.g. `regions|JP-26`,
 * `countries|JP`). Pure + a full recompute, so removing a mark correctly drops a roll-up
 * that no longer has any contributor. Nothing here is persisted — the render is derived;
 * `region_marks` holds only EXPLICIT marks. [architecture#Data line 113]
 *
 * Roll-up rule: a marked admin-1 region ALSO lights its parent country
 * (`countries|<countryCode>`). There is NO downward cascade — a country mark contributes
 * only its own `countries|<regionCode>` key, never a region key. [epics 1.6 AC1/AC2]
 */
export function computeVisitedKeys(marks: ReadonlyArray<VisitedMark>): Set<string> {
  const keys = new Set<string>();
  for (const m of marks) {
    keys.add(`${sourceLayerFor(m.level)}|${m.regionCode}`);
    if (m.level === "admin1" && m.countryCode) keys.add(`countries|${m.countryCode}`);
  }
  return keys;
}

const ADMIN1_ISO = /^[A-Z]{2}-[A-Z0-9]+$/; // ISO 3166-2 admin-1 (matches the tap-time check)

/**
 * Derive visited marks from the user's pins (Story 3.9). A pin lights its admin-1 region and
 * — via `computeVisitedKeys`' roll-up — its parent country; a pin that resolved only a country
 * at drop lights just that country. There is NO downward cascade (a country-only pin never
 * lights child regions). These feed the SAME `computeVisitedKeys` path as explicit marks, so a
 * region visited only by a pin returns to bare the moment that pin leaves the list.
 */
export function pinsToVisitedMarks(
  pins: ReadonlyArray<{ regionCode: string | null; countryCode: string | null }>,
): VisitedMark[] {
  const out: VisitedMark[] = [];
  for (const p of pins) {
    if (p.regionCode && ADMIN1_ISO.test(p.regionCode)) {
      out.push({ regionCode: p.regionCode, level: "admin1", countryCode: p.countryCode ?? undefined });
    } else if (p.countryCode) {
      out.push({ regionCode: p.countryCode, level: "country" });
    }
  }
  return out;
}

/**
 * Apply the derived visited key-set as `visited` feature-state and clear any feature no
 * longer in it. Returns the new key-set (used as the previous set on the next call).
 */
export function applyVisitedState(
  map: MlMap,
  marks: ReadonlyArray<VisitedMark>,
  prev: Set<string>,
): Set<string> {
  const next = computeVisitedKeys(marks);
  for (const key of next) {
    const { sourceLayer, id } = splitKey(key);
    map.setFeatureState({ source: "boundaries", sourceLayer, id }, { visited: true });
  }
  for (const key of prev) {
    if (next.has(key)) continue;
    const { sourceLayer, id } = splitKey(key);
    map.setFeatureState({ source: "boundaries", sourceLayer, id }, { visited: false });
  }
  return next;
}
