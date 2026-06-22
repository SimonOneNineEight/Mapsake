// Mapsake — Story 1.2: admin-1 boundary tile pipeline.
// Natural Earth 1:10m admin-0 + admin-1  ->  normalize (ISO codes + zh-Hant labels)  ->  tippecanoe  ->  PMTiles.
//
// Why Natural Earth: it's a single globally-CONSISTENT source, so every country's
// coastline has comparable detail (geoBoundaries' open data swings wildly — China was
// ~170 vertices/province and rendered as straight polygonal segments). NE also ships
// ISO 3166-2 codes and Traditional-Chinese names (NAME_ZHT) built in.
//
// Taiwan override: NE's Taiwan/Kinmen geometry is only moderate (~30 pts for Kinmen).
// Taiwan is the hero region (zh-TW first) AND an island — no shared land border with an
// NE neighbour, so mixing sources is safe (no coastline seam). We therefore drop NE's
// Taiwan and pull TWN ADM0 + ADM1 from geoBoundaries gbOpen full-res instead, keeping
// Taiwan + Kinmen + Matsu crisp. NE already separates Taiwan from China, so the old
// turf China-clip is gone.
//
// Scope:
//   default      = representative SAMPLE (TWN, JPN, USA)
//   TILES_SCOPE=global = every country in the NE files.
//
// Prereqs (system binaries, NOT pnpm): tippecanoe, pmtiles. See scripts/README.md.
// Run: pnpm tiles:build   (node scripts/build-tiles.mjs)
//
// Region identity contract (architecture.md#Data Architecture): ISO codes.
//   ADM0 feature.iso = ISO 3166-1 alpha-2 ("JP"); ADM1 feature.iso = ISO 3166-2 ("JP-26").
// Properties baked per feature: { iso, country, name, name_zh }; ADM0 also { has_admin1 }.
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
// Sample build = these three countries (by NE alpha-3) for a fast local tileset.
const SAMPLE_A3 = new Set(["TWN", "JPN", "USA"]);

// Natural Earth 1:10m (nvkelso mirror). admin-0 = countries, admin-1 = states/provinces.
const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";
const NE_ADM0_URL = `${NE_BASE}/ne_10m_admin_0_countries.geojson`;
const NE_ADM1_URL = `${NE_BASE}/ne_10m_admin_1_states_provinces.geojson`;

// ISO 3166-1 alpha-3 -> alpha-2, used only to map geoBoundaries' Taiwan (shapeGroup TWN) to "TW".
const ISO3_TO_ISO2 = { TWN: "TW" };
// Known source typos in geoBoundaries shapeISO (geoBoundaries data, not ours).
const ISO_FIXUPS = { "SU-SD": "US-SD" };

const valid2 = (s) => (/^[A-Z]{2}$/.test((s || "").toUpperCase()) ? s.toUpperCase() : null);
const validSub = (s) => /^[A-Z]{2}-[A-Z0-9]+$/.test(s || "");

// Coerce a geoBoundaries ADM1 shapeISO toward valid ISO 3166-2 ("CC-XXX"). Only used for
// the Taiwan override now; kept because gbOpen shapeISO has recurring separator/prefix defects.
function normSubISO(raw, country, group) {
  const s = (ISO_FIXUPS[raw] || raw || "").trim().toUpperCase().replace(/[_=]/g, "-").replace(/\*+$/, "");
  if (validSub(s)) return s;
  if (group && s === String(group).toUpperCase()) return s; // country code misused as region
  if (country && country.length === 2 && /^[A-Z0-9]{1,4}$/.test(s) && s !== country)
    return `${country}-${s}`;
  return s;
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

// Content-length of a URL (0 if unknown) — used to skip full-res files that would
// exceed V8's max string length (~512MB) when read, falling back to simplified.
const MAX_READABLE_BYTES = 450_000_000;
async function headSize(url) {
  try {
    const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA } });
    const len = res.headers.get("content-length");
    return len ? Number(len) : 0;
  } catch {
    return 0;
  }
}

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

// --- zh-Hant gazetteer (Wikidata), with zh fallback chain --------------------
// Primary zh source. NE's NAME_ZHT is the fallback (see buildFeature), so a missing
// gazetteer entry still yields Traditional Chinese rather than a romanized name.
async function buildGazetteer() {
  if (existsSync(GAZETTEER)) {
    log("gazetteer cache hit");
    return JSON.parse(readFileSync(GAZETTEER, "utf8"));
  }
  const endpoint = "https://query.wikidata.org/sparql";
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
      if (!map[b.code.value]) map[b.code.value] = b.label.value; // zh-Hant wins; fallbacks fill gaps
    }
  }
  writeAtomic(GAZETTEER, JSON.stringify(map, null, 0));
  log(`gazetteer: ${Object.keys(map).length} codes`);
  return map;
}

