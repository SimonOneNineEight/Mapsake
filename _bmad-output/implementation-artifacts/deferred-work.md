# Deferred Work

## Deferred from: code review of story-1.1 (2026-06-21)

- **CJK UI weight 600 not loaded** — `app/layout.tsx` loads Noto Serif/Sans TC at 400/500/700; DESIGN.md specifies `ui` text at weight 600. No CJK UI strings render yet, so add 600 when real Chinese UI lands (Epic 3 / Story 6.1).
- **`metadataBase` uses `VERCEL_URL`** — `app/layout.tsx` points OG/canonical at the per-deploy preview URL. Pre-existing `with-supabase` starter pattern; switch to `VERCEL_PROJECT_PRODUCTION_URL` (or the real domain) when production deploy is set up.
## Deferred from: code review of story-1.2 (2026-06-21)

- **Gazetteer cache never invalidates** — `scripts/build-tiles.mjs buildGazetteer()` reuses `wikidata-zh-gazetteer.json` forever. Add a TTL or `--refresh`/env flag to force a re-query.
- **Silent feature drop** — `--drop-densest-as-needed` may drop dense admin polygons at max zoom without notice. Add a post-tile assertion comparing input feature count vs `pmtiles show` tile feature counts.
- **Wikidata robustness** — the P297/P300 queries work today (~3.6k rows, fast) but have no retry/backoff for the public WDQS 429/60s-timeout risk. Add retry when running in CI.
- **Gazetteer determinism** — `map[code] = label` keeps an arbitrary label when a code has multiple zh-Hant entities. Pick a deterministic rule (e.g. prefer the entity that is an instance of the right admin level).

## Deferred from: code review of story-1.1 (2026-06-21, cont.)

- **Partial-env masking + non-null assertions** — `hasEnvVars` (`lib/utils.ts`) is a logical AND; if exactly one Supabase var is set, the app silently falls to pre-Supabase mode. The `lib/supabase/{client,server,proxy}.ts` clients use `!` non-null assertions and would throw if invoked with a missing key. Pre-existing starter behavior; harden when auth flows are built (Epic 2).

## Deferred from: code review of story-1.3 (2026-06-21)

- **Prod glyph self-hosting** — `features/map/style.ts` uses MapLibre's public demo glyph endpoint (`demotiles.maplibre.org`) serving `Open Sans Regular` for Latin labels. Prod must self-host font PBFs (range-served), and the DESIGN.md `map-label` Latin face is Nunito Sans, not Open Sans — so the prod glyph host + the `text-font` value should be reconciled together. CJK is unaffected (rendered locally via `localIdeographFontFamily`). Wire when prod hosting is set up (Vercel/Supabase Storage), alongside the prod tile URL.
