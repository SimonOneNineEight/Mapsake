import type { Pin } from "@/data/pins";
import type { RegionMark } from "@/data/region-marks";
import { regionName } from "./region-names";

// "Places visited" tree (Story 4.7): country → admin-1 regions → pins. The visited truth mirrors
// the map roll-up (Story 3.9): a region/country is listed if explicitly MARKED or if it holds a
// pin. Pins are the only items with coordinates (→ openable / fly-to); bare regions are labels.

export interface PlacesRegion {
  regionCode: string; // admin-1 ISO, or "" for pins with no resolved region (shown bare under country)
  name: string;
  pins: Pin[];
}

export interface PlacesCountry {
  countryCode: string;
  name: string;
  regions: PlacesRegion[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, "zh-Hant");

export function buildPlaces(marks: RegionMark[], pins: Pin[]): PlacesCountry[] {
  // countryCode → (regionCode → pins[]), where regionCode "" collects country-level/region-less pins.
  const countries = new Map<string, Map<string, Pin[]>>();
  const ensureCountry = (cc: string) => {
    let c = countries.get(cc);
    if (!c) {
      c = new Map();
      countries.set(cc, c);
    }
    return c;
  };
  const ensureRegion = (cc: string, rc: string) => {
    const c = ensureCountry(cc);
    if (!c.has(rc)) c.set(rc, []);
    return c.get(rc)!;
  };

  // Explicit marks seed empty countries/regions (bare visited, no pins).
  for (const m of marks) {
    if (m.level === "country") ensureCountry(m.regionCode);
    else ensureRegion(m.countryCode, m.regionCode);
  }
  // Pins land under their region (or a region-less bucket within their country).
  for (const p of pins) {
    const cc = p.countryCode ?? "??";
    const rc = p.regionCode ?? "";
    ensureRegion(cc, rc).push(p);
  }

  const result: PlacesCountry[] = [];
  for (const [cc, regionMap] of countries) {
    const regions: PlacesRegion[] = [];
    for (const [rc, pinList] of regionMap) {
      regions.push({
        regionCode: rc,
        name: rc === "" ? "" : regionName(rc),
        pins: [...pinList].sort(byName),
      });
    }
    // Region-less bucket ("") sorts last; named regions alphabetical.
    regions.sort((a, b) => (a.regionCode === "" ? 1 : b.regionCode === "" ? -1 : byName(a, b)));
    // `??` is the sentinel for a pin with no resolved country (e.g. an ocean drop) — show a calm
    // localized label rather than a stray "??" in the zh-TW UI.
    result.push({ countryCode: cc, name: cc === "??" ? "其他" : regionName(cc), regions });
  }
  result.sort(byName);
  return result;
}
