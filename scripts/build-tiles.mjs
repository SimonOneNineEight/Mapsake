// Mapsake — Story 1.2: admin-1 boundary tile pipeline.
// geoBoundaries ADM0 + ADM1  ->  normalize (ISO codes + zh-Hant labels)  ->  tippecanoe  ->  PMTiles.
//
// Scope:
//   default      = representative SAMPLE (TWN, JPN, USA) via the geoBoundaries per-country API (small downloads)
//   TILES_SCOPE=global = every country via the SAME per-country gbOpen API (~250 countries, looped).
//     Per-country gbOpen ADM1 carries shapeISO (ISO 3166-2) — the worldwide CGAZ ADM1 file does NOT,
//     so the global path must NOT use CGAZ or admin-1 ends up with empty ISO codes + no zh labels.
//     Countries with no ADM1 layer are skipped (logged); their ADM0 still renders.
//
// Prereqs (system binaries, NOT pnpm): tippecanoe, pmtiles. See scripts/README.md.
// Run: pnpm tiles:build   (node scripts/build-tiles.mjs)
//
// Region identity contract (architecture.md#Data Architecture): ISO codes.
//   ADM0 feature.iso = ISO 3166-1 alpha-2 ("JP"); ADM1 feature.iso = ISO 3166-2 ("JP-26").
// Properties baked per feature: { iso, country, name, name_zh }.
// Layers: ADM0 -> "countries" (minzoom 0), ADM1 -> "regions" (minzoom 3), via per-feature tippecanoe{}.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync, createWriteStream } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const CACHE = join(ROOT, ".tiles-cache");
const OUT_DIR = join(ROOT, "public", "tiles");
const OUT = join(OUT_DIR, "boundaries.pmtiles");
const GAZETTEER = join(ROOT, "scripts", "wikidata-zh-gazetteer.json");
const UA = "MapsakeTileBuild/0.1 (https://mapsake; contact: builder)";

