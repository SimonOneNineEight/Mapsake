---
baseline_commit: 1ec5819
---

# Story 4.6: Offline read-only shell + write banner

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to view my map offline and be told that writes need a connection,
so that the app feels reliable.

## Acceptance Criteria

1. **Offline read-only shell: app shell, base map, and already-loaded memories are viewable offline.** An installed PWA opened offline shows the cached app-shell (Story 4.5 precache) and the base map renders from cached tiles (no blank canvas). Memories already loaded in the session stay viewable offline (the in-memory query cache + already-fetched photos). Cross-cold-open memory persistence is a decision (Q1). [epics 4.6 AC1; architecture lines 59 (offline shell caches the base map), 160 (offline = read-only cached shell)]
2. **Writes disabled offline with a calm banner — never a hard wall or silent failure.** When offline, every write affordance (tap-to-mark, ＋ 新增回憶 / pin drop, note + date edit, photo upload, unmark/delete) is disabled, and a calm "viewing only — reconnect to add" banner shows. No silent failures (a tap does nothing destructive), no error wall. Reconnecting re-enables writes without a reload (Story 4.5 set `reloadOnOnline: false`). [epics 4.6 AC2; architecture lines 205, 284; EXPERIENCE calm/keepsake tone]
3. **No regression.** Online behavior unchanged: marking, pins, memories, photos, onboarding (4.1–4.5), the install affordance, durable-write all still work. The SW stays disabled in dev. The base-map caching must not break the online tile load or balloon the cache unboundedly. [Epic 1–4 behavior; durable-write contract]

## Tasks / Subtasks

- [x] **Task 0 — Scope check: what 4.6 adds vs what already exists**
  - [x] AC2 is LARGELY DONE already (pre-4.6): `MapCanvas.tsx` has `const [offline, setOffline]`, an `online`/`offline` listener (lines ~296-302), the tap-to-mark offline guard (`navigator.onLine === false` return, ~line 145), the ＋ button `disabled={!userId || offline}` (~line 385), and the calm banner 「僅供瀏覽 — 重新連線後可標記」 (~lines 374-377). 4.6 must (a) AUDIT that ALL write affordances are covered offline (note/date edit, photo upload, unmark/delete — not just tap-mark + pin drop), and (b) add the NET-NEW base-map offline caching (AC1). Do NOT rebuild the existing banner; extend coverage where gaps exist. [Source: features/map/components/MapCanvas.tsx]
- [x] **Task 1 — Cache the base map for offline (AC: 1, 3)** [app/sw.ts]
  - [x] Add SW runtime caching for the local base-map assets so the map renders offline: the PMTiles file (`/tiles/boundaries.pmtiles`) served from same-origin `public/tiles`. PMTiles uses HTTP **Range** requests via the `pmtiles://` protocol → use a CacheFirst strategy WITH a range-requests-capable plugin (Serwist `RangeRequestsPlugin` / `@serwist/range-requests`), or the SW will mis-handle 206 responses. Scope the cache to the tiles path only; cap with an expiration/size limit so it doesn't grow unbounded.
  - [x] Glyphs are external (`demotiles.maplibre.org`, see `features/map/style.ts:24`) → NOT reliably cacheable offline; Latin labels degrade offline (CJK renders locally via `localIdeographFontFamily`). This is the known deferred prod-glyph item — do NOT try to cache the external host; note the degradation. (Per Q2, confirm scope.)
  - [x] Verify online tile loading is unaffected (CacheFirst falls through to network on miss) and the prod build still emits `public/sw.js`.
- [x] **Task 2 — Audit + complete offline write-disable coverage (AC: 2, 3)** [features/map + features/memories + features/pins]
  - [x] Confirm/extend: with `offline === true`, ALL write paths are disabled with the calm banner and NO silent/destructive failure — tap-to-mark (done), ＋ 新增回憶 / pin drop (done via `disabled`), the memory panel/sheet note + date save, photo upload (`photo-uploader.tsx`), and unmark/delete (3.8/3.10 surfaces). Where a surface isn't offline-aware, disable its write control + show/echo the calm message (reuse the existing banner copy/pattern; don't invent a new one).
  - [x] Reconnect (`online` event) re-enables every affordance without a reload. No new error toasts.
