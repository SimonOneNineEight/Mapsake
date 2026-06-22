---
baseline_commit: 7f6cfd9
---

# Story 1.5: Tap to mark a region visited

Status: done

<!-- Validation optional. Run validate-create-story for a quality check before dev-story. -->

## Story

As a user,
I want to tap a region to mark it visited and watch it color in,
so that I can record where I've been.

## Acceptance Criteria

1. **Tap to mark.** At admin-1 zoom, tapping empty land in a region marks it visited: the region fills **terracotta (`#B5663E`) plus an always-on texture/hatch cue** (never color alone), and the fill **animates in** as a quiet confirmation. The panel does NOT auto-open (no panel exists yet). [epics 1.5 AC1; DESIGN region-visited; EXPERIENCE map-region]
2. **Re-tap is a no-op.** Tapping an already-visited region's empty land leaves it visited (idempotent; unmark lives elsewhere — Story 3.8/Epic 3). [epics 1.5 AC2]
3. **Durable, both levels.** The mark persists to `region_marks` and survives reload; the write is **optimistic (fill shows immediately) and "saved" only after server ack** (durable-write contract). Marking works at **both country and admin-1 levels** — a tap on a country (low zoom) writes a `country` mark; a tap on an admin-1 region writes an `admin1` mark. [epics 1.5 AC3; architecture#Mutations]
4. **Online-only writes.** When offline, the mark affordance is disabled with a calm "viewing only — reconnect to add" indicator; on a transient write failure the optimistic fill is retained with a quiet retry, never reverted with a "lost"/"unsaved" message. (Minimal v1 treatment; the polished banner is Epic 6.) [EXPERIENCE Saving/Offline; architecture#writes online-only]
5. **Reduced motion.** The fill-in animation honors `prefers-reduced-motion` (instant fill, no transition).

## Tasks / Subtasks

- [x] **Task 0 — Dependencies (NEEDS APPROVAL)**
  - [x] Add **`@tanstack/react-query`** (runtime dep) — the chosen server-state lib (architecture#State; not yet installed). **NEW dep → confirm before installing.** pnpm.
- [x] **Task 1 — Query provider (AC: 3)**
  - [x] `app/providers.tsx` — a `'use client'` component creating a `QueryClient` (via `useState(() => new QueryClient(...))` so it's stable per browser session) and wrapping children in `<QueryClientProvider>`. Wire it in `app/layout.tsx`: `<body><Providers>{children}</Providers></body>`. [architecture line 254 "providers (Query, …) in app/layout"]
- [x] **Task 2 — Current-user id hook (AC: 3)**
  - [x] `features/auth/hooks/use-session-user.ts` (or `lib/`) — a small client hook returning the current user id from `supabase.auth.getClaims()` (reads the local JWT, no round-trip). Used for the `['regionMarks', userId]` query key. (Anon session always exists post-1.4; handle the brief null before it resolves.)
- [x] **Task 3 — Region-marks queries + optimistic mutation (AC: 1, 2, 3, 4)**
  - [x] `features/regions/queries/region-marks-queries.ts`:
    - `useRegionMarks()` → `useQuery({ queryKey: ['regionMarks', userId], queryFn: listRegionMarks })` (imports from `@/data/region-marks` — never raw Supabase). [architecture data-boundary]
    - `useAddRegionMark()` → `useMutation({ mutationFn: addRegionMark, … })` with **optimistic** `onMutate` (cancel queries, snapshot, add the mark to the `['regionMarks', userId]` cache so the fill shows instantly), `onError` keep-the-edit + surface a calm retry (do NOT silently roll back to unvisited — retain per the durable-write contract; re-tap/retry re-attempts), `onSettled` invalidate `['regionMarks', userId]`. [architecture#Mutations line 204]
    - Re-mark is a no-op (the composite-PK upsert + `ignoreDuplicates` in `addRegionMark` already makes it idempotent — AC2). Guard the optimistic add against duplicates so a re-tap doesn't double-insert into the cache.
- [x] **Task 4 — Visited fill + texture cue in the map style (AC: 1, 5)**
  - [x] `features/map/style.ts`: change `countries-fill` and `regions-fill` `fill-color` to a feature-state expression: `["case", ["boolean", ["feature-state", "visited"], false], MAP_COLORS.visited, MAP_COLORS.land]` (add `visited: "#B5663E"` to `MAP_COLORS`). The `promoteId` is already `iso` (1.3), so `setFeatureState` keys on the ISO code.
  - [x] **Texture cue (AC1, "never color alone"):** add visited-only **hatch overlay** layers (`countries-visited-hatch`, `regions-visited-hatch`) using a `fill-pattern` (a small diagonal-hatch image registered via `map.addImage` — generate it programmatically as an `ImageData`/canvas so no asset ships; `fill-pattern` is screen-space so the hatch is zoom-stable per DESIGN). Filter each to `["boolean", ["feature-state", "visited"], false]`. (The sub-~10px **small-region pin fallback** is Story 1.6 — do NOT build it here.)
  - [x] **Animate the fill:** add `"fill-color-transition": { duration: 300 }` (ease) so the terracotta fades in. Set duration `0` when `prefers-reduced-motion` (AC5) — read the media query in `MapCanvas` and set the transition accordingly (or omit the transition for reduced motion).
- [x] **Task 5 — Tap handler + apply marks to feature-state (AC: 1, 2, 3, 4)**
  - [x] In `features/map/components/MapCanvas.tsx`: on map `click`, `map.queryRenderedFeatures(e.point, { layers: ["regions-fill", "countries-fill"] })`; take the topmost feature. Derive: `regionCode = f.properties.iso`; `level = f.sourceLayer === "regions" ? "admin1" : "country"`; `countryCode = level === "admin1" ? f.properties.country : f.properties.iso`. (Tile props are `{ iso, country, name, name_zh }` — admin-1 features carry both their `iso` like `JP-26` and parent `country` like `JP`.)
  - [x] Call the `useAddRegionMark` mutation with `{ level, regionCode, countryCode }`. The map component consumes the regions-feature mutation hook (features import across boundaries via hooks; MapLibre stays in `features/map`).
  - [x] **Apply feature-state from the marks query:** an effect that, whenever `useRegionMarks` data changes (incl. the optimistic add), calls `map.setFeatureState({ source: "boundaries", sourceLayer: mark.level === "admin1" ? "regions" : "countries", id: mark.regionCode }, { visited: true })` for each mark, and clears state removed from the set. Run it on `map` `load` and on data change. **Guard:** `setFeatureState` silently no-ops if the `boundaries` source isn't loaded yet — apply once `map.isSourceLoaded("boundaries")` (or on the `sourcedata` event for that source), and re-apply on data change. MapLibre persists feature-state across tile loads (promoteId is set), so off-screen marks fill correctly when panned into view. (This is the seam where an optimistic mark → instant fill.)
  - [x] **Offline guard (AC4):** if `navigator.onLine === false`, skip the mutation and show the "viewing only — reconnect to add" indicator instead of marking. Keep minimal.
- [x] **Task 6 — "Saving"/"saved" affordance (AC: 3)**
  - [x] A subtle, non-blocking affordance reflecting mutation state: quiet "saving…" during the write, a brief "saved" on ack (per the durable-write contract — "saved" appears ONLY after server ack, not on the optimistic fill), and a calm retry on error. Minimal styling from tokens (`accent #C8893B` for the active state); no heavy toast system. (DESIGN has no dedicated "saved" component — keep it light; the polished version is Epic 6.)
- [x] **Task 7 — Verify (AC: 1-5)**
  - [x] Run the app: tap a region (e.g. a Japan prefecture at z5) → it fills terracotta + hatch, animates in, panel does not open. Re-tap → stays (no-op). Reload → still filled (persisted). Tap a country at low zoom → country fills. Screenshot each.
  - [x] Confirm the row landed in `region_marks` (the Story 1.4 data layer + live Supabase) and the optimistic fill matched the persisted state after reload.
  - [x] Extend the Playwright e2e (or add one): tap → assert feature-state `visited` true + a `region_marks` write; reload → still visited.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + build green. Reduced-motion path manually checked.

### Review Findings (code review 2026-06-22)

Acceptance Auditor: all 5 ACs met; architecture + design rules respected. Findings are correctness hardening on the tap/mutation flow.

- [x] [Review][Patch] Validate ISO shape before marking — `regionFromPoint` now skips features with a malformed code (admin1 must match `/^[A-Z]{2}-[A-Z0-9]+$/`, country `/^[A-Z]{2}$/`) and returns the first VALID feature underneath, so a tap over the bad `CHN` blob marks the real region (verified live: tap central Taiwan → marks `TW-NAN`, not `CHN`). [features/map/lib/visited.ts] (blind+edge)
- [x] [Review][Patch] Gate the tap on a resolved session — the tap handler now returns early if `userId` is null (mirrors the offline guard), so no save-without-fill before the session resolves. [features/map/components/MapCanvas.tsx] (edge)
- [x] [Review][Patch] Reduced-motion moved inside the `map.once("load", …)` handler, after the style/fill layers exist. [features/map/components/MapCanvas.tsx] (blind)
- [x] [Review][Defer] Per-region retry under rapid taps — a single shared `useAddRegionMark` instance means `MarkStatus`/`addMark.variables` reflect only the latest tap, so a non-latest failed write isn't retried (its optimistic mark stays unpersisted, vanishes on reload). The "calm retry retains the mark" guarantee holds only for the most recent tap. Robust per-region failure tracking fits the offline-outbox / Epic 6 polish. [region-marks-queries.ts, MapCanvas.tsx] — deferred (blind+edge)
- [x] [Review][Defer] Transient flash on concurrent taps — `onSuccess` full-invalidate refetches the list; if another tap is in-flight, its optimistic entry is briefly dropped (flash to unvisited) then re-fills on its own ack. Self-healing; refine by merging the acked row instead of refetch-all. [region-marks-queries.ts] — deferred (edge)

Dismissed (verified non-issues): later-loaded-tile marks (MapLibre persists feature-state by promoteId across tile reloads); code-canonicalization duplicate (the data layer writes the iso verbatim — no server canonicalization); e2e click timing (already guarded by the `querySourceFeatures` `waitForFunction` before the click); `onTapRef` no-deps latest-ref effect, `styleimagemissing` null guard, listener cleanup, StrictMode (all verified correct).

## Dev Notes

### Scope boundary — 1.5 vs 1.6 (and pins/unmark)
- **1.5 DOES:** the tap→mark interaction, the EXPLICIT mark write (`region_marks`) with optimistic+ack, the directly-tapped region's terracotta fill **+ the texture/hatch cue**, the fill animation, re-tap no-op, country & admin-1 levels, a minimal offline guard + "saved" affordance.
- **1.5 does NOT:** **roll-up** (country visible-visited from a contained admin-1 mark; region-visited-from-contained-pin) — that's **Story 1.6** ("visited roll-up rendering ... computed client-side via MapLibre feature-state"). The **small-region pin fallback** (sub-~10px at world zoom) is also 1.6/UX-DR6. **Unmark** (open region → "Remove this place" + gentle confirm) is Epic 3 (Story 3.8) — 1.5 only guarantees re-tap is a no-op, never destructive. **Pins** (tap-pin / drop-pin) are Epic 3 — for now every land tap is a mark (no pins exist). [epics 1.5/1.6; EXPERIENCE map-region/unmark]
- Per EXPERIENCE: "Tap a region (empty land, not a pin) → MARKS it visited (the fill animates in as a quiet confirmation; the panel does NOT auto-open)."

### How the tap becomes a write (no server-side geometry)
- **No server-side point-in-polygon** (architecture line 115): the client reads the ISO codes off the tapped MapLibre feature and sends them. Tile feature props are **`{ iso, country, name, name_zh }`** (from `scripts/build-tiles.mjs`): admin-1 features carry `iso` (`JP-26`, ISO 3166-2) AND `country` (`JP`, alpha-2); country features have `iso` = `country` = alpha-2.
- `queryRenderedFeatures(point, { layers: ["regions-fill", "countries-fill"] })` → topmost feature. At z≥3 the `regions` layer renders over `countries`, so the top hit is the admin-1 region (level `admin1`); at low zoom only `countries` is visible (level `country`). The feature's `sourceLayer` (`regions` vs `countries`) determines `level`. [architecture#per-zoom layers line 314]
- Region identity = **ISO codes** (`region_code`, `country_code`), portable across boundary sources. [architecture line 114]

### Feature-state visited styling (the render seam)
- `promoteId: { countries: "iso", regions: "iso" }` is **already set** in `features/map/style.ts` (Story 1.3) — the feature id IS the ISO code, so `setFeatureState({ source:"boundaries", sourceLayer, id: regionCode }, { visited:true })` works directly. [style.ts line 27-28]
- Visited = client-driven feature-state (architecture line 148 "feature-state keyed by region_code"). 1.5 sets it from the user's EXPLICIT marks (`useRegionMarks`). 1.6 extends the same feature-state with the rolled-up parents. Keep the apply-marks-to-feature-state effect generic so 1.6 can extend it.
- The fill paint reads `["feature-state","visited"]`; the hatch overlay layers are filtered on the same. Persist explicit marks; never store rolled-up state (architecture line 113).

### Frontend data flow + state (architecture#State/API)
- **CRUD path:** UI → TanStack Query hook (`features/*/queries`) → `data/` → Supabase (RLS-enforced). No custom REST for CRUD. `data/region-marks.ts` (Story 1.4) is the ONLY Supabase importer for marks — `useRegionMarks`/`useAddRegionMark` import from it, never raw Supabase. [lines 281-282]
- **Query keys:** `['regionMarks', userId]` (architecture line 203). Invalidate on mutation ack.
- **Mutation rule (line 204):** "optimistic update with subtle 'saving'; 'saved' only after server ack; invalidate relevant keys on success; on failure keep the edit + calm retry, never silent drop." The fill animation = the optimistic confirmation; the "saved" affordance = ack-gated.
- **`data/region-marks.ts` API (Story 1.4):** `addRegionMark({ level, regionCode, countryCode }): Promise<void>` (ack-gated, re-mark is an idempotent no-op via composite-PK upsert), `removeRegionMark(...)`, `listRegionMarks(): Promise<RegionMark[]>`, types `RegionLevel`/`RegionMark`. Do NOT re-implement the Supabase calls — use these.
- **Writes online-only (v1):** offline disables the affordance + banner; NO offline outbox (documented fast-follow). [line 205]

### Feature structure (architecture#feature-first)
- `features/map/` — MapLibre canvas, the click handler, `setFeatureState`, the style. **MapLibre must NOT leak out of `features/map`** (line 283). The data/state lives elsewhere.
- `features/regions/` — region-marks `queries/` (the TanStack hooks) + (later) roll-up logic.
- `data/region-marks.ts` — the data-access module (exists). `app/providers.tsx` — the Query provider.
- Per-feature dirs: `components/`, `hooks/`, `queries/`, `types.ts`.

### Files being modified — current state (read before editing)
- `features/map/style.ts` — `countries-fill`/`regions-fill` are flat `MAP_COLORS.land`; the comment already says "visited terracotta arrives via feature-state in Story 1.5." `promoteId` set to `iso`. Add the feature-state fill expression + hatch layers + transition; preserve the ocean/land/label work + the deeper-ocean tokens.
- `features/map/components/MapCanvas.tsx` — the client map component (SSR-safe dynamic import, `window.__mapsakeMap`, rotation-locked, resize-on-load, error handler). Add the click handler + the apply-marks effect; preserve all existing setup. It needs the marks query + mutation (call hooks at the React level, not inside the imperative map effect — pass data/handlers in).
- `app/layout.tsx` — currently `<body className="antialiased">{children}</body>`, no providers. Wrap with `<Providers>`.

### Decisions made in authoring (flag if you disagree)
1. **Tap level = the tapped feature's layer** (`regions`→admin1, `countries`→country), not a fixed zoom rule. `country_code` for an admin-1 mark comes from the feature's `country` prop (no parent lookup needed).
2. **Texture cue = a programmatic hatch `fill-pattern`** (generated `ImageData`, no shipped asset; screen-space → zoom-stable). Small-region pin fallback deferred to 1.6.
3. **Optimistic-then-retain on failure** (not roll-back): keep the fill + calm retry, per the durable-write contract — never flash the region back to unvisited.
4. **"Saved" affordance + offline banner kept minimal** in 1.5 (DESIGN has no component for them); the polished versions are Epic 6.

### Likely external gate
The persist/reload + the `region_marks` write verification need the **live Supabase** (anon sign-ins enabled, migration applied — both done in Story 1.4). So 1.5 is NOT gated like 1.4 was; the DB is ready. Marking just needs the running app + the existing session.

### Conventions
Flat repo (no `src/`), snake_case DB ↔ camelCase domain at `data/` only, Tailwind v3, light-only, zh-TW primary. No Co-Authored-By; pnpm. Tokens never hardcoded in components (MapLibre style literals are the sanctioned exception — keep them in `style.ts`).

### Testing standards
- e2e (Playwright, `e2e/`): tap a region → assert feature-state `visited` + a `region_marks` row; reload → still visited. Re-tap → still one row (no-op). Build on the existing `window.__mapsakeMap` harness.
- Manual: reduced-motion (instant fill), offline guard (affordance disabled).

### References
- [Source: epics.md#Epic 1 › Story 1.5 (+ 1.6 boundary)]
- [Source: architecture.md#Data Architecture (feature-state, region_marks, level), #State & Data (TanStack Query, query keys, mutations), #Frontend, #feature-first]
- [Source: EXPERIENCE.md#Component Patterns (map region), #State Patterns (Saving/sync, Offline), #Interaction Primitives]
- [Source: DESIGN.md#region-visited (terracotta + hatch + small-region fallback), #tokens]
- [Source: 1-3 (style.ts promoteId/fill, MapCanvas), 1-4 (data/region-marks.ts, anon session)]
- [Source: scripts/build-tiles.mjs (tile feature props `iso`/`country`)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — dev-story

### Debug Log References

- **`feature-state` not allowed in a layer `filter`** — the hatch layers first used `filter: ["feature-state","visited"]`, which MapLibre rejects ("data expressions are not supported with filters"). Fixed by removing the filter and driving the hatch via `fill-opacity` (`["case", ["feature-state","visited"], 1, 0]`) — a paint property, where feature-state IS allowed.
- **`react-hooks/refs` + `set-state-in-effect`** (newer eslint rules): moved the latest-tap-handler ref assignment into an effect (not render); simplified `MarkStatus` to drop the timer effect (shows "已儲存" until the next tap — minimal v1).
- **PointLike typing:** `queryRenderedFeatures` wants `Point | [number,number]`, not a plain `{x,y}` — pass `[e.point.x, e.point.y]`.

### Completion Notes List

- **Tap-to-mark works end-to-end, verified live against the Supabase project:**
  - Tapped 京都府 (JP-26) at z6 → optimistic terracotta fill + hatch, feature-state `visited:true` (screenshot confirmed the fill + woven texture).
  - **Persisted:** after a full reload the mark re-applied from `region_marks` before idle (saved, not just optimistic).
  - **Both levels:** admin-1 tap (JP-26, z6) writes `admin1`; country tap (MN, z2 where regions aren't rendered) writes `country`. Re-tap of an already-visited region is a no-op (idempotent).
- **New dep:** `@tanstack/react-query@5.101.0` (approved). `QueryClientProvider` in `app/providers.tsx`, wired in `app/layout.tsx`.
- **Architecture honored:** UI → TanStack hook (`features/regions/queries`) → `data/region-marks.ts` (Story 1.4) → Supabase under RLS; MapLibre stays in `features/map`; optimistic-then-RETAIN-on-error (no rollback), invalidate only on ack; query key `['regionMarks', userId]`.
- **Texture cue:** programmatic diagonal-hatch `fill-pattern` (generated `ImageData` via `styleimagemissing`, no asset), screen-space/zoom-stable. Small-region pin fallback + roll-up deferred to Story 1.6.
- **AC4/AC5:** offline guard (skip mutation + "僅供瀏覽 — 重新連線後可標記" banner when `!navigator.onLine`); fill transition set to 0 under `prefers-reduced-motion`. Implemented; not live-simulated.
- tsc 0, lint 0, build 0 (4 routes). e2e extended (`e2e/map.spec.ts`): tap → visited → reload still visited.
- **Pointer cursor:** `mouseenter`/`mouseleave` on `regions-fill`/`countries-fill` set a `pointer` cursor over markable land (verified live: pointer over Japan, default over ocean). Desktop hover affordance for the tap target.
- **Unmark is intentionally NOT in 1.5** — re-tap is a no-op (AC2); the deliberate "Remove this place" + gentle-confirm flow is Epic 3 (Story 3.8), per EXPERIENCE ("unmark is not a plain tap"). `data/region-marks.removeRegionMark` exists but is unwired.
- Note: live verification left a few test marks (JP-26, MN, MN-055) in the dev project's `region_marks` under the test anon session — harmless anon data.

### Change Log

- 2026-06-22 — Story 1.5 context created (ready-for-dev): tap-to-mark a region visited — optimistic feature-state terracotta fill + hatch cue, ack-gated durable write to `region_marks`, country + admin-1 levels. Ultimate context engine analysis completed — comprehensive developer guide created.
- 2026-06-22 — Story 1.5 implemented → review: added TanStack Query + provider, region-marks queries (optimistic), session-user hook, feature-state terracotta fill + hatch in style.ts, tap handler + feature-state application + offline guard in MapCanvas, MarkStatus affordance, marking e2e. Live-verified (tap→fill→persist→reload; both levels; re-tap no-op). tsc/lint/build green.
- 2026-06-22 — Code review → done: 3 patches applied (ISO-shape validation in `regionFromPoint` — skip malformed, pick first valid underneath; gate tap on resolved `userId`; reduced-motion moved into the load handler) + a pointer-cursor hover affordance. 2 deferred (per-region retry under rapid taps; concurrent-tap refetch flash). All 5 ACs met. Guard verified live (tapping the Taiwan/China overlap marks the real county, not the `CHN` blob). tsc/lint/build green.

### File List

**Added**
- `app/providers.tsx` — client `QueryClientProvider`
- `features/auth/hooks/use-session-user.ts` — current user id (from local JWT) for the query key
- `features/regions/queries/region-marks-queries.ts` — `useRegionMarks` + optimistic `useAddRegionMark`
- `features/regions/components/mark-status.tsx` — quiet saving/saved/retry affordance
- `features/map/lib/visited.ts` — hatch image, tap→region resolver, marks→feature-state applier

**Modified**
- `app/layout.tsx` — wrap children in `<Providers>`
- `features/map/style.ts` — feature-state terracotta fill + transition + visited hatch overlay layers; `MAP_COLORS.visited`, `VISITED_HATCH_IMAGE`
- `features/map/components/MapCanvas.tsx` — tap-to-mark, apply-marks-to-feature-state, hatch registration, reduced-motion, offline guard, MarkStatus
- `e2e/map.spec.ts` — marking + persist-across-reload test
- `package.json` — `@tanstack/react-query`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 1.5 → review