const SCOPE = process.env.TILES_SCOPE === "global" ? "global" : "sample";
const SAMPLE_ISO3 = ["TWN", "JPN", "USA"];
// Full ISO 3166-1 alpha-3 -> alpha-2 (so ADM0 `iso` is alpha-2 worldwide, matching
// the Wikidata P297-keyed gazetteer + the schema's country region_code).
const ISO3_TO_ISO2 = {
  ABW:"AW",AFG:"AF",AGO:"AO",AIA:"AI",ALA:"AX",ALB:"AL",AND:"AD",ARE:"AE",ARG:"AR",ARM:"AM",ASM:"AS",ATA:"AQ",ATF:"TF",ATG:"AG",AUS:"AU",AUT:"AT",AZE:"AZ",
  BDI:"BI",BEL:"BE",BEN:"BJ",BES:"BQ",BFA:"BF",BGD:"BD",BGR:"BG",BHR:"BH",BHS:"BS",BIH:"BA",BLM:"BL",BLR:"BY",BLZ:"BZ",BMU:"BM",BOL:"BO",BRA:"BR",BRB:"BB",BRN:"BN",BTN:"BT",BVT:"BV",BWA:"BW",
  CAF:"CF",CAN:"CA",CCK:"CC",CHE:"CH",CHL:"CL",CHN:"CN",CIV:"CI",CMR:"CM",COD:"CD",COG:"CG",COK:"CK",COL:"CO",COM:"KM",CPV:"CV",CRI:"CR",CUB:"CU",CUW:"CW",CXR:"CX",CYM:"KY",CYP:"CY",CZE:"CZ",
  DEU:"DE",DJI:"DJ",DMA:"DM",DNK:"DK",DOM:"DO",DZA:"DZ",
  ECU:"EC",EGY:"EG",ERI:"ER",ESH:"EH",ESP:"ES",EST:"EE",ETH:"ET",
  FIN:"FI",FJI:"FJ",FLK:"FK",FRA:"FR",FRO:"FO",FSM:"FM",
  GAB:"GA",GBR:"GB",GEO:"GE",GGY:"GG",GHA:"GH",GIB:"GI",GIN:"GN",GLP:"GP",GMB:"GM",GNB:"GW",GNQ:"GQ",GRC:"GR",GRD:"GD",GRL:"GL",GTM:"GT",GUF:"GF",GUM:"GU",GUY:"GY",
  HKG:"HK",HMD:"HM",HND:"HN",HRV:"HR",HTI:"HT",HUN:"HU",
  IDN:"ID",IMN:"IM",IND:"IN",IOT:"IO",IRL:"IE",IRN:"IR",IRQ:"IQ",ISL:"IS",ISR:"IL",ITA:"IT",
  JAM:"JM",JEY:"JE",JOR:"JO",JPN:"JP",
  KAZ:"KZ",KEN:"KE",KGZ:"KG",KHM:"KH",KIR:"KI",KNA:"KN",KOR:"KR",KWT:"KW",
  LAO:"LA",LBN:"LB",LBR:"LR",LBY:"LY",LCA:"LC",LIE:"LI",LKA:"LK",LSO:"LS",LTU:"LT",LUX:"LU",LVA:"LV",
  MAC:"MO",MAF:"MF",MAR:"MA",MCO:"MC",MDA:"MD",MDG:"MG",MDV:"MV",MEX:"MX",MHL:"MH",MKD:"MK",MLI:"ML",MLT:"MT",MMR:"MM",MNE:"ME",MNG:"MN",MNP:"MP",MOZ:"MZ",MRT:"MR",MSR:"MS",MTQ:"MQ",MUS:"MU",MWI:"MW",MYS:"MY",MYT:"YT",
  NAM:"NA",NCL:"NC",NER:"NE",NFK:"NF",NGA:"NG",NIC:"NI",NIU:"NU",NLD:"NL",NOR:"NO",NPL:"NP",NRU:"NR",NZL:"NZ",
  OMN:"OM",
  PAK:"PK",PAN:"PA",PCN:"PN",PER:"PE",PHL:"PH",PLW:"PW",PNG:"PG",POL:"PL",PRI:"PR",PRK:"KP",PRT:"PT",PRY:"PY",PSE:"PS",PYF:"PF",
  QAT:"QA",
  REU:"RE",ROU:"RO",RUS:"RU",RWA:"RW",
  SAU:"SA",SDN:"SD",SEN:"SN",SGP:"SG",SGS:"GS",SHN:"SH",SJM:"SJ",SLB:"SB",SLE:"SL",SLV:"SV",SMR:"SM",SOM:"SO",SPM:"PM",SRB:"RS",SSD:"SS",STP:"ST",SUR:"SR",SVK:"SK",SVN:"SI",SWE:"SE",SWZ:"SZ",SXM:"SX",SYC:"SC",SYR:"SY",
  TCA:"TC",TCD:"TD",TGO:"TG",THA:"TH",TJK:"TJ",TKL:"TK",TKM:"TM",TLS:"TL",TON:"TO",TTO:"TT",TUN:"TN",TUR:"TR",TUV:"TV",TWN:"TW",TZA:"TZ",
  UGA:"UG",UKR:"UA",UMI:"UM",URY:"UY",USA:"US",UZB:"UZ",
  VAT:"VA",VCT:"VC",VEN:"VE",VGB:"VG",VIR:"VI",VNM:"VN",VUT:"VU",
  WLF:"WF",WSM:"WS",
  YEM:"YE",
  ZAF:"ZA",ZMB:"ZM",ZWE:"ZW",
};
// Known source typos in geoBoundaries shapeISO (geoBoundaries data, not ours).
const ISO_FIXUPS = { "SU-SD": "US-SD" };

// Coerce a gbOpen ADM1 shapeISO toward valid ISO 3166-2 ("CC-XXX"). gbOpen's
// shapeISO has recurring defects; this recovers the cleanly-fixable ones:
//   - wrong separators: "AF_KAN" / "CF=OP"  -> "AF-KAN" / "CF-OP"
//   - missing country prefix: Belgium "BRU"  -> "BE-BRU"
// Unrecoverable cases (e.g. Chile regions all stamped "CHL", the country code)
// are returned cleaned-but-invalid and flagged by the caller.
function normSubISO(raw, country, group) {
  const s = (ISO_FIXUPS[raw] || raw || "").trim().toUpperCase().replace(/[_=]/g, "-").replace(/\*+$/, "");
  if (/^[A-Z]{2}-[A-Z0-9]+$/.test(s)) return s; // already valid ISO 3166-2
  if (group && s === String(group).toUpperCase()) return s; // country code misused as region — unrecoverable
  if (country && country.length === 2 && /^[A-Z0-9]{1,4}$/.test(s) && s !== country)
    return `${country}-${s}`; // bare subdivision code -> add the country prefix
  return s; // best effort; caller flags if still invalid
}

const log = (...a) => console.log("[tiles]", ...a);
const warn = (...a) => console.warn("[tiles][warn]", ...a);

// --- preflight: required system binaries -------------------------------------
function preflight() {
  for (const [bin, args] of [["tippecanoe", ["--version"]], ["pmtiles", ["version"]]]) {
    try {
      execFileSync(bin, args, { stdio: "ignore" });
    } catch {
      console.error(
        `\n[tiles] Missing required tool: ${bin}\n` +
          `Install it first (see scripts/README.md):\n` +
          `  brew install tippecanoe pmtiles\n`,
      );
      process.exit(1);
    }
  }
}

