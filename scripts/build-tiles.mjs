// Mapsake — Story 1.2: admin-1 boundary tile pipeline.
// geoBoundaries ADM0 + ADM1  ->  normalize (ISO codes + zh-Hant labels)  ->  tippecanoe  ->  PMTiles.
//
// Scope:
//   default      = representative SAMPLE (TWN, JPN, USA) via the geoBoundaries per-country API (small downloads)
//   TILES_SCOPE=global = full worldwide CGAZ files (~760MB total; run locally/CI with bandwidth + time)
//
// Prereqs (system binaries, NOT pnpm): tippecanoe, pmtiles. See scripts/README.md.
// Run: pnpm tiles:build   (node scripts/build-tiles.mjs)
//
// Region identity contract (architecture.md#Data Architecture): ISO codes.
//   ADM0 feature.iso = ISO 3166-1 alpha-2 ("JP"); ADM1 feature.iso = ISO 3166-2 ("JP-26").
// Properties baked per feature: { iso, country, name, name_zh }.
// Layers: ADM0 -> "countries" (minzoom 0), ADM1 -> "regions" (minzoom 3), via per-feature tippecanoe{}.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, renameSync } from "node:fs";
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

// --- 1. Source geometry ------------------------------------------------------
async function sourceGeo() {
  if (SCOPE === "global") {
    const base =
      "https://github.com/wmgeolab/geoBoundaries/raw/main/releaseData/CGAZ";
    return {
      adm0: await fetchToCache("cgaz_adm0.geojson", `${base}/geoBoundariesCGAZ_ADM0.geojson`),
      adm1: await fetchToCache("cgaz_adm1.geojson", `${base}/geoBoundariesCGAZ_ADM1.geojson`),
    };
  }
  const adm0 = { type: "FeatureCollection", features: [] };
  const adm1 = { type: "FeatureCollection", features: [] };
  for (const iso3 of SAMPLE_ISO3) {
    for (const [lvl, fc] of [["ADM0", adm0], ["ADM1", adm1]]) {
      const meta = await getJSON(
        `https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${lvl}/`,
      );
      if (!meta || !meta.gjDownloadURL)
        throw new Error(`geoBoundaries ${iso3}/${lvl}: no gjDownloadURL in response`);
      const gj = await fetchToCache(`${iso3}_${lvl}.geojson`, meta.gjDownloadURL);
      const parsed = JSON.parse(gj);
      for (const f of parsed.features) fc.features.push(f);
      log(`${iso3} ${lvl}: ${parsed.features.length} features`);
    }
  }
  const p0 = join(CACHE, "sample_adm0.geojson");
  const p1 = join(CACHE, "sample_adm1.geojson");
  writeAtomic(p0, JSON.stringify(adm0));
  writeAtomic(p1, JSON.stringify(adm1));
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
  writeAtomic(p, buf); // temp->rename so a killed download never leaves a truncated cache
  return SCOPE === "global" ? p : buf.toString("utf8");
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

// --- 3. Normalize properties + assign layer/minzoom + validate ---------------
function norm(path, level, gaz, labels) {
  const fc = JSON.parse(readFileSync(path, "utf8"));
  const layer = level === "ADM0" ? "countries" : "regions";
  const minzoom = level === "ADM0" ? 0 : 3;
  let withZh = 0;
  const bad = [];
  for (const f of fc.features) {
    const p = f.properties || {};
    const group = p.shapeGroup || (p.shapeISO ? p.shapeISO.slice(0, 3) : undefined);
    let iso, country;
    if (level === "ADM0") {
      iso = ISO3_TO_ISO2[group] || p.shapeISO || group;
      country = iso;
    } else {
      iso = ISO_FIXUPS[p.shapeISO] || p.shapeISO || "";
      country = ISO3_TO_ISO2[group] || group;
      // validate ISO 3166-2 shape: "CC-..." with the country prefix matching
      if (!/^[A-Z]{2}-/.test(iso)) bad.push(`${p.shapeName}: iso="${iso}"`);
      else if (country && country.length === 2 && !iso.startsWith(country + "-"))
        bad.push(`${p.shapeName}: iso="${iso}" but country="${country}"`);
    }
    const name_zh = gaz[iso] || p.shapeName;
    if (gaz[iso]) withZh++;
    f.properties = { iso, country, name: p.shapeName, name_zh };
    f.tippecanoe = { layer, minzoom }; // routes feature to its layer + per-layer minzoom
    // one label point per feature -> exactly one label per country/region
    labels.push({
      type: "Feature",
      properties: f.properties,
      tippecanoe: {
        layer: level === "ADM0" ? "country_labels" : "region_labels",
        minzoom: level === "ADM0" ? 0 : 4,
      },
      geometry: { type: "Point", coordinates: labelPoint(f.geometry) },
    });
  }
  const out = path.replace(/\.geojson$/, ".norm.geojson");
  writeAtomic(out, JSON.stringify(fc));
  log(`${level} -> layer "${layer}" (minzoom ${minzoom}): ${fc.features.length} features, zh labels on ${withZh}`);
  if (bad.length) warn(`${level} ${bad.length} feature(s) with suspect/empty ISO: ${bad.join("; ")}`);
  return out;
}

// --- 4. tippecanoe -> PMTiles (layers come from per-feature tippecanoe.layer) -
function tile(adm0, adm1, labels) {
  const args = [
    "-o", OUT, "--force",
    "-Z0", "-z8",
    "--simplification=10",
    "--drop-densest-as-needed",
    "--coalesce-densest-as-needed",
    "--detect-shared-borders",
    adm0, adm1, labels,
  ];
  log("tippecanoe", args.join(" "));
  execFileSync("tippecanoe", args, { stdio: "inherit" });
}

// --- main --------------------------------------------------------------------
preflight();
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
const { adm0, adm1 } = await sourceGeo();
const gaz = await buildGazetteer();
const labelFeatures = [];
const n0 = norm(adm0, "ADM0", gaz, labelFeatures);
const n1 = norm(adm1, "ADM1", gaz, labelFeatures);
const labelsPath = join(CACHE, "labels.norm.geojson");
writeAtomic(labelsPath, JSON.stringify({ type: "FeatureCollection", features: labelFeatures }));
log(`labels: ${labelFeatures.length} points`);
tile(n0, n1, labelsPath);
log(`done -> ${OUT}`);
execFileSync("pmtiles", ["show", OUT], { stdio: "inherit" });
