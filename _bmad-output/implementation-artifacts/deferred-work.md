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

## Deferred from: code review of story-3.3 (2026-06-22)

- **Pin zoom-fade (AC3) not e2e-asserted** — the `circle-opacity` interpolate-by-zoom ramp (markers fade in z4→6.5, clusters z3→5) is verified by code inspection + an MCP visual, but not guarded by an e2e assertion (opacity-by-zoom is fragile to assert reliably in headless chromium). Add a fade assertion when pin rendering gets richer (Story 3.4+ / the teardrop polish). [features/map/style.ts, e2e/pins.spec.ts]

## Deferred from: code review of story-3.4 (2026-06-22)

- **Desktop panel can occlude the opened pin** — when the ≥840 memory panel docks (right ~38%), the map cell shrinks but doesn't recenter, so a pin that was in the right region sits behind the panel. The title shows in the panel so it isn't broken, but the glowing pin is hidden. Fix with a pan/`easeTo` that offsets by the panel width (or fold into Epic 5's re-live fly-to, which centers the pin anyway). [features/memories/components/memory-container.tsx, features/map/components/MapCanvas.tsx]
- **Phone sheet keeps its snap across a pin swap** — tapping pin B while pin A's sheet is dragged to full opens B at full (snap resets only on close, not on pin change, to keep swap-in-place without a remount). Minor; revisit when the sheet content grows (note/photos in 3.5/3.6). [features/memories/components/memory-container.tsx]
- **Selected pin: literal ~1.15× marker scale not implemented** — DESIGN memory-pin.selected is accent glow + ~1.15× scale; 3.4 ships the accent halo (which enlarges the footprint + glows) but doesn't scale the marker circle itself. Add a selected-marker scale (feature-state or a filtered larger marker) if/when pin rendering gets the teardrop polish. [features/map/style.ts]

## Deferred from: Story 3.5 dev (2026-06-22) — e2e test infrastructure

- **e2e exhausts the Supabase anonymous-sign-in rate limit** — every Playwright context creates a fresh anonymous user (a `signInAnonymously` call via the SSR middleware). The growing browser-test suite (drop/open/note/date/cluster…) creates ~10+ anon users per full run, and repeated local runs hit Supabase's per-IP hourly anon-sign-in cap → `Request rate limit reached` → the session never resolves → 30s timeouts across the suite (not a product bug). **Fix:** create ONE anon session in a Playwright global-setup, save its `storageState`, and reuse it across all browser tests (Playwright `use: { storageState }`) so the suite mints a single anon user. Also consider a per-test pin cleanup. Until then, local runs flake once the cap is hit (resets ~hourly); CI is less affected (fresh IP + `workers:1`). [playwright.config.ts, e2e/]

## Deferred from: Story 3.6 dev (2026-06-23)

- **HEIC photo support** — v1 `processImage` decodes via `HTMLImageElement`, which (like `createImageBitmap`) can't decode iPhone HEIC; such a file rejects and surfaces as the calm per-photo retry/error (AC2 path), not a crash. **Fix:** add `heic2any` (or a server-side/Edge transform) to convert HEIC→JPEG before the resize step. iPhone Safari often serves the camera roll as JPEG already, so impact is partial; revisit when real-device testing shows HEIC reaching upload. [features/memories/lib/process-image.ts]
- **Per-photo `process-image` unit test** — the resize-to-WebP + EXIF-date logic is covered end-to-end by the upload e2e (real browser), but there's no isolated unit test asserting output dims ≤2048 / `image/webp` / parsed `takenAt`, because the repo has **no unit runner** (Playwright-only). Add a focused test if/when vitest is introduced; until then the e2e + code review are the guard. [features/memories/lib/process-image.ts]
- **`taken_at` (EXIF) not surfaced/asserted in UI** — 3.6 stores `photos.taken_at` but nothing displays it (it feeds Epic 5 re-live eligibility), so the e2e can't assert AC3 through the UI. When eligibility lands, assert the captured date there (or via a direct row read). The pin-level "first photo's EXIF date" anniversary roll-up (`pins.exif_taken_at` or `min(photos.taken_at)`) is Epic 5, intentionally not built here. [data/photos.ts, Epic 5]
- **Signed-URL expiry / no caching of object URLs** — `usePhotos` re-signs every fetch (1h TTL) and relies on refetch-on-focus; for many photos this re-signs the whole set each time. Fine for v1 (≤30/pin). Consider longer TTL, a CDN/transform URL, or per-path signed-URL caching when photo-heavy pins are common. [features/memories/queries/photos-queries.ts]
- **Photo delete + object cleanup (Story 3.8)** — `data/photos.ts` has no delete; removing a photo (and its Storage object) + the pin-delete object cleanup handler land in 3.8. The table already cascades photo *rows* on pin delete, but the Storage *objects* are not yet cleaned. [data/photos.ts, Story 3.8]

> Dev learning: **`createImageBitmap` fails under headless SwiftShader** ("source image could not be decoded") even for valid PNGs; `HTMLImageElement` + `canvas.drawImage`/`toBlob('image/webp')` works everywhere. Prefer the `<img>` decode path for client image processing in this stack.

## Deferred from: code review of story-3.7 (2026-06-23)

- **Viewer should key on photo `id`, not index** — `PhotoViewer` opens at a positional `initialIndex`; if `usePhotos` refetched a reordered/shortened list while the viewer was open, the index could point at the wrong photo. Benign in 3.7 (stable `sort_order, created_at`; no add/delete from inside the viewer), but capturing the photo `id` (and resolving index from it) is more robust — fold in when photo delete/reorder (3.8) lands. [features/memories/components/photo-uploader.tsx, photo-viewer.tsx]
- **No focus trap in the full-screen viewer** — `role="dialog" aria-modal="true"` is declarative only; Tab can move focus to the sheet/panel behind the overlay. Acceptable v1 lightbox cut; add a real focus trap (and confirm focus-restore) in an accessibility polish pass (Epic 6 a11y floor). [features/memories/components/photo-viewer.tsx]

## Deferred from: Story 3.7 dev (2026-06-23)

- **Pinch-zoom INTO a photo** — the full-screen viewer pages between photos (scroll-snap) but doesn't support pinch-to-zoom on an individual image. Not in the 3.7 ACs; approved deferral. Add a zoom/pan layer (or adopt a lightbox lib) in a later polish pass if users want to inspect photo detail. [features/memories/components/photo-viewer.tsx]
- **Viewer swipe + pull-down gestures not e2e-covered** — the viewer test asserts open + ArrowRight nav + Escape close (deterministic); native touch-swipe paging and pull-down-to-close are validated manually (synthetic touch-drag on a scroll-snap track is unreliable in headless chromium). Add device/gesture coverage if a touch-capable runner is introduced. [e2e/memory.spec.ts]

## Deferred from: code review of story-3.6 (2026-06-23)

- **No `<img>` onError fallback for expired/failed signed URLs** — `photo-grid.tsx` `Thumb` shows nothing (or a broken image) if a signed URL 403s, e.g. a card left open past the 1h TTL without a window refocus to trigger refetch. Add an `onError` placeholder + a re-sign/refetch nudge. Pairs with the signed-URL-caching item (longer TTL / CDN / per-path cache). [features/memories/components/photo-grid.tsx, features/memories/queries/photos-queries.ts]
- **`taken_at` stored UTC from tz-naive EXIF** — `process-image.ts` does `DateTimeOriginal.toISOString()`; EXIF capture time has no timezone, so the stored `timestamptz` is the wall-clock interpreted as UTC and can shift by the device offset. Harmless for Epic 5 re-live eligibility (day-granularity) but revisit if exact local capture time is ever surfaced. [features/memories/lib/process-image.ts]
- **No e2e for cross-pin photo no-bleed / EXIF-positive branch** — the upload+persist-across-reload flow is covered, but the two-pin no-bleed case (cf. the note no-bleed test) and the EXIF-bearing `taken_at` path are only asserted by reasoning (keying + code). Add a cross-pin photo test, and an EXIF assertion once `taken_at` has a UI surface (Epic 5) or a unit runner exists. [e2e/memory.spec.ts]

## Deferred from: code review of story-3.5 (2026-06-23)

- **`clickPin`-after-reload flakes under 2-worker concurrency** — the date-persist test (`memory.spec.ts:116`) fails ~50% in a full 2-worker run at the post-`reload()` `clickPin` (line 135), but passes deterministically in isolation (`-g`). The date saves + acks + displays correctly pre-reload every run, and persistence is real — this is a map-render timing race: after a fresh reload the pins source/marker may not be hit-testable yet when `clickPin` fires. The note-persist test uses the same pattern and is stable, so it's variance, not a categorical helper bug. **Fix:** make `clickPin` wait for the target pin feature to exist in the `pins` source (`querySourceFeatures`) or for the marker to be rendered before issuing the map click, instead of relying on map-settle timing. Fold in with the storageState test-infra work above. [e2e/memory.spec.ts, e2e/ helpers]