function writeAtomic(p, data) {
  const tmp = `${p}.tmp`;
  writeFileSync(tmp, data);
  renameSync(tmp, p); // atomic on same filesystem -> no truncated cache on a killed run
}

async function getJSON(url) {
  if (!url) throw new Error("getJSON called with empty URL");
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

// --- 1. Source geometry (per-country gbOpen for BOTH scopes) ------------------
// Sample = SAMPLE_ISO3; global = every country in ISO3_TO_ISO2. Both use the same
// per-country API so admin-1 always carries shapeISO (ISO 3166-2). Missing ADM1 is
// skipped (many micro-states/territories have no admin-1 layer) rather than fatal.
// Geometry is NORMALIZED + STREAMED to disk per country (see main) so peak memory
// stays at one country, not the whole world (global ADM1 is multiple GB combined).
const GLOBAL_ISO3 = Object.keys(ISO3_TO_ISO2);

async function fetchToCache(name, url) {
  const p = join(CACHE, name);
  if (existsSync(p)) {
    log(`cache hit ${name}`);
    return readFileSync(p, "utf8");
  }
  log(`download ${name} <- ${url}`);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeAtomic(p, buf); // temp->rename so a killed download never leaves a truncated cache
  return buf.toString("utf8");
}

// --- 2. zh-Hant gazetteer (Wikidata), with zh fallback chain ------------------
async function buildGazetteer() {
  if (existsSync(GAZETTEER)) {
    log("gazetteer cache hit");
    return JSON.parse(readFileSync(GAZETTEER, "utf8"));
  }
  const endpoint = "https://query.wikidata.org/sparql";
  // Primary = zh-Hant; fallback fills = zh-tw, zh-hk, then generic zh (AC2 chain).
  const passes = [
    { k: "hant-a2", prop: "P297", langs: ["zh-hant"] },
    { k: "hant-sub", prop: "P300", langs: ["zh-hant"] },
    { k: "fb-a2", prop: "P297", langs: ["zh-tw", "zh-hk", "zh"] },
    { k: "fb-sub", prop: "P300", langs: ["zh-tw", "zh-hk", "zh"] },
  ];
  const map = {};
  for (const { k, prop, langs } of passes) {
    const filter = langs.map((l) => `LANG(?label)="${l}"`).join(" || ");
    const q = `SELECT ?code ?label WHERE { ?x wdt:${prop} ?code. ?x rdfs:label ?label. FILTER(${filter}) }`;
    log(`wikidata ${k} ...`);
    const data = await getJSON(`${endpoint}?format=json&query=${encodeURIComponent(q)}`);
    if (!data?.results?.bindings) throw new Error(`wikidata ${k}: unexpected response shape`);
    for (const b of data.results.bindings) {
      // primary passes always set; fallback passes only fill gaps (zh-Hant wins)
      if (!map[b.code.value]) map[b.code.value] = b.label.value;
    }
  }
  writeAtomic(GAZETTEER, JSON.stringify(map, null, 0));
  log(`gazetteer: ${Object.keys(map).length} codes`);
  return map;
}

// --- label points: one representative point per feature (so each country/region
// gets exactly ONE label, instead of one per polygon-piece / per tile). ---------
function ringArea(r) {
  let a = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++)
    a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]);
  return Math.abs(a / 2);
}
function ringCentroid(r) {
  let x = 0, y = 0, a = 0;
  for (let i = 0, n = r.length, j = n - 1; i < n; j = i++) {
    const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
    x += (r[j][0] + r[i][0]) * f;
    y += (r[j][1] + r[i][1]) * f;
    a += f;
  }
  a *= 0.5;
  return a === 0 ? r[0] : [x / (6 * a), y / (6 * a)];
}
function labelPoint(geom) {
  const polys = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  let best = null, bestA = -1;
  for (const poly of polys) {
    const ar = ringArea(poly[0]);
    if (ar > bestA) { bestA = ar; best = poly[0]; }
  }
  return best ? ringCentroid(best) : [0, 0];
}

