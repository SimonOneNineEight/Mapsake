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

## Deferred from: Story 4.2 scoping (2026-06-24)

- **"Change the default view in Settings" (4.2 AC2) → Story 6.3** — 4.2 ships AC1 (land on the saved view on load). The in-app control to CHANGE the default view is deferred to Story 6.3 (the full Settings surface, which already lists "default view"); no Settings chrome exists yet and building it in 4.2 would be throwaway. Shared contract = the `mapsake.defaultView` localStorage value (6.3 writes it; 4.2's load path applies it next open). Trade-off: the view isn't changeable in-app until Epic 6. [features/onboarding/lib/onboarding-prefs.ts, Story 6.3]

## Deferred from: code review of story-4.1 (2026-06-24)

- **Onboarding choice doesn't persist when localStorage is unavailable** — Safari private mode / disabled storage makes `writeDefaultView` a no-op, so the first-run default-view question re-shows on every load (the session works; the choice just never sticks). Acceptable v1 (local-first). Revisit when accounts (Epic 2) provide a server-side `profiles.default_view` fallback. [features/onboarding/lib/onboarding-prefs.ts]
- **`＋ 新增回憶` (AddPinButton) is still tappable during onboarding pick mode** — harmless (the `pickCountry` tap branch runs first, so a tap still picks a country, not a pin), but the button can visually toggle to its cancel label mid-onboarding. Hide/disable map write-affordances while onboarding is active when the fuller flow (4.3 backfill / 4.4 hand-off) lands. [features/map/components/MapCanvas.tsx]
- **No real-tap e2e for the pick-mode pointer-events pass-through** — `onboarding.spec.ts` fires a synthetic `map.fire("click")`, so the `pointer-events-none` hint letting taps through is asserted by construction, not by a real pointer event. Add a real-tap/device assertion with the gesture-testing work. [e2e/onboarding.spec.ts]
- **Onboarding question modal needs a full focus-trap (a11y)** — Story 4.1 review adds basic dialog semantics (role/aria/autofocus); a proper focus-trap + Escape handling belongs in the Epic 6 accessibility floor pass (6-2). [features/onboarding/components/onboarding.tsx]

## Deferred from: code review of story-3.10 (2026-06-23)

- **No error/retry surface for a failed region unmark** — `useUnmarkRegion` rolls the region + pins back into the cache on failure (the honest signal) but shows no calm retry / indicator; `MarkStatus` only reflects add-pin/add-mark. Route the unmark mutation's `isPending`/`isError` through a calm retry channel (extend `MarkStatus`, or keep the confirm dialog open with a pending/error state) as part of the offline / write-posture work (Epic 6). [features/map/components/MapCanvas.tsx, features/regions/queries/region-marks-queries.ts]
- **Country-level "Remove this place" leaves sibling admin-1 marks** — a country-level unmark deletes all pins in the country (approved broad scope) and removes the country `region_mark`, but it does NOT clear explicit admin-1 marks within that country. So the country can immediately re-light via a surviving child admin-1 mark's roll-up, which can read as "I removed it but it's still colored." Defensible (admin-1 marks are independent user intent), but revisit: either have the confirm name the surviving marks, or restrict v1 unmark to admin-1 regions only. [features/map/components/MapCanvas.tsx]

## Deferred from: code review of story-3.8 (2026-06-23)

- **Photo viewer doesn't re-seek scroll after a mid-list delete** — `photo-viewer.tsx` consumes `initialIndex` only on mount; deleting a non-current photo shrinks `photos` so the scroll-snap track collapses that frame and the user silently advances to the neighbor (deleting the current-last frame may flash a blank before the parent's `photos.length > 0` guard unmounts the viewer). Single-photo delete is fine (viewer closes). Cosmetic; fix by tracking the viewer's live current index and re-seeking after a removal (or close the viewer on any delete and let the grid reopen). [features/memories/components/photo-viewer.tsx, photo-uploader.tsx]

## Deferred from: Story 3.7 dev (2026-06-23)

- **Pinch-zoom INTO a photo** — the full-screen viewer pages between photos (scroll-snap) but doesn't support pinch-to-zoom on an individual image. Not in the 3.7 ACs; approved deferral. Add a zoom/pan layer (or adopt a lightbox lib) in a later polish pass if users want to inspect photo detail. [features/memories/components/photo-viewer.tsx]
- **Viewer swipe + pull-down gestures not e2e-covered** — the viewer test asserts open + ArrowRight nav + Escape close (deterministic); native touch-swipe paging and pull-down-to-close are validated manually (synthetic touch-drag on a scroll-snap track is unreliable in headless chromium). Add device/gesture coverage if a touch-capable runner is introduced. [e2e/memory.spec.ts]

## Deferred from: code review of story-3.6 (2026-06-23)

