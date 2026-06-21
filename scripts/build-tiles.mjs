// Mapsake — Story 1.2: admin-1 boundary tile pipeline.
// geoBoundaries ADM0 + ADM1  ->  normalize (ISO codes + zh-Hant labels)  ->  tippecanoe  ->  PMTiles.
//
// Scope:
//   default      = representative SAMPLE (TWN, JPN, USA) via the geoBoundaries per-country API (small downloads)
//   TILES_SCOPE=global = full worldwide CGAZ files (~760MB total; run locally/CI with bandwidth + time)
//
// Prereqocs (system binaries, NOT pnpm): tippecanoe, pmtiles. See scripts/README.md.
// Run: pnpm tiles:build   (node scripts/build-tiles.mjs)
//
// Region identity contract (architecture.md#Data Architecture): ISO codes.
//   ADM0 feature.iso = ISO 3166-1 alpha-2 ("JP"); ADM1 feature.iso = ISO 3166-2 ("JP-26").
// Properties baked per feature: { iso, country, name, name_zh }.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE = join(ROOT, ".tiles-cache"); // gitignored
const OUT_DIR = join(ROOT, "public", "tiles");
const OUT = join(OUT_DIR, "boundaries.pmtiles");
const GAZETTEER = join(ROOT, "scripts", "wikidata-zh-gazetteer.json");
const UA = "MapsakeTileBuild/0.1 (https://mapsake; contact: builder)";

const SCOPE = process.env.TILES_SCOPE === "global" ? "global" : "sample";
const SAMPLE_ISO3 = ["TWN", "JPN", "USA"];

// Minimal ISO3->ISO2 for the sample. Global scope needs a full table (or the
// `i18n-iso-countries` dep — left out of v1 to avoid an unapproved dependency).
const ISO3_TO_ISO2 = { TWN: "TW", JPN: "JP", USA: "US" };

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const log = (...a) => console.log("[tiles]", ...a);

async function getJSON(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

// ---- 1. Source geometry -----------------------------------------------------
async function sourceGeo() {
  if (SCOPE === "global") {
    const base =
      "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/CGAZ";
    return {
      adm0: await fetchToCache("cgaz_adm0.geojson", `${base}/geoBoundariesCGAZ_ADM0.geojson`),
      adm1: await fetchToCache("cgaz_adm1.geojson", `${base}/geoBoundariesCGAZ_ADM1.geojson`),
    };
  }
  // sample: per-country API -> gjDownloadURL
  const adm0 = { type: "FeatureCollection", features: [] };
  const adm1 = { type: "FeatureCollection", features: [] };
  for (const iso3 of SAMPLE_ISO3) {
    for (const [lvl, fc] of [["ADM0", adm0], ["ADM1", adm1]]) {
      const meta = await getJSON(
        `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${lvl}/`,
      );
      const gj = await fetchToCache(`${iso3}_${lvl}.geojson`, meta.gjDownloadURL);
      const parsed = JSON.parse(gj);
      for (const f of parsed.features) fc.features.push(f);
      log(`${iso3} ${lvl}: ${parsed.features.length} features`);
    }
  }
  const p0 = join(CACHE, "sample_adm0.geojson");
  const p1 = join(CACHE, "sample_adm1.geojson");
  writeFileSync(p0, JSON.stringify(adm0));
  writeFileSync(p1, JSON.stringify(adm1));
  return { adm0: p0, adm1: p1 };
}

async function fetchToCache(name, url) {
  const p = join(CACHE, name);
  if (existsSync(p)) {
    log(`cache hit ${name}`);
    return SCOPE === "global" ? p : readFileSync(p, "utf8");
  }
  log(`download ${name} <- ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(p, buf);
  return SCOPE === "global" ? p : buf.toString("utf8");
}

// ---- 2. zh-Hant gazetteer (Wikidata) ---------------------------------------
async function buildGazetteer() {
  if (existsSync(GAZETTEER)) {
    log("gazetteer cache hit");
    return JSON.parse(readFileSync(GAZETTEER, "utf8"));
  }
  const endpoint = "https://query.wikidata.org/sparql";
  const queries = {
    // ISO 3166-1 alpha-2 (countries) and ISO 3166-2 (admin-1) -> zh-Hant label
    a2: `SELECT ?code ?label WHERE { ?x wdt:P297 ?code. ?x rdfs:label ?label. FILTER(LANG(?label)="zh-hant") }`,
    sub: `SELECT ?code ?label WHERE { ?x wdt:P300 ?code. ?x rdfs:label ?label. FILTER(LANG(?label)="zh-hant") }`,
  };
  const map = {};
  for (const [k, q] of Object.entries(queries)) {
    log(`wikidata ${k} ...`);
    const url = `${endpoint}?format=json&query=${encodeURIComponent(q)}`;
    const data = await getJSON(url);
    for (const b of data.results.bindings) map[b.code.value] = b.label.value;
  }
  writeFileSync(GAZETTEER, JSON.stringify(map, null, 0));
  log(`gazetteer: ${Object.keys(map).length} codes`);
  return map;
}

// ---- 3. Normalize properties -----------------------------------------------
function norm(path, level, gaz) {
  const fc = JSON.parse(readFileSync(path, "utf8"));
  let withZh = 0;
  for (const f of fc.features) {
    const p = f.properties || {};
    const group = p.shapeGroup || p.shapeISO?.slice(0, 3); // ISO3
    if (level === "ADM0") {
      const iso = ISO3_TO_ISO2[group] || p.shapeISO || group;
      f.properties = { iso, country: p.shapeName, name: p.shapeName, name_zh: gaz[iso] || p.shapeName };
      if (gaz[iso]) withZh++;
    } else {
      const iso = p.shapeISO || ""; // ISO 3166-2
      const country = ISO3_TO_ISO2[group] || group;
      const zh = gaz[iso];
      f.properties = { iso, country, name: p.shapeName, name_zh: zh || p.shapeName };
      if (zh) withZh++;
    }
  }
  const out = path.replace(/\.geojson$/, ".norm.geojson");
  writeFileSync(out, JSON.stringify(fc));
  log(`${level}: ${fc.features.length} features, zh labels on ${withZh}`);
  return out;
}

// ---- 4. tippecanoe -> PMTiles ----------------------------------------------
function tile(adm0, adm1) {
  const args = [
    "-o", OUT, "--force",
    "-Z0", "-z8",
    "--simplification=10",
    "--drop-densest-as-needed",
    "--coalesce-densest-as-needed",
    "--detect-shared-borders",
    "-l", "countries", adm0,
    "-l", "regions", adm1,
  ];
  log("tippecanoe", args.join(" "));
  execFileSync("tippecanoe", args, { stdio: "inherit" });
}

// ---- main -------------------------------------------------------------------
const { adm0, adm1 } = await sourceGeo();
const gaz = await buildGazetteer();
const n0 = norm(adm0, "ADM0", gaz);
const n1 = norm(adm1, "ADM1", gaz);
tile(n0, n1);
log(`done -> ${OUT}`);
execFileSync("pmtiles", ["show", OUT], { stdio: "inherit" });
