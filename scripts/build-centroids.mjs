// Region/country centroids for the "Places visited" list (Story 4.7 follow-up).
//
// Bare region marks store only an ISO code (no coordinate), so the list couldn't fly the map to a
// region with no pins. This emits a code → [lng, lat] map so any visited region/country is
// navigable. Keys are derived with the SAME logic as scripts/build-tiles.mjs (so they match the
// `iso` baked into the tiles and the `region_code` stored on marks):
//   ADM0 (country) iso = valid2(ISO_A2_EH) || valid2(ISO_A2) || ADM0_A3
//   ADM1 (region)  iso = iso_3166_2 (uppercased), kept only if it matches CC-XXX
// Point = the Natural Earth cartographer label point when finite, else the geometry bbox centre.
//
// Run:  node scripts/build-centroids.mjs   (writes features/places/region-centroids.json)

import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "features", "places", "region-centroids.json");
const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const UA = "mapsake-centroids";

const valid2 = (s) => (/^[A-Z]{2}$/.test((s || "").toUpperCase()) ? s.toUpperCase() : null);
const validSub = (s) => /^[A-Z]{2}-[A-Z0-9]+$/.test(s || "");
const finite = (n) => typeof n === "number" && Number.isFinite(n);

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

// Bounding-box centre of a GeoJSON Polygon/MultiPolygon — a cheap "go roughly there" point.
function bboxCentre(geometry) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const walk = (coords) => {
    if (typeof coords[0] === "number") {
      const [x, y] = coords;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else {
      for (const c of coords) walk(c);
    }
  };
  if (geometry?.coordinates) walk(geometry.coordinates);
  if (!finite(minX)) return null;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

function point(label, geometry) {
  if (finite(label[0]) && finite(label[1])) return [label[0], label[1]];
  return bboxCentre(geometry);
}

const out = {};

console.log("[centroids] fetching Natural Earth admin-0…");
const ne0 = await getJSON(`${NE_BASE}/ne_10m_admin_0_countries.geojson`);
for (const f of ne0.features) {
  const p = f.properties;
  const iso = valid2(p.ISO_A2_EH) || valid2(p.ISO_A2) || p.ADM0_A3;
  if (!valid2(iso)) continue; // only proper alpha-2 countries (matches the markable set)
  const pt = point([p.LABEL_X, p.LABEL_Y], f.geometry);
  if (pt) out[iso] = pt;
}

console.log("[centroids] fetching Natural Earth admin-1…");
const ne1 = await getJSON(`${NE_BASE}/ne_10m_admin_1_states_provinces.geojson`);
for (const f of ne1.features) {
  const p = f.properties;
  const iso = (p.iso_3166_2 || "").trim().toUpperCase();
  if (!validSub(iso)) continue; // only markable ISO 3166-2 regions
  const pt = point([p.longitude, p.latitude], f.geometry);
  if (pt) out[iso] = pt;
}

// Round to 4 dp (~11 m) to keep the file small.
for (const k of Object.keys(out)) out[k] = out[k].map((n) => Math.round(n * 1e4) / 1e4);

writeFileSync(OUT, JSON.stringify(out));
const regions = Object.keys(out).filter((k) => k.includes("-")).length;
const countries = Object.keys(out).length - regions;
console.log(`[centroids] wrote ${Object.keys(out).length} (${countries} countries, ${regions} regions) -> ${OUT}`);