- **No `<img>` onError fallback for expired/failed signed URLs** — `photo-grid.tsx` `Thumb` shows nothing (or a broken image) if a signed URL 403s, e.g. a card left open past the 1h TTL without a window refocus to trigger refetch. Add an `onError` placeholder + a re-sign/refetch nudge. Pairs with the signed-URL-caching item (longer TTL / CDN / per-path cache). [features/memories/components/photo-grid.tsx, features/memories/queries/photos-queries.ts]
- **`taken_at` stored UTC from tz-naive EXIF** — `process-image.ts` does `DateTimeOriginal.toISOString()`; EXIF capture time has no timezone, so the stored `timestamptz` is the wall-clock interpreted as UTC and can shift by the device offset. Harmless for Epic 5 re-live eligibility (day-granularity) but revisit if exact local capture time is ever surfaced. [features/memories/lib/process-image.ts]
- **No e2e for cross-pin photo no-bleed / EXIF-positive branch** — the upload+persist-across-reload flow is covered, but the two-pin no-bleed case (cf. the note no-bleed test) and the EXIF-bearing `taken_at` path are only asserted by reasoning (keying + code). Add a cross-pin photo test, and an EXIF assertion once `taken_at` has a UI surface (Epic 5) or a unit runner exists. [e2e/memory.spec.ts]

## Deferred from: code review of story-3.5 (2026-06-23)

- **`clickPin`-after-reload flakes under 2-worker concurrency** — the date-persist test (`memory.spec.ts:116`) fails ~50% in a full 2-worker run at the post-`reload()` `clickPin` (line 135), but passes deterministically in isolation (`-g`). The date saves + acks + displays correctly pre-reload every run, and persistence is real — this is a map-render timing race: after a fresh reload the pins source/marker may not be hit-testable yet when `clickPin` fires. The note-persist test uses the same pattern and is stable, so it's variance, not a categorical helper bug. **Fix:** make `clickPin` wait for the target pin feature to exist in the `pins` source (`querySourceFeatures`) or for the marker to be rendered before issuing the map click, instead of relying on map-settle timing. Fold in with the storageState test-infra work above. [e2e/memory.spec.ts, e2e/ helpers]

## Deferred from: code review of story-4.3 (2026-06-24)

- **Backfill overlay accessibility** — `features/onboarding/components/onboarding.tsx` backfill step is a bare non-blocking layer (no `aria-live`, no focus move) — same pattern as the 4.1 `pick` hint. Fold into the Epic 6 6-2 accessibility floor pass (announce the prompt / manage focus for both non-blocking coaching layers).
- **focus→backfill e2e coverage** — only the world→backfill entry is exercised (`e2e/onboarding.spec.ts`). The focus path enters backfill at zoom 4 via the same `setOnboarding("backfill")`; add a focus-entry backfill assertion if the path ever diverges.
- **Backfill mark-persists assertion** — the backfill test deliberately omits asserting the tap actually marks (session-gated; blocked by the anon-signin rate-limit). Re-add a positive fill assertion once the shared anon `storageState` test-session reuse lands (Epic 6 6-5).

## Deferred from: code review of story-4.4 (2026-06-24)

- **Hand-off card accessibility** — `features/onboarding/components/onboarding.tsx` handoff step has no `role`/`aria-label`/Escape and uses `bg-card/95` (text contrast over a busy map). Same non-blocking pattern as the 4.1 pick hint and 4.3 backfill layer. Address all three coaching layers together in the Epic 6 6-2 accessibility floor pass.
- **Hand-off card vs ＋ button on short viewports** — the centered handoff card could, on a very short (landscape-phone) viewport, approach the bottom-right ＋ 新增回憶 button. No overlap in normal portrait/desktop use. Re-check during 6-2/6-4 polish.

## Deferred from: code review of story-4.5 (2026-06-24)