// --- label points: one representative point per feature ----------------------
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

// --- source extractors: each source's schema -> a common shape ---------------
// { iso, country, name, neZh, geometry }. iso/country are validated downstream.
function fromNeAdm0(f) {
  const p = f.properties;
  // ISO_A2_EH resolves NE's disputed encodings (Taiwan's default ISO_A2 is "CN-TW",
  // EH gives "TW"). Fall back to ADM0_A3 so disputed/uncoded land still gets a UNIQUE
  // id (no feature-state collisions) — it renders but isn't markable (3-letter fails
  // the client's alpha-2 guard).
  const iso = valid2(p.ISO_A2_EH) || valid2(p.ISO_A2) || p.ADM0_A3;
  return { iso, country: iso, name: p.NAME, neZh: p.NAME_ZHT, geometry: f.geometry };
}
function fromNeAdm1(f) {
  const p = f.properties;
  const iso = (p.iso_3166_2 || "").trim().toUpperCase();
  return { iso, country: iso.slice(0, 2), name: p.name, neZh: p.name_zht, geometry: f.geometry };
}
function fromGbAdm0(f) {
  const p = f.properties || {};
  const iso = ISO3_TO_ISO2[p.shapeGroup] || p.shapeISO;
  return { iso, country: iso, name: p.shapeName, neZh: undefined, geometry: f.geometry };
}
// neZhByIso lets the geoBoundaries Taiwan override inherit NE's Traditional-Chinese
// county names (gbOpen carries none), so a gazetteer miss still yields 金門縣 not "Kinmen".
function makeGbAdm1Extractor(neZhByIso) {
  return (f) => {
    const p = f.properties || {};
    const country = ISO3_TO_ISO2[p.shapeGroup] || p.shapeGroup;
    const iso = normSubISO(p.shapeISO, country, p.shapeGroup);
    return { iso, country, name: p.shapeName, neZh: neZhByIso[iso], geometry: f.geometry };
  };
}

// --- normalize ONE extracted feature -> tippecanoe feature + label -----------
function buildFeature(ex, level, hasAdm1Set, gaz, stats) {
  const { iso, country, name, neZh, geometry } = ex;
  if (level === "ADM1" && !validSub(iso)) {
    stats.dropped.push(`${country || "?"}:${name}="${iso}"`); // un-markable / orphan blob
    return null;
  }
  const name_zh = gaz[iso] || neZh || name;
  if (gaz[iso]) stats.withZh++;
  const props = { iso, country, name, name_zh };
  if (level === "ADM0") props.has_admin1 = hasAdm1Set.has(iso);
  const feature = {
    type: "Feature",
    properties: props,
    tippecanoe: { layer: level === "ADM0" ? "countries" : "regions", minzoom: level === "ADM0" ? 0 : 3 },
    geometry,
  };
  const label = {
    type: "Feature",
    properties: props,
    tippecanoe: { layer: level === "ADM0" ? "country_labels" : "region_labels", minzoom: level === "ADM0" ? 0 : 4 },
    geometry: { type: "Point", coordinates: labelPoint(geometry) },
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

// --- tippecanoe -> PMTiles (layers come from per-feature tippecanoe.layer) ---
function tile(features, labels) {
  const args = [
    "-o", OUT, "--force",
    "-Z0", "-z9", // maxzoom 9: crisp through admin-1 + a little beyond, no overzoom mush
    "--simplification=4", // light — retain coastline detail from the source
    "--drop-densest-as-needed",
    "--coalesce-densest-as-needed",
    "--detect-shared-borders",
    features, labels,
  ];
  log("tippecanoe", args.join(" "));
  execFileSync("tippecanoe", args, { stdio: "inherit" });
}

// geoBoundaries per-country fetch (Taiwan override only). Prefers full-res; falls back
// to simplified if the full file would exceed V8's string limit.
async function fetchGbLevel(iso3, lvl) {
  try {
    const meta = await getJSON(`https://www.geoboundaries.org/api/current/gbOpen/${iso3}/${lvl}/`);
    const fullUrl = meta?.gjDownloadURL;
    const simpUrl = meta?.simplifiedGeometryGeoJSON;
    if (!fullUrl && !simpUrl) throw new Error("no geometry URL");
    let url = fullUrl ?? simpUrl;
    let suffix = fullUrl ? "f" : "s";
    if (fullUrl && (await headSize(fullUrl)) > MAX_READABLE_BYTES && simpUrl) {
      warn(`${iso3}/${lvl}: full-res too large to read — using simplified`);
      url = simpUrl;
      suffix = "s";
    }
    return JSON.parse(await fetchToCache(`${iso3}_${lvl}_${suffix}.geojson`, url)).features;
  } catch (e) {
    warn(`${iso3}/${lvl}: ${e.message} — skipped`);
    return null;
  }
}

// Emit a list of extracted features to the feature + label streams, in batches so
// peak string memory stays bounded (NE admin-1 is ~4.6k features).
async function emit(list, level, ctx) {
  let fbuf = "", lbuf = "", n = 0;
  for (const ex of list) {
    const built = buildFeature(ex, level, ctx.hasAdm1Set, ctx.gaz, ctx.stats);
    if (!built) continue;
    fbuf += JSON.stringify(built.feature) + "\n";
    lbuf += JSON.stringify(built.label) + "\n";
    ctx.featCount.n++;
    if (++n >= 200) {
      await writeChunk(ctx.featOut, fbuf);
      await writeChunk(ctx.labelOut, lbuf);
      fbuf = ""; lbuf = ""; n = 0;
    }
  }
  if (fbuf) {
    await writeChunk(ctx.featOut, fbuf);
    await writeChunk(ctx.labelOut, lbuf);
  }
}

// --- main --------------------------------------------------------------------
preflight();
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });
const gaz = await buildGazetteer();