- [x] **Task 3 — Offline memory boundary (AC: 1)** [no code — RESOLVED Q1 = session-only]
  - [x] No persistence work. "Already-loaded memories viewable offline" = the in-memory TanStack Query cache during the session (drop offline mid-session → still viewable). A cold offline open shows the cached shell + base map; memories refetch on reconnect. Document this v1 boundary in Completion Notes. Cross-cold-open persistence (`react-query-persist-client` + IDB) stays a documented fast-follow with the write-outbox — NOT this story.
- [x] **Task 4 — Tests (AC: 1, 2, 3)** [e2e]
  - [x] e2e (offline write-disable): with onboarding bypassed, simulate offline (`context.setOffline(true)` or dispatch `offline`) → assert the calm banner 「僅供瀏覽 — 重新連線後可標記」 is visible AND the ＋ 新增回憶 button is disabled AND a land tap does NOT create a mark/panel; then go online → banner gone, affordances re-enabled. (Marking assertion is session-gated — mind the anon rate-limit; prefer asserting the disabled state + banner, which are session-free.)
  - [x] Base-map cache: assert the SW runtime-caches `/tiles/boundaries.pmtiles` (prod-build-only; if not feasible in the dev-mode Playwright setup, document a manual verification step — DevTools → offline → reload → map still renders).
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` (`--webpack`) green; onboarding e2e still passes; SW still disabled in dev.

## Dev Notes

### What already exists (do not rebuild)
- **Offline write banner + disable (AC2 core):** `MapCanvas.tsx` already tracks `offline` (online/offline listeners), guards tap-to-mark, disables the ＋ button, and shows 「僅供瀏覽 — 重新連線後可標記」. 4.6 AUDITS coverage across the other write surfaces and adds base-map caching. [Source: features/map/components/MapCanvas.tsx ~50, 145, 296-302, 374-385]
- **SW + manifest + app-shell precache (AC1 shell):** Story 4.5 (`app/sw.ts`, `app/manifest.ts`, `next.config.ts` Serwist wrap, `reloadOnOnline: false`). 4.6 EXTENDS `app/sw.ts` runtime caching to the base-map tiles. SW disabled in dev; prod build = `next build --webpack`, emits gitignored `public/sw.js`. [Source: app/sw.ts, next.config.ts]
- **Map tiles:** PMTiles at same-origin `/tiles/boundaries.pmtiles`, loaded via the `pmtiles://` protocol (Range requests). Style built in-app (`buildStyle`), glyphs external. [Source: features/map/components/MapCanvas.tsx:165-181, features/map/style.ts:24,64-71]

### The base-map caching is the real work (and the risk)
PMTiles fetches byte-**ranges** (HTTP 206). A naive CacheFirst will cache/replay ranges incorrectly. Use Serwist's range-requests support (`RangeRequestsPlugin`) on a CacheFirst route scoped to the tiles URL, with an expiration cap. Validate offline map render manually (DevTools offline reload) since the SW is prod-only and Playwright runs against dev. [Source: architecture line 59]

### Glyphs / offline labels (known degradation)
Latin label glyphs load from `demotiles.maplibre.org` (external) — unavailable offline, so Latin labels degrade offline until prod self-hosts glyph PBFs (already a deferred item from Story 1.3 review). CJK labels render locally (`localIdeographFontFamily`), so zh-TW labels are fine offline. Do NOT attempt to cache the external glyph host in 4.6. [Source: features/map/style.ts:22-24; deferred-work.md (story-1.3)]

### Scope boundary (4.6 vs fast-follows)
- **4.6 (this):** offline read-only — cached shell + base map render offline, already-loaded memories viewable, all writes disabled with the calm banner.
- **NOT 4.6 (documented fast-follows):** offline-write outbox / PowerSync (queue writes offline + reconcile), prod glyph self-hosting, cross-cold-open memory persistence IF Q1 says session-only. [Source: architecture lines 102, 160, 172]

