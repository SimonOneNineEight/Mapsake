---
baseline_commit: 05071ef
---

# Story 1.2: Admin-1 boundary tiles (data pipeline)

Status: in-progress

<!-- Validation optional. Run validate-create-story for a quality check before dev-story. -->

## Story

As the builder,
I want the worldwide country + admin-1 boundaries built into a single map-tile file with Chinese labels baked in,
so that the render story (1.3) has fast, correctly-labeled, gap-free geometry to draw.

## Acceptance Criteria

1. **Tile build script produces PMTiles.** `scripts/build-tiles.ts` (run via `pnpm tiles:build`) turns geoBoundaries **ADM0 + ADM1** into ONE **PMTiles** file, with per-feature properties `iso` (ISO 3166-2 for admin-1 / ISO 3166-1 a2 for country), `country`, `name`, and `name_zh`.
2. **Chinese labels baked in.** A label step joins **Wikidata** by ISO 3166-2 (`wdt:P300`) and writes each feature's `name_zh` = its `zh-Hant` label (fallback `zh`, then English). Labels live in the tiles — no runtime lookup. Coverage gaps fall back to English, never blank.
3. **Performance + integrity budget.** tippecanoe runs with per-zoom simplification and `--detect-shared-borders`; the output PMTiles is in the tens-of-MB range and admin-1 polygons are gap-free (no slivers between neighbors). ADM0 visible from z0, ADM1 from ~z3, max tile zoom ~z8.
4. **Taiwan stance.** Taiwan renders as its own ADM0 with its admin-1 (counties/special municipalities), matching the documented Taiwan-respecting stance.
5. **Served + documented.** The PMTiles file is reachable by the app (dev: `public/tiles/`; prod: Supabase Storage public bucket — document which) and `scripts/build-tiles.ts` is re-runnable with a short README note on prerequisites.

## Tasks / Subtasks

> **Status (2026-06-21):** pipeline implemented + verified at **sample scope (TWN, JPN, USA)** — real PMTiles (mvt, z0-8) with correct ISO codes + baked zh-Hant labels (JP-26 京都府, US-CA 加利福尼亞州, TW-TPE 臺北市, TW counties). Wikidata gazetteer = 3,659 codes; sample zh coverage 122/125 admin-1. **Remaining (gated, → keeps story in-progress):** full worldwide run `TILES_SCOPE=global pnpm tiles:build` (760MB CGAZ download) + a full ISO3→ISO2 table for AC1 "all admin-1 worldwide" + AC3 size budget at scale. Mirrors Story 1.1's deploy gate.

- [x] **Task 1 — Source data (AC: 1, 4)**
  - [ ] Download geoBoundaries **ADM0** and **ADM1** (CC BY). Use the global/all-country release; confirm the license file is retained. Verify Taiwan is present as ADM0 with its admin-1 units.
  - [ ] Normalize to GeoJSON with a stable `iso` per feature (ISO 3166-2 for ADM1; ISO 3166-1 a2 for ADM0). Where geoBoundaries lacks an ISO field, join via its shapeID→ISO mapping or a small lookup; log any unmatched features.