- **SW update-prompt** — `app/sw.ts` uses `skipWaiting` + `clientsClaim` with no refresh UX; a new SW can take over an open page and 404 lazy chunks (version skew). Add an update/refresh prompt with the offline-shell work (Story 4.6).
- **SW/cache e2e coverage** — Playwright runs against `pnpm dev` where the SW is `disable`d, so installable/precache behavior is untested. Add a production-build webServer (or a dedicated PWA spec) under CI/ops hardening (Story 6-5). Installability stays a manual Lighthouse check until icons land.
- **beforeinstallprompt pre-mount race + render-time platform reads** — `use-install-prompt.ts` attaches the listener in an effect (Chromium may fire `beforeinstallprompt` before it attaches) and computes `mode` from `window`/`navigator` in render (fragile, not a bug today since the hand-off card isn't in the hydration tree). Hardening: capture the event in an inline head script and replay; gate the platform reads behind a mounted flag.
- **iPadOS / in-app-browser detection** — `isIOSSafari()` misses iPadOS 13+ (desktop-class UA) and some in-app browsers. Refine in the 6-2/6-4 polish pass (iPhone, the retention target, is covered).
- **PWA brand icons (Simon dependency)** — `public/icons/icon-192.png`, `icon-512.png`, `maskable-512.png`, `public/apple-touch-icon.png` must be supplied for the real install prompt + Lighthouse installability. Manifest/build/tests pass without them.

## Deferred from: code review of story-4.6 (2026-06-24)

- **Offline-write outbox (covers two 4.6 edges)** — (a) a note/date draft typed mid-edit is lost when going offline unmounts the field; (b) in-flight photo uploads aren't paused offline (error tiles + re-failing retry). The durable fix for both is the offline-write outbox/PowerSync (queue writes offline + reconcile) — already a documented fast-follow. Until then, accept the rare draft loss; uploads straddling offline fail non-destructively.
- **Tile cache busting on rebuild** — `app/sw.ts` CacheFirst on the unversioned `/tiles/boundaries.pmtiles` serves a stale map for up to 30 days after a tile rebuild (and risks pmtiles EtagMismatch). When the tile pipeline rebuilds, version the URL / cache name to bust it. Tie to prod tile/glyph hosting.
- **Offline banner a11y** — the map banner + memory-panel read-only line lack `role="status"`/`aria-live`; `useOffline()` starts false (brief first-paint flash of write controls if cold-loading offline). Address in the Epic 6 6-2 accessibility floor pass.

## Deferred from: code review of story-4.7 (2026-06-24)

- **Places-list grouping semantics** — `features/places/components/places-panel.tsx` lists regions as labels/buttons with pins in a sibling `<ul>`, no `aria` association between a region and its pin group, and regions aren't headings. Items are focusable + activatable (AC2 core met). Fold the finer landmark/group semantics into the Epic 6 6-2 accessibility floor pass.
- **Shared visited-union validation** — `buildPlaces` re-derives marks ∪ pins inline; the map uses `pinsToVisitedMarks`/`visited.ts` which validates `regionCode` against the ISO-3166-2 shape. A malformed/legacy `regionCode` would list under a bogus region while the map rolls it to the country. Share a validation guard in a future regions refactor.

## Deferred from: test-infra (shared anon session, 2026-06-25)

- **Re-enable the quarantined note-persist test** — `e2e/memory.spec.ts` "write a note → it saves and persists across reload" is `test.fixme` (quarantined). It passes in isolation but flakes in a full-suite run: the post-reload coordinate click on the pin (`clickPin`) gets eaten by Next's dev-overlay portal under load. Same root cause that forced `dispatchEvent` on the 4.7 list-pin click. Harden `clickPin` against the dev overlay (or disable the dev indicator in test), then drop the `.fixme`. Reload-persistence is still covered by the stable date-persist test. Fold into 6-5 CI hardening.
- **Dev-overlay vs coordinate clicks (general)** — Next 16's `data-nextjs-dev-overlay` portal intermittently intercepts coordinate clicks in dev e2e (hit on the Places drawer pin and the note test). Consider disabling the dev indicator under test, or standardize on `dispatchEvent`/harness `fire` for clicks that land near it. 6-5.

## Deferred from: code review of story-2.1 (2026-06-25)

- **Secure-email-change double-token (manual verify)** — `app/auth/confirm/route.ts` does a single `verifyOtp({type, token_hash})`. If the Supabase project's "Secure email change" (double-confirm) toggle is ON, the anon→permanent email link needs BOTH token hashes and won't complete. Verify against the live auth settings when Simon configures Supabase; keep single-confirm or revisit the route.
- **Surface the expired-link message** — the confirm route redirects to `/?auth_error=link` on a bad/expired link, but no UI reads it (lands calmly on the map, no message). Wire a reader (toast / auto-open the account sheet with a calm note) when the auth surface expands (2-3 / Settings 6-3).

## Manual verification checklist — Story 2.1 (needs Simon's Supabase config, then a real device)

1. Supabase dashboard: enable the **Email** auth provider; add `http://localhost:3000/auth/confirm` and the deploy URL to the **Redirect URLs** allowlist; set **Site URL**; confirm **anonymous sign-ins** stay enabled; check the **"Secure email change"** toggle (single-confirm expected — see deferred item above).
2. Local prod (`pnpm build && pnpm start`): open the account sheet → enter your email → 寄送登入連結 → receive the email → click the link → confirm you land signed in (the sheet shows 「你的地圖已保存」 + your email) and the map/marks you made anonymously are still there (anon→permanent kept the uid).
3. Reload the page → still signed in (AC2 cookie SSR persistence).