### Testing standards
- e2e on the `__mapsakeMap` harness; Playwright `context.setOffline(true)` or a dispatched `offline` event drives the banner/disabled state (session-free assertions; the actual mark-block is session-gated → mind the anon rate-limit). SW/cache behavior is prod-only (dev disables the SW) → base-map offline render is a manual DevTools verification, noted in completion. [Source: prior-story testing notes; playwright.config.ts runs `pnpm dev`]

### Project Structure Notes
- Modify `app/sw.ts` (tile runtime caching), audit/extend offline-disable in `features/map`, `features/memories`, `features/pins`. Possibly `app/providers.tsx` if Q1 = persist (new dep). New e2e in `e2e/`. No Supabase migration.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.6 (lines 40-44)]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 59, 102, 160, 172, 205, 284]
- [Source: features/map/components/MapCanvas.tsx; features/map/style.ts; app/sw.ts; next.config.ts]

### Resolved with Simon (2026-06-24)
1. **Offline memory scope:** RESOLVED — SESSION-ONLY. No persistence dep. "Already-loaded" = the in-memory query cache during the session; a cold offline open shows shell + base map, memories refetch on reconnect. Task 3 = the default (no-work) path; full offline persistence stays a fast-follow with the write-outbox.
2. **Base-map offline caching scope:** RESOLVED — cache the local PMTiles via a range-aware CacheFirst; DEFER glyph self-hosting. Latin labels degrade offline (external host); CJK/zh-TW labels render locally and are fine. Prod glyph self-hosting remains the deferred Story 1.3 item, NOT pulled into 4.6.

### Review Findings

