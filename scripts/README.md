# scripts

## build-tiles.mjs — admin-1 boundary tile pipeline (Story 1.2)

Builds `public/tiles/boundaries.pmtiles` (country + admin-1 boundaries with ISO codes
and baked zh-Hant labels) for the map to render (Story 1.3).

### Prerequisites (system binaries — NOT pnpm packages)

```bash
brew install tippecanoe pmtiles    # macOS
# linux: build tippecanoe from source; pmtiles via `go install github.com/protomaps/go-pmtiles@latest`
```

### Run

```bash
pnpm tiles:build                 # SAMPLE scope: Taiwan + Japan + USA (small, fast — for dev/CI verification)
TILES_SCOPE=global pnpm tiles:build   # FULL worldwide CGAZ ADM0+ADM1 (~760MB download; run with bandwidth + time)
```

- Source: **geoBoundaries** (CC BY). Sample uses the per-country API; global uses the CGAZ combined files.
- Labels: **Wikidata** `zh-Hant` joined by ISO 3166-1 (`P297`) / ISO 3166-2 (`P300`), cached to `wikidata-zh-gazetteer.json`. English fallback where missing.
- Output properties per feature: `iso`, `country`, `name`, `name_zh`.
- Downloads cache in `.tiles-cache/` (gitignored).

### Notes / TODO for full global scope
- `ISO3_TO_ISO2` in the script covers the sample countries only. Global scope needs a full ISO3→ISO2 table (add `i18n-iso-countries`, or extend the inline map) so country `iso` is alpha-2 everywhere.
- The PMTiles output may be committed (dev) or uploaded to the Supabase Storage public bucket (prod) — the render story (1.3) reads it via MapLibre's `pmtiles://` protocol.
