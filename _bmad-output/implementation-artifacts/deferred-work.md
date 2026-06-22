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

## Deferred from: code review of story-1.4 (2026-06-22)

- **Offline/error mid-request hardening (anon session)** — if the middleware anon bootstrap fails open (Supabase unreachable, or the anon toggle off), the page serves with no session and subsequent marks fail closed with no client-side recovery until a full navigation re-hits middleware. Also `addRegionMark` uses `getUser()` (auth-server round-trip) per mark vs reading the local JWT via `getClaims()`. Wire a client-side re-bootstrap + cheaper session read with the offline/error-state work. [lib/supabase/proxy.ts, data/region-marks.ts]
- **`removeRegionMark` defense-in-depth** — add an explicit `.eq("user_id", user.id)` to the delete so a future RLS misconfiguration can't widen it to other users' rows. RLS (`region_marks_owner_delete`) scopes it correctly today, so this is belt-and-suspenders. [data/region-marks.ts]

## Deferred from: Story 1.5 review — Taiwan/China tile-data defects (2026-06-22, belongs to Story 1.2 tile pipeline)

Surfaced once region fills became visible. Confirmed via queryRenderedFeatures at central Taiwan ([121.0, 23.7]):
- **China ADM0 overlaps Taiwan.** `countries-fill` returns BOTH `TW` and `CN` over the Taiwan main island — gbOpen's `CHN` ADM0 draws the PRC claim over Taiwan. Marking China fills Taiwan terracotta, and a tap on Taiwan can resolve to `CN`. Violates the design's "Taiwan = its own ADM0" stance.
- **China ADM1 is a malformed single blob.** China's admin-1 came through the global build as ONE feature with `iso="CHN"` (the ISO3, not `CN-xx`) covering all of China incl. Taiwan — the "country-code-as-region" tail from the 1.2 global rework. Tapping it would mark `CHN`, and it overlaps Taiwan counties.
- **Fix (tile pipeline, Story 1.2):** clip `CHN` ADM0 to exclude Taiwan (or apply the project's Taiwan disputed-border stance at tile-build); repair/replace China's ADM1 with proper ISO 3166-2 codes (extend the ISO-override table) or drop the malformed blob. Until then, marking near the Taiwan/China boundary is unreliable.
- **Optional 1.5-side mitigation:** `regionFromPoint` could ignore features whose `iso` isn't valid ISO 3166-2 (skip the `CHN` blob), so taps fall through to the real TW county. Doesn't fix the visual overlap, only the mis-mark.

### Tile-fidelity finding (2026-06-22, same Story 1.2 follow-up)
At z9 the visited fill exposes a COARSE, blocky coastline that juts into the ocean and doesn't match the real coast or 金門's finer outline. Causes: (1) the global build uses gbOpen's `simplifiedGeometryGeoJSON` (chosen to dodge the 648MB full-res file that exceeds V8's max string length), so source geometry is low-vertex; (2) tippecanoe `-z8` maxzoom + `--simplification=10`, so z9+ overzooms a coarse z8 tile. Fill and line share geometry (they align with each other); the mismatch is this coarse ADM0 vs finer features. Fix in the tile pipeline: raise maxzoom + lower simplification, and use FULL-RES geometry for the big countries via a STREAMING JSON parser (so we're not blocked by the string limit) instead of the simplified files. Combine with the China-clip / Taiwan-stance fix above in one rebuild.

## Deferred from: code review of story-1.5 (2026-06-22)

- **Per-region mark retry under rapid taps** — `useAddRegionMark` is a single mutation instance, so `MarkStatus`/`addMark.variables` track only the latest tap. A non-latest write that fails isn't retried; its optimistic mark stays in cache (fills) but never persists (vanishes on reload). The durable-write "calm retry retains the mark" guarantee holds only for the most recent tap. Fix with per-region failure tracking (queue keyed by `regionCode|level`) — fits the offline-outbox / Epic 6 affordance polish. [features/regions/queries/region-marks-queries.ts, features/map/components/MapCanvas.tsx]
- **Transient unvisited flash on concurrent taps** — `onSuccess` does a full `invalidateQueries` (refetch); a concurrent in-flight tap's optimistic entry is briefly dropped by the refetch then re-fills on its own ack. Self-healing but momentarily violates "never flash back to unvisited." Refine by merging the acked row via `setQueryData` (or invalidating only when no mutations are pending) instead of refetch-all. [features/regions/queries/region-marks-queries.ts]

## Deferred from: code review of story-1.6 (2026-06-22)

- **No browser-level no-cascade / unmark→clear e2e** — the roll-up's "no downward cascade" and "removing the last contributing mark clears the country" are covered by the pure `computeVisitedKeys` tests but not asserted in the browser harness. Unmark UX isn't wired until Epic 3 (Story 3.8), and the pure function is the source of truth for the cascade logic, so a browser assertion is low-value until unmark exists. Add a browser no-cascade + unmark→clear e2e when Story 3.8 lands. [e2e/map.spec.ts]
- **`splitKey` unguarded for a missing "|"** — `key.indexOf("|")` returns -1 when absent, so `slice(0,-1)`/`slice(0)` would yield garbage rather than fail. Unreachable by construction today (every key is built by `computeVisitedKeys` with a `<layer>|<id>` separator, and `prev` only ever holds prior computed keys). Pre-existing inline behavior from Story 1.5, just extracted into the helper. Add an assertion/guard if a non-computed key source is ever introduced. [features/map/lib/visited.ts:72]

## Deferred from: code review of story-3.1 (2026-06-22)

- **Temp+real pin marker double-render flash** — `useAddPin` optimistic add uses a temp `crypto.randomUUID()` id; `onSuccess` full-invalidates, so the optimistic pin and the refetched server row (different ids) briefly coexist in the cache → two circles stack at the same coords until the refetch collapses them. Self-healing flash. Refine in Story 3.3 (clustering/marker work) by merging the acked row via `setQueryData` instead of a full invalidate. Analog of the deferred 1.5 concurrent-tap flash. [features/pins/queries/pins-queries.ts]
- **Offline guard asymmetric on the pin save path** — the AddPin affordance is disabled when `offline`, but a save fired mid-flow (going offline after entering drop mode / with the name input open) isn't guarded the way the mark tap is (`navigator.onLine` check). Lands the no-error-surface path. Fold into the offline-outbox / write-posture work (Epic 6). [features/map/components/MapCanvas.tsx]
- **Pins cache-key desync on auth change** — `['pins', userId]` data from a prior (anonymous) session can linger when `userId` changes without a hard reload (e.g. anon → account claim). Same pattern as `['regionMarks', userId]`; address when account-linking / cross-device sync lands (Epic 2, Stories 2-3/2-4). [features/pins/queries/pins-queries.ts]
- **Pin write failure/retry + tap-on-pin no-op not e2e-tested** — `e2e/pins.spec.ts` covers the happy drop→name→persist→reload path; the failure/retain/retry path and the AC3 "tap on existing pin is a no-op" guard are covered only indirectly. Add browser assertions alongside the AC4 retry affordance. [e2e/pins.spec.ts]