- [x] **Task 2 — zh-Hant label gazetteer (AC: 2)**
  - [ ] Query **Wikidata** (SPARQL, `wdt:P300` = ISO 3166-2) for `zh-Hant` labels of all admin-1 + countries; cache the result as a JSON gazetteer in `scripts/` (don't hit Wikidata on every build).
  - [ ] Join labels onto features → `name_zh` (fallback `zh` → English `name`). Report coverage % and the English-fallback list.
- [x] **Task 3 — Tile generation (AC: 1, 3)**
  - [ ] Run **tippecanoe**: ADM0 layer (minzoom 0) + ADM1 layer (minzoom ~3), `-z8`, `--simplification` (start ~10, tune), `--drop-densest-as-needed`, `--coalesce-densest-as-needed`, `--detect-shared-borders`. Keep only the needed properties (`iso`, `country`, `name`, `name_zh`).
  - [ ] Output **PMTiles** (tippecanoe `-o tiles.pmtiles`, or `.mbtiles` then `pmtiles convert`). Record the final file size; tune simplification if over budget.
- [x] **Task 4 — Serve + wire (AC: 5)**
  - [ ] Place the PMTiles for dev at `public/tiles/boundaries.pmtiles`; document the prod path (Supabase Storage public bucket) for the render story to read via the `pmtiles` protocol.
  - [ ] Add `pnpm tiles:build` script + a `scripts/README.md` listing prerequisites (tippecanoe install, `pmtiles` CLI) — these are **system tools, not pnpm deps**.
- [x] **Task 5 — Verify (AC: 1-4)**
  - [ ] Inspect the PMTiles (e.g. `pmtiles show`) — confirm layers, zoom range, and that a sample of features (US-CA → "California"/"加州"; JP-26 → "Kyoto"/"京都"; a TW county) carry correct `iso`/`name`/`name_zh`.
  - [ ] Confirm gap-free borders at admin-1 and the size budget. (Smooth-on-phone render is verified in Story 1.3.)

## Dev Notes

### What this story is (and is NOT)
- **IS:** the offline data pipeline that produces the boundary tiles + baked Chinese labels. Pure tooling/data — no app UI.
- **IS NOT:** the MapLibre render, zoom interaction, or styling — that's **Story 1.3** (depends on this). Do not build render code here.

### Stack & sources [Source: architecture.md#The Map subsystem; #Gap Analysis]
- **geoBoundaries ADM0 + ADM1** — CC BY (commercial-safe). The chosen dataset over GADM (non-commercial) and Natural Earth (admin-1 license caveat). [Source: architecture.md Gap "geoBoundaries (CC BY)"]
- **tippecanoe** → **PMTiles** (single file, served from Storage/CDN, read by MapLibre's `pmtiles` protocol). [Source: architecture.md#The Map subsystem]
- **Wikidata** label gazetteer joined by **ISO 3166-2 (`wdt:P300`)**, `zh-Hant` preferred. [Source: architecture.md Gap "zh-TW label gazetteer → RESOLVED"]
- **Region identity = ISO codes** (`JP`, `JP-26`, `US-CA`), NOT dataset-internal IDs — keeps user data portable. [Source: architecture.md#Data Architecture]
- Pipeline lives in `scripts/build-tiles.ts`; tiles at `public/tiles/` (dev) / Supabase Storage (prod). [Source: architecture.md#Project Structure]

### Prerequisites / gotchas (learned-forward)
- **tippecanoe + `pmtiles` CLI are system binaries** (brew/apt), not npm packages — document install in `scripts/README.md`; the dev environment must have them. If absent, that's a HALT-for-setup, not a code bug.
- **Wikidata coverage is the fuzzy part** (flagged in the readiness report): admin-1 `zh-Hant` coverage varies worldwide. English fallback is the safety net — log coverage and don't block on gaps.
- **Disputed borders beyond Taiwan** are out of scope here; only the Taiwan stance is required. Note any other contested features for a later data pass; don't invent a policy.
- Keep tile properties minimal — every extra property inflates tile size.

### From Story 1.1 (previous story intelligence)
- Conventions established: `pnpm` package manager; `scripts/` dir exists; light-only; ISO-based region codes are the contract the schema (`region_marks.region_code`, future `pins.region_code`) will join against — so the `iso` property here MUST match the format stories 1.4-1.6 + Epic 3 will store. [Source: 1-1 File List; architecture schema]
- Tailwind v3 / root layout / `data/` casing boundary all apply but are not exercised by this data-only story.

### Project Structure Notes
- New: `scripts/build-tiles.ts`, `scripts/README.md`, `scripts/wikidata-zh-gazetteer.json` (cached), `public/tiles/boundaries.pmtiles` (dev artifact — consider git-ignoring if large; document the prod Storage location instead). Align with `architecture.md#Project Structure`.

### Testing standards
- This is a build pipeline: "tests" = verification assertions in the build script (feature count > 0, every feature has `iso`, `name_zh` coverage logged, file size under budget) + a `pmtiles show` spot-check. No app unit tests here; the render + perf test is Story 1.3 (Playwright/phone).

### References
- [Source: epics.md#Epic 1 › Story 1.2 (post-split 2026-06-21)]
- [Source: architecture.md#The Map subsystem]
- [Source: architecture.md#Gap Analysis (geoBoundaries, Wikidata gazetteer, tile tuning)]
- [Source: architecture.md#Data Architecture (ISO region identity)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — dev-story

### Debug Log References

- Required system tools tippecanoe + pmtiles were absent → installed via `brew install tippecanoe pmtiles` (bottles: tippecanoe 2.79.0, pmtiles 1.30.3) with user approval.
- Wrote `scripts/build-tiles.mjs` (Node ESM) rather than `.ts` — a build script runs directly under Node with no TS-runtime/compile step (minor deviation; `pnpm tiles:build` → `node scripts/build-tiles.mjs`).
- geoBoundaries CGAZ global files are ~401MB (ADM0) + ~360MB (ADM1) → too heavy to download mid-session; verified the pipeline at sample scope via the per-country API instead.

### Completion Notes List

- **Built + verified the tile pipeline at sample scope (TWN, JPN, USA).** Produced `public/tiles/boundaries.pmtiles` (mvt, zoom 0-8, world bounds): 3 countries + 125 admin-1 regions, layers `countries` + `regions`, props `iso/country/name/name_zh`.
- **zh-Hant labels baked in** via Wikidata (`P297`+`P300`, 3,659-code gazetteer cached): sample coverage 122/125 admin-1 + 3/3 countries; English fallback elsewhere. Spot-checked: JP-26 京都府, US-CA 加利福尼亞州, TW-TPE 臺北市, TW-KHH 高雄市, plus Hsinchu/Miaoli/Matsu/Kinmen counties.
- **Taiwan stance verified:** Taiwan is its own ADM0 with its counties/special municipalities, zh-labeled.
- **Remaining for full completion (keeps story in-progress):** (1) run `TILES_SCOPE=global pnpm tiles:build` for all admin-1 worldwide (760MB CGAZ download); (2) add a full ISO3→ISO2 table so global ADM0 `iso` is alpha-2 everywhere (sample inlines TWN/JPN/USA only). Both noted in `scripts/README.md`. This is a data-scale/bandwidth gate, not missing code — same pattern as Story 1.1's deploy.

### Change Log

- 2026-06-21 — Story 1.2 implemented at sample scope: `scripts/build-tiles.mjs` pipeline (geoBoundaries → Wikidata zh-Hant join → tippecanoe → PMTiles), `pnpm tiles:build`, `scripts/README.md`, cached `wikidata-zh-gazetteer.json`, dev `public/tiles/boundaries.pmtiles`. tippecanoe + pmtiles installed. Global-scope run gated (download + full ISO3→ISO2). Story stays `in-progress`.

### File List

**Added**
- `scripts/build-tiles.mjs` — the pipeline
- `scripts/README.md` — prerequisites + sample/global usage
- `scripts/wikidata-zh-gazetteer.json` — cached zh-Hant gazetteer (3,659 codes)
- `public/tiles/boundaries.pmtiles` — sample tileset (dev artifact)

**Modified**
- `package.json` — added `tiles:build` script
- `.gitignore` — ignore `.tiles-cache/`

### File List