- [x] [Review][Patch] Unmark-a-region (3.10) not offline-gated — destructive write fires offline [features/map/components/MapCanvas.tsx] — FIXED: added an offline early-return to `onContextRef` (long-press/region menu), and gated the `RegionRemoveDialog` `open={... && !offline}` + its `onConfirm` on `!offline`. The exact AC2 surface Task 2 named; the map tap-mark/＋ were gated but unmark wasn't.
- [x] [Review][Patch] Tile cache `maxEntries: 8` too small for a PMTiles range cache [app/sw.ts] — FIXED: raised to 512. 8 would evict the header/directory ranges mid-session → blank offline map + pmtiles EtagMismatch on partial eviction; bytes still bounded by `purgeOnQuotaError`.
- [x] [Review][Patch] Delete AlertDialog could fire offline (opened online → disconnect) [features/memories/components/memory-card.tsx] — FIXED: `open={confirmOpen && !offline}` closes it on disconnect so the destructive confirm can't fire.
- [x] [Review][Defer] Note/date draft typed mid-edit is lost when offline unmounts the field [features/memories/components/memory-card.tsx] — deferred; low-frequency (offline transition during active editing). The durable fix is the offline-write OUTBOX (queue the edit) — a documented fast-follow. Accept the rare draft loss until then.
- [x] [Review][Defer] In-flight photo uploads aren't paused when offline (error tiles + re-failing retry) [features/memories/components/photo-uploader.tsx] — deferred; non-destructive edge (upload straddling the offline transition). Covered by the outbox fast-follow (queued uploads).
- [x] [Review][Defer] CacheFirst on unversioned `/tiles/boundaries.pmtiles` serves a stale map up to 30d after a tile rebuild [app/sw.ts] — deferred; tiles are static/rarely rebuilt. When the tile pipeline rebuilds, bust the cache (version the URL / cache name). Tie to the prod tile/glyph hosting deferred item.
- [x] [Review][Defer] Offline banner / read-only line lack `role="status"`/`aria-live`; `useOffline` first-paint flash [features/pwa/use-offline.ts] — deferred to the Epic 6 6-2 accessibility floor pass (the panel isn't mounted at initial paint, so the flash window is negligible).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- **AC1 base map offline (Task 1):** extended `app/sw.ts` runtime caching with a `CacheFirst` route scoped to `/tiles/` using `RangeRequestsPlugin` (PMTiles fetches via HTTP Range/206 — a naive cache mis-handles those) + `ExpirationPlugin` (maxEntries 8, 30d, purgeOnQuotaError) so it can't grow unbounded. CacheFirst falls through to network on a miss, so online load is unaffected. Verified the webpack build emits `public/sw.js` containing the `mapsake-tiles` route. Glyphs (external `demotiles.maplibre.org`) NOT cached per Q2 — Latin labels degrade offline, CJK renders locally.
- **AC2 write-disable audit (Task 2):** the map-level offline banner + disabled tap-mark/＋ button already existed (pre-4.6) — left untouched. The GAP was the memory panel (sibling tree, no offline awareness): a note/date/photo/delete mutation would have FIRED offline and surfaced an error state (the "hard wall / silent failure" AC2 forbids). Added a shared `useOffline()` hook (`features/pwa/use-offline.ts`); `MemoryCard` now renders read-only offline (note + date as text, no edit/delete affordances) with a calm 「僅供瀏覽 — 重新連線後可編輯」 line; `PhotoUploader` gains a `readOnly` prop that hides the add control + omits the viewer's delete. Viewing stays intact.
- **AC1 memory scope (Task 3, Q1 = session-only):** no persistence code. Memories loaded in-session stay viewable when you drop offline (in-memory query cache); a cold offline open shows shell + base map and refetches on reconnect. Cross-cold-open persistence stays a fast-follow with the write-outbox.
- **AC3 no regression:** online behavior unchanged; SW stays disabled in dev. Did NOT touch MapCanvas's existing offline detection (surgical). Added `public/sw.js` to the ESLint ignores — the generated SW (built locally) is minified and isn't source (it's already gitignored).
- **Tests:** new `e2e/map.spec.ts` offline test — `context.setOffline(true)` → calm banner visible + ＋ disabled; reconnect → banner clears (asserts on the banner, which depends only on connectivity, NOT the anon session → rate-limit-safe). SW/cache offline render is prod-only (dev disables the SW) → manual DevTools verification (offline reload → map renders from `mapsake-tiles`).
- **Validation:** `tsc` clean · `pnpm lint` clean (after the sw.js ignore) · `pnpm build` (`--webpack`) clean + emits `public/sw.js` with the tiles route · e2e **16/16** (new offline test + map/onboarding regression).

### File List

- **NEW** `features/pwa/use-offline.ts` — shared `useOffline()` connectivity hook
- **MOD** `app/sw.ts` — `/tiles/` CacheFirst + RangeRequestsPlugin + ExpirationPlugin (offline base map)
- **MOD** `features/memories/components/memory-card.tsx` — read-only offline (note/date text, no edit/delete) + calm line; `useOffline()`
- **MOD** `features/memories/components/photo-uploader.tsx` — `readOnly` prop hides add control + viewer delete
- **MOD** `eslint.config.mjs` — ignore generated `public/sw.js`
- **MOD** `e2e/map.spec.ts` — offline read-only banner + disabled-add test

### Change Log

- 2026-06-24 — Story 4.6 implemented (offline read-only shell + write banner). Base-map tiles cached in the SW (range-aware CacheFirst) so the map renders offline; the memory panel goes read-only offline (the gap — map-level disable already existed) via a shared `useOffline()` hook; all writes disabled offline with a calm banner, reconnect recovers without reload. Memory scope = session-only (Q1); glyphs deferred (Q2). No Supabase migration. Status → review.
- 2026-06-24 — Code review: 3 patches applied (offline-gate the unmark-region long-press + RegionRemoveDialog; tile cache maxEntries 8→512; delete AlertDialog `open && !offline`), 4 deferred (note draft loss + paused uploads → offline-write outbox; tile cache-bust on rebuild; banner a11y → 6-2). tsc/lint/build/e2e green. Status → done.