// --- 3. Normalize ONE feature: ISO codes + zh label + layer routing ----------
// Returns { feature, label } both already carrying tippecanoe.layer so a single
// merged GeoJSONL stream still tiles into countries/regions + their label layers.
function normalizeFeature(f, level, gaz, stats) {
  const p = f.properties || {};
  const group = p.shapeGroup || (p.shapeISO ? p.shapeISO.slice(0, 3) : undefined);
  let iso, country;
  if (level === "ADM0") {
    iso = ISO3_TO_ISO2[group] || p.shapeISO || group;
    country = iso;
  } else {
    country = ISO3_TO_ISO2[group] || group;
    iso = normSubISO(p.shapeISO, country, group);
    // flag anything still not valid ISO 3166-2 (residual gbOpen data gaps)
    if (!/^[A-Z]{2}-[A-Z0-9]+$/.test(iso))
      stats.bad.push(`${p.shapeName}: shapeISO="${p.shapeISO}" -> "${iso}"`);
  }
  const name_zh = gaz[iso] || p.shapeName;
  if (gaz[iso]) stats.withZh++;
  const props = { iso, country, name: p.shapeName, name_zh };
  const feature = {
    type: "Feature",
    properties: props,
    tippecanoe: { layer: level === "ADM0" ? "countries" : "regions", minzoom: level === "ADM0" ? 0 : 3 },
    geometry: f.geometry,
  };
  const label = {
    type: "Feature",
    properties: props,
    tippecanoe: { layer: level === "ADM0" ? "country_labels" : "region_labels", minzoom: level === "ADM0" ? 0 : 4 },
    geometry: { type: "Point", coordinates: labelPoint(f.geometry) },
  };
  return { feature, label };
}

// Stream write with backpressure (resolve once the chunk is flushed).
function writeChunk(stream, s) {
  if (!s) return Promise.resolve();
  return new Promise((res, rej) => stream.write(s, (e) => (e ? rej(e) : res())));
}
function endStream(stream) {
  return new Promise((res, rej) => stream.end((e) => (e ? rej(e) : res())));
}

// --- 4. tippecanoe -> PMTiles (layers come from per-feature tippecanoe.layer) -
// Inputs are line-delimited GeoJSON (one Feature per line); tippecanoe reads them
// natively and routes each feature by its tippecanoe.layer.
function tile(features, labels) {
  const args = [
    "-o", OUT, "--force",
    "-Z0", "-z8",
    "--simplification=10",
    "--drop-densest-as-needed",
    "--coalesce-densest-as-needed",
    "--detect-shared-borders",
    features, labels,
  ];
  log("tippecanoe", args.join(" "));
  execFileSync("tippecanoe", args, { stdio: "inherit" });
}

// --- main: stream per-country so peak memory = one country, not the world -----
preflight();
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
const gaz = await buildGazetteer();

const iso3s = SCOPE === "global" ? GLOBAL_ISO3 : SAMPLE_ISO3;
const featPath = join(CACHE, `${SCOPE}_features.geojsonl`);
const labelPath = join(CACHE, `${SCOPE}_labels.geojsonl`);
const featOut = createWriteStream(featPath);
const labelOut = createWriteStream(labelPath);
const stats = { withZh: 0, bad: [] };
let ok0 = 0, ok1 = 0, featCount = 0;
const noAdm1 = [];

for (const iso3 of iso3s) {
  for (const lvl of ["ADM0", "ADM1"]) {
    let gj;
    try {
      const meta = await getJSON(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${lvl}/`);
      // Prefer geoBoundaries' SIMPLIFIED geometry: accurate enough at our z8 cap,
      // far smaller, and avoids the full-res files (e.g. Canada ADM1 is 648MB,
      // over V8's max string length -> readFileSync would throw).
      const url = meta?.simplifiedGeometryGeoJSON || meta?.gjDownloadURL;
      if (!url) throw new Error("no geometry URL");
      gj = await fetchToCache(`${iso3}_${lvl}_s.geojson`, url);
    } catch (e) {
      // ADM0 should always exist; ADM1 legitimately absent for some places.
      if (lvl === "ADM1") noAdm1.push(iso3);
      else warn(`${iso3}/${lvl}: ${e.message} — skipped`);
      continue;
    }
    const parsed = JSON.parse(gj); // one country only -> bounded memory
    let fbuf = "", lbuf = "";
    for (const f of parsed.features) {
      const { feature, label } = normalizeFeature(f, lvl, gaz, stats);
      fbuf += JSON.stringify(feature) + "\n";
      lbuf += JSON.stringify(label) + "\n";
      featCount++;
    }
    await writeChunk(featOut, fbuf);
    await writeChunk(labelOut, lbuf);
    if (lvl === "ADM0") ok0++; else ok1++;
    if (SCOPE !== "global") log(`${iso3} ${lvl}: ${parsed.features.length} features`);
  }
}
await endStream(featOut);
await endStream(labelOut);

log(`sourced ${ok0} countries, ${ok1} with admin-1; ${noAdm1.length} without ADM1${noAdm1.length ? ": " + noAdm1.join(",") : ""}`);
log(`${featCount} features, zh labels on ${stats.withZh}`);
if (stats.bad.length) warn(`${stats.bad.length} feature(s) with suspect/empty ISO (first 10): ${stats.bad.slice(0, 10).join("; ")}`);

tile(featPath, labelPath);
log(`done -> ${OUT}`);
execFileSync("pmtiles", ["show", OUT], { stdio: "inherit" });