// Natural Earth base.
const ne0 = JSON.parse(await fetchToCache("ne_10m_admin_0.geojson", NE_ADM0_URL)).features;
const ne1 = JSON.parse(await fetchToCache("ne_10m_admin_1.geojson", NE_ADM1_URL)).features;

// Drop NE's Taiwan (ADM0_A3 / adm0_a3 === "TWN"); the override below supplies it full-res.
let ne0Feats = ne0.filter((f) => f.properties.ADM0_A3 !== "TWN");
let ne1Feats = ne1.filter((f) => f.properties.adm0_a3 !== "TWN");
if (SCOPE !== "global") {
  ne0Feats = ne0Feats.filter((f) => SAMPLE_A3.has(f.properties.ADM0_A3));
  ne1Feats = ne1Feats.filter((f) => SAMPLE_A3.has(f.properties.adm0_a3));
}

// Taiwan override (geoBoundaries gbOpen full-res). Inherit NE's TW zh county names so
// gazetteer misses still render Traditional Chinese.
const neZhByIso = {};
for (const f of ne1) {
  const p = f.properties;
  if (p.adm0_a3 === "TWN" && p.iso_3166_2) neZhByIso[p.iso_3166_2.trim().toUpperCase()] = p.name_zht;
}
const gbTwAdm0 = (await fetchGbLevel("TWN", "ADM0")) || [];
const gbTwAdm1 = (await fetchGbLevel("TWN", "ADM1")) || [];
const gbAdm1Ex = makeGbAdm1Extractor(neZhByIso);

// Extract everything to the common shape.
const adm0List = [...ne0Feats.map(fromNeAdm0), ...gbTwAdm0.map(fromGbAdm0)];
const adm1List = [...ne1Feats.map(fromNeAdm1), ...gbTwAdm1.map(gbAdm1Ex)];

// Countries that have real admin-1 land (drives the style's ADM0 fade at high zoom so
// the ADM0/ADM1 coastline mismatch can't leave a cream coastal sliver).
const hasAdm1Set = new Set();
for (const ex of adm1List) if (validSub(ex.iso)) hasAdm1Set.add(ex.country);

const featPath = join(CACHE, `${SCOPE}_features.geojsonl`);
const labelPath = join(CACHE, `${SCOPE}_labels.geojsonl`);
const featOut = createWriteStream(featPath);
const labelOut = createWriteStream(labelPath);
const stats = { withZh: 0, dropped: [] };
const featCount = { n: 0 };
const ctx = { featOut, labelOut, gaz, stats, hasAdm1Set, featCount };

await emit(adm0List, "ADM0", ctx);
await emit(adm1List, "ADM1", ctx);
await endStream(featOut);
await endStream(labelOut);

log(`${adm0List.length} countries, ${hasAdm1Set.size} with admin-1; ${featCount.n} features written, zh labels on ${stats.withZh}`);
if (stats.dropped.length)
  warn(`dropped ${stats.dropped.length} admin-1 feature(s) with unrecoverable ISO (first 12): ${stats.dropped.slice(0, 12).join("; ")}`);

tile(featPath, labelPath);
log(`done -> ${OUT}`);
execFileSync("pmtiles", ["show", OUT], { stdio: "inherit" });
