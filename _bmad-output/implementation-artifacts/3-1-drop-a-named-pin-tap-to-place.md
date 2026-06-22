---
baseline_commit: 4510fef
---

# Story 3.1: Drop a named pin (tap-to-place)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to drop a pin where I went and name it,
so that my memory is anchored to the place.

## Acceptance Criteria

1. **Deliberate drop mode.** A visible **"+ add memory / pin"** affordance toggles a drop mode. While drop mode is active, the **next tap on the map lands a pin** at those coordinates (lng/lat from the tap). Drop mode is a clear, opt-in state (the affordance reads as active; an escape/cancel exits without dropping). [epics 3.1 AC1; EXPERIENCE line 57-58 "dropping a pin is always the deliberate + add affordance"]
2. **Name → save → it's a memory.** After the pin lands, the user **names it** (e.g. `京都`) in a minimal name input. On confirm it **saves to `pins`** with `lat`/`lng` and the `region_code`/`country_code` of the admin-1 (or country) feature under the tap, and the pin renders on the map as the terracotta marker, selected. An empty name can't be saved (the name is required by schema); cancel discards the un-landed pin. [epics 3.1 AC2; architecture#Data pins schema]
3. **No accidental pins.** A **plain tap on land (drop mode OFF)** still marks the region visited exactly as in Story 1.5 — it never drops a pin. Dropping requires the affordance. A plain tap that lands on an existing pin does not mark the region (it's a no-op in 3.1; opening a pin's memory is Story 3.4). [epics 3.1 AC3; EXPERIENCE line 57]
4. **Durable + reactive.** The write is **optimistic** (pin shows immediately) and **"saved" only after server ack** (durable-write contract); on failure the optimistic pin is retained with a calm retry, never silently dropped. Pins persist to `pins` under owner-scoped RLS and survive reload. Online-only writes (offline disables the affordance, consistent with Story 1.5). [architecture#Frontend durable-write; #Mutations line 204]
5. **Region fill unchanged.** Dropping a pin does NOT yet make its region read visited — that roll-up is Story 3.9. 3.1 only persists the pin with its `region_code`/`country_code` so 3.9 can later derive it. [epics 3.9; architecture line 113]

## Tasks / Subtasks

- [x] **Task 1 — `pins` table migration + RLS (AC: 2, 4)**
  - [x] New migration `supabase/migrations/<timestamp>_init_pins.sql` creating `public.pins` per the architecture schema (FULL v1 shape, so later stories don't ALTER): `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references public.profiles(id) on delete cascade`, `name text not null`, `lat double precision not null`, `lng double precision not null`, `country_code text`, `region_code text`, `note text`, `memory_date date`, `exif_taken_at timestamptz`, `muted boolean not null default false`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`. Indexes `idx_pins_user_id` and `idx_pins_user_id_region_code`. Mirror the Story 1.4 migration's style exactly. Do NOT create `photos` (Story 3.6).
  - [x] RLS: `alter table public.pins enable row level security;` + owner-scoped policies `pins_owner_select/insert/update/delete` using `(select auth.uid())` (copy the `region_marks_owner_*` pattern verbatim — `using`/`with check` on `user_id = (select auth.uid())`).
  - [x] Apply to the linked Supabase project (`supabase db push`) and **regenerate `types/supabase.ts`** (`supabase gen types typescript --linked > types/supabase.ts`). Without this, `Database["public"]["Tables"]["pins"]` doesn't exist and `data/pins.ts` won't typecheck. **Likely external gate** (mirrors Story 1.4): if the CLI isn't authenticated in this environment, hand the migration to Simon to `db push` + regen, or hand-add the `pins` types to `types/supabase.ts` so code compiles, with the live apply gated on Simon.
- [x] **Task 2 — `data/pins.ts` data-access module (AC: 2, 4)**
  - [x] Mirror `data/region-marks.ts` exactly (the ONLY Supabase importer for `pins`; snake_case↔camelCase here; owner-scoped RLS; no service-role). Types: `Pin` (camelCase: `id, userId, name, lat, lng, countryCode, regionCode, note, memoryDate, exifTakenAt, muted, createdAt, updatedAt`) with a `toDomain(row)` mapper.
  - [x] `listPins(): Promise<Pin[]>` — `select` the columns, RLS-scoped.
  - [x] `addPin(input: { name; lat; lng; regionCode; countryCode }): Promise<Pin>` — read `auth.getUser()` (set `user_id = user.id`; never trust client), insert, and **`.select().single()` so it RETURNS the created row** (unlike `addRegionMark` which returns void — pins need the server `id` for the cache + future `['pin', pinId]`/photos FK). Resolves only on ack; throws on failure.
  - [x] (Optional, defer if unused) `removePin(id)` — not needed in 3.1 (delete is Story 3.8); skip unless trivial.
- [x] **Task 3 — `features/pins` queries + optimistic mutation (AC: 2, 4)**
  - [x] `features/pins/queries/pins-queries.ts`: `usePins()` → `useQuery({ queryKey: ['pins', userId], queryFn: listPins })` (import from `@/data/pins`, never raw Supabase); reuse `useSessionUserId()` (Story 1.5) for the key.
  - [x] `useAddPin()` → `useMutation({ mutationFn: addPin, ... })`, optimistic per the durable-write contract: `onMutate` adds a provisional pin to `['pins', userId]` with a **temp client id** (`crypto.randomUUID()`) so it renders instantly; `onError` keep the edit + calm retry (do NOT roll back); `onSuccess` reconcile the temp pin with the returned server row (replace by temp id, or invalidate `['pins', userId]`); `onSettled` invalidate. Match the `useAddRegionMark` shape (Story 1.5). [architecture line 203-204]
- [x] **Task 4 — Drop-mode state + "+ add" affordance (AC: 1, 3)**
  - [x] Ephemeral **drop-mode** UI state (architecture: "UI state minimal … drop-mode"). Use a small React context/state in `features/pins` (or lift into the map shell) — do NOT add Zustand (new dep needs approval; context suffices here).
  - [x] A "+ add memory / pin" affordance (button) on the map that toggles drop mode; active state reads clearly (tokens from DESIGN — terracotta/accent); an escape (tap the button again / Esc) cancels. Inline zh-TW label for now (i18n framework is Story 6.1) — e.g. `新增回憶`.
  - [x] While drop mode is on, the map cursor/affordance signals "tap to place." Reduced-motion + a11y: the toggle is a real focusable button.
- [x] **Task 5 — Pin source + marker layer in `features/map` (AC: 2, 3, 5)**
  - [x] Add a GeoJSON source `pins` + a marker layer (the terracotta memory-pin: circle or symbol — `#B5663E` fill, cream `#FBF4E4`/surface stroke, `rounded-full`; DESIGN memory-pin token). Keep it SIMPLE — **no clustering and no zoom fade yet (Story 3.3)**; just render the user's pins from `usePins()` data. MapLibre stays inside `features/map` (architecture boundary).
  - [x] Keep a helper in `features/map/lib` (e.g. extend `visited.ts` or a new `pins.ts`) that builds the GeoJSON FeatureCollection from the pins list and updates the source on data change (mirror the `applyVisitedState` effect pattern in `MapCanvas`).
- [x] **Task 6 — Wire the tap path (AC: 1, 2, 3)**
  - [x] In `MapCanvas` `click` handler: **branch on drop mode.** If drop mode is ON → take `e.lngLat` as the pin coords, resolve `region_code`/`country_code` from the feature under the tap (reuse `regionFromPoint` from `features/map/lib/visited.ts` — it already returns `{ regionCode, countryCode, level }`; a country-level tap gives `country_code` = `region_code`), open the name input, and on confirm call `useAddPin`. Exit drop mode after placing. If drop mode is OFF → existing Story 1.5 mark behavior, UNCHANGED.
  - [x] Guard: when drop mode is OFF and the tap lands on an existing pin (the `pins` layer is under the point via `queryRenderedFeatures`), do NOT mark the region (no-op in 3.1; open-memory is Story 3.4). Preserve the Story 1.5 `userId`/offline guards.
- [x] **Task 7 — Minimal name input + "opens its memory" (AC: 2)**
  - [x] A **minimal** name-capture UI (a small shadcn `Dialog` or a lightweight inline input — NOT the full Vaul memory sheet, which is Story 3.4). It captures the name, confirms (save) or cancels (discard the un-landed pin). After save, the pin renders selected. "Opens its memory" in 3.1 is satisfied minimally (named + selected pin); the real memory panel/sheet, note, date, and photos are Stories 3.4–3.6.
- [x] **Task 8 — Tests + verify (AC: 1-5)**
  - [x] e2e (`e2e/`, `window.__mapsakeMap` harness): toggle drop mode → tap → name → assert a row in `pins` + the pin renders (a `pins`-source feature at the coords). Plain tap (drop mode off) → still marks the region (Story 1.5 unbroken), no pin created. Reload → the pin persists.
  - [x] Pure unit (if logic is extractable, e.g. the pins→GeoJSON builder): assert the FeatureCollection shape. Place under `e2e/` (Node-context Playwright) per the Story 1.6 precedent, or co-locate.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + build green. Manual: drop a pin (e.g. 京都 in 京都府), confirm it persists across reload and the region is NOT auto-marked visited (that's 3.9).

### Review Findings (code review 2026-06-22)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: substantially satisfies the spec — AC1, AC2 (minimal-input split), AC3, AC5 + all architecture constraints met (RLS owner-scoped, `user_id` server-set, data-boundary, MapLibre confined to features/map, `['pins',userId]` key, schema matches). 1 decision-needed · 4 defer · 7 dismissed.

**Decision-needed:**
- [x] [Review][Decision] AC4 "calm retry" not surfaced for pin writes — `addPin` is optimistic + retains on failure (no rollback), but unlike region marks (`MarkStatus` + `onRetry`, Story 1.5) there's no saving/saved/error indicator and no retry affordance for a failed pin (`addPin.isError` is never read). **RESOLVED 2026-06-22 (fixed now):** one combined `MarkStatus` now covers both writes — it shows the pin write when in flight/recent, else the region-mark write, and `onRetry` re-mutates whichever is showing (`addPin.variables` or `addMark.variables`). Also fixed a layout collision the affordance introduced (moved `AddPinButton` to bottom-right so it clears the bottom-center save indicator). tsc/lint/e2e green (12 passed). [features/map/components/MapCanvas.tsx]

**Defer:**
- [x] [Review][Defer] Temp+real marker double-render flash — optimistic pin (temp UUID) + refetched server pin briefly coexist in the cache → two circles stack at the same coords until the refetch collapses them. Self-healing; refine in Story 3.3 (merge the acked row via `setQueryData` instead of a full invalidate). Analog of the deferred 1.5 concurrent-tap flash. [pins-queries.ts]
- [x] [Review][Defer] Offline guard asymmetric on the pin save path — the AddPin button is disabled offline, but a save fired mid-flow (going offline after entering drop mode) isn't guarded like the mark tap is; ties to the offline-outbox (Epic 6). [MapCanvas.tsx]
- [x] [Review][Defer] Pins cache-key desync on auth change — `['pins',userId]` data from a prior (anon) session can linger when `userId` changes without a hard reload. Same pattern as region marks; relevant when account-linking lands (Epic 2). [pins-queries.ts]
- [x] [Review][Defer] Test depth — no e2e for the failure/retain/retry path or the tap-on-pin no-op guard (AC3 branch); both covered indirectly. Add alongside the AC4 affordance. [e2e/pins.spec.ts]

Dismissed (7, verified non-issues): **false CRITICAL** "`addMark.mutate(region)` is a nameless pin insert" (Blind, diff-only) — `addMark` is the unchanged Story 1.5 region-mark mutation; the named-pin path is separate (`addPin`), confirmed by both repo-access layers; `.single()` error IS checked before `toDomain`; the no-deps `onTapRef` effect is the intentional latest-ref pattern (click listener attached once); the reload e2e re-fetches from the DB (no query persister) so it's not vacuous; UUID feature-state id is unused in 3.1 (latent); `applyPins` load-order, ocean/null-region pin, Insert↔schema↔types alignment, and `PinNameInput` empty-name/lifecycle all verified clean.

Note (pre-accepted scope): AC2 "renders **selected**" is minimal in 3.1 (no accent glow/scale) — the story Dev Notes + DESIGN line 235 already defer the selected-glow polish to 3.3/3.4; flagged for sign-off.

## Dev Notes

### Scope boundary — what 3.1 IS and is NOT
- **3.1 DOES:** the `pins` table + RLS; `data/pins.ts`; `['pins']` query + optimistic `addPin`; the deliberate **drop-mode** affordance; tap-to-place with `region_code`/`country_code` capture; a **minimal** name input; render pins as a simple terracotta marker layer; keep plain-tap = mark-region (Story 1.5).
- **3.1 does NOT:** clustering / zoom fade-in of pins (**Story 3.3**); the full Vaul memory panel/sheet with snap points + responsive layout (**Story 3.4**); note + optional date (**3.5**); photos + upload (**3.6**); full-screen viewer (**3.7**); edit/remove + gentle confirm (**3.8**); **pins roll up into visited (3.9)** — 3.1 stores the pin's region/country but does NOT light the region; GeoNames **search** (**3.2**). Don't build these.
- **The one real scope decision (flag at end):** AC2 says naming "opens its memory," but the memory panel/sheet is Story 3.4. 3.1 uses a MINIMAL name input (small dialog/inline), not the Vaul sheet. Confirm that's the intended split.

### How a tap becomes a pin (reuse, don't reinvent)
- **No server-side point-in-polygon** (architecture line 115): the client reads `region_code`/`country_code` off the tapped MapLibre feature and sends them with the pin — identical to how Story 1.5 marks work. **Reuse `regionFromPoint(map, point)`** in `features/map/lib/visited.ts`; it returns `{ regionCode, countryCode, level }` (admin-1 → ISO 3166-2 + parent country; country → both = alpha-2). The pin's `lat`/`lng` come from `e.lngLat` (the tap point), NOT the feature centroid.
- **Gesture model (EXPERIENCE line 57):** "a plain tap on land marks the *region*; dropping a pin is always the deliberate + add affordance." So the click handler MUST branch on drop-mode; never infer a pin from a bare tap.

### Files being modified — current state (read before editing)
- `features/map/components/MapCanvas.tsx` — the `click` handler currently calls `onTapRef.current([x,y])` → `regionFromPoint` → `addMark.mutate` (gated on `userId`, offline). ADD the drop-mode branch + the pins source/layer apply effect; PRESERVE the Story 1.5 mark path, the rotation/reduced-motion/cleanup setup, and the `window.__mapsakeMap` harness. Hooks at the React level (don't call hooks in the imperative map effect — pass data/handlers via refs, as the existing `onTapRef` does).
- `features/map/lib/visited.ts` — `regionFromPoint` (reuse for the tapped region), `applyVisitedState`/`computeVisitedKeys` (Story 1.6, leave untouched). A new pins→GeoJSON builder can live here or in a sibling `features/map/lib/pins.ts`.
- `features/map/style.ts` — add the `pins` source + marker layer. Preserve all existing layers (the base/world country split, regions, hatch, labels). promoteId/feature-state untouched.
- `data/region-marks.ts` — the exact pattern to mirror for `data/pins.ts` (auth.getUser → user_id, RLS, snake↔camel, ack-gated). Do NOT modify it.
- `features/regions/queries/region-marks-queries.ts` — the pattern to mirror for `pins-queries.ts` (optimistic onMutate / retain-on-error / invalidate-on-settled). Do NOT modify it.
- `types/supabase.ts` — has `profiles` + `region_marks` only; MUST be regenerated after the migration so `pins` exists (Task 1).

### Data shapes + contracts
- `pins` columns (architecture#Data): `id, user_id, name, lat, lng, country_code, region_code, note, memory_date, exif_taken_at, muted, created_at, updated_at`. 3.1 writes `name, lat, lng, country_code, region_code` (+ server defaults). `note/memory_date/exif_taken_at/muted` are written by later stories; create the columns now, leave them null/default.
- Query keys (architecture line 203): `['pins', userId]`, later `['pin', pinId]`. Mutation rule (line 204): optimistic + "saved" only on ack + invalidate on success + retain-on-failure.
- `addPin` RETURNS the created `Pin` (server `id`) — differs from `addRegionMark` (void). The optimistic temp id (`crypto.randomUUID()`) is replaced by the server row on ack.
- Casing boundary (architecture line 188, 281): snake_case lives ONLY in `data/pins.ts` + the generated types; everything above is camelCase.

### Architecture compliance (guardrails)
- **Data boundary:** `data/pins.ts` is the ONLY module importing the Supabase client for `pins`. `features/pins` + `features/map` import the query hooks, never raw Supabase. [line 281]
- **API boundary:** UI → TanStack hook (`features/pins/queries`) → `data/pins.ts` → Supabase under RLS. No custom REST. [line 282]
- **Feature-first:** `features/pins/` = drop/name/open logic (`components/`, `queries/`, ephemeral drop-mode state); `features/map/` = the pin + (later) cluster LAYER. **MapLibre must not leak out of `features/map`.** [lines 260-262, 283]
- **Writes online-only (v1):** offline disables the affordance (mirror Story 1.5's guard + banner). No offline outbox. [line 205]
- **RLS is the privacy boundary:** every `pins` row owner-scoped; `user_id = auth.uid()` enforced server-side. Never set `user_id` from client input. [line 280]

### Libraries (no new runtime deps expected)
- TanStack Query (installed, Story 1.5), MapLibre 5.x (installed), Supabase client (installed). shadcn `Dialog` for the name input if not already present — it's copy-in (architecture line 213), not an npm dep; `pnpm dlx shadcn add dialog` if the component file is missing. **Vaul (the Drawer/sheet) is Story 3.4 — do NOT add it here.** `crypto.randomUUID()` is built-in (browser + Node). If anything genuinely new is required, HALT for approval.

### Likely external gate (mirrors Story 1.4)
Applying the migration to the live Supabase + regenerating `types/supabase.ts` needs the linked Supabase CLI authenticated (`supabase db push`, `supabase gen types typescript --linked`). The project IS linked (`supabase/.temp/linked-project.json`). If the agent environment can't authenticate the CLI, write the migration + hand-add the `pins` entry to `types/supabase.ts` (so `tsc` passes) and hand the `db push` to Simon before live/runtime verification. Anonymous-session writes already work (Story 1.4), so once the table + types land, pin writes work the same way.

### Conventions
Flat repo (no `src/` — the architecture tree shows `src/features` but THIS repo is flat: `features/`, `data/`, `app/`). snake_case DB ↔ camelCase domain at `data/` only. Tailwind v3, light-only, zh-TW primary (inline strings until i18n in 6.1). Tokens never hardcoded in components except MapLibre style literals in `style.ts`. No Co-Authored-By; pnpm.

### Testing standards
- e2e (Playwright, `e2e/`): drop-mode toggle → tap → name → `pins` row + rendered marker; plain tap still marks region (1.5 regression guard); reload persists. Build on the `window.__mapsakeMap` harness + the `--enable-unsafe-swiftshader` config (Story 1.6). Wait for the durable ack before asserting persistence/reload (per the Story 1.6 reload-race lesson — don't reload on the optimistic state alone).
- Pure unit (Node-context Playwright, per Story 1.6): the pins→GeoJSON builder if extracted.
- Manual: drop 京都 in 京都府, reload → persists; confirm the region is NOT auto-visited (3.9 owns that).

### References
- [Source: epics.md#Epic 3 › Story 3.1 (+ cross-story: 3.2 search, 3.3 clustering, 3.4 panel/sheet, 3.9 roll-up)]
- [Source: architecture.md#Data Architecture (pins schema lines 129-134; derived roll-up line 113; no server PiP line 115), #Map subsystem (pins = GeoJSON + clustering, line 148), #Frontend (TanStack keys line 203, durable-write line 204, online-only line 205), #feature-first (lines 260-262, 281-282), #naming (line 186-188)]
- [Source: EXPERIENCE.md line 57-58 (drop-pin = deliberate "+ add" affordance; plain tap marks region; name it → memory; v1 tap-placed + named, GeoNames deferred)]
- [Source: DESIGN.md#memory-pin (terracotta teardrop `#B5663E` + cream `surface` outline, `rounded-full`; selected = `accent #C8893B` glow + ~1.15× — selected/glow polish can be minimal in 3.1)]
- [Source: 1-4 migration (supabase/migrations/20260621120000_init_profiles_region_marks.sql — table + RLS + trigger pattern), data/region-marks.ts (data-layer pattern), 1-5 region-marks-queries.ts (optimistic mutation pattern) + MapCanvas tap handler + visited.ts regionFromPoint]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — create-story + dev-story

### Debug Log References

- **`geojson` module not resolvable** — `import type { FeatureCollection } from "geojson"` and the `GeoJSON.*` global both failed in app source (`@types/geojson` is only visible inside maplibre's own .d.ts here). Fixed by declaring a minimal local `PinFeatureCollection` type in `features/map/lib/pins.ts` (structurally assignable to what `GeoJSONSource.setData` accepts). tsc clean.
- **Migration gate (HALT)** — the `pins` table doesn't exist in the linked Supabase project, and `supabase db push` is a PRODUCTION write that's Simon's to run (the auto-mode classifier also gates production DB access). Mirrors Story 1.4. So the table apply + the persist/reload e2e + manual persistence check are blocked; everything else is built and verified.

### Completion Notes List

**Implemented (code complete, statically verified):**
- **Migration** `supabase/migrations/20260622120000_init_pins.sql` — full v1 `pins` schema + owner-scoped RLS (`pins_owner_*`) + indexes, mirroring the 1.4 migration. `photos` deferred to 3.6.
- **`data/pins.ts`** — mirrors `region-marks.ts`; `listPins()` + `addPin()` (sets `user_id` from `auth.getUser`, `.select().single()` so it RETURNS the created row for the cache/id).
- **`features/pins/queries/pins-queries.ts`** — `usePins()` (`['pins', userId]`) + `useAddPin()` (optimistic temp-id append, retain-on-error, invalidate on ack).
- **Drop mode + UI** — `AddPinButton` (deliberate "+ 新增回憶" toggle) + `PinNameInput` (minimal `Input`+`Button` name capture, NOT the Vaul sheet — that's 3.4). Drop-mode state in `MapCanvas` (React state, no new dep).
- **Map** — `pins` GeoJSON source + `pins-marker` circle layer (terracotta `#B5663E` + cream stroke; clustering/teardrop are 3.3) in `style.ts`; `features/map/lib/pins.ts` builder + `applyPins` source updater; `MapCanvas` pins-apply effect.
- **Tap path** — `MapCanvas` click handler branches on drop mode: ON → place pin at `e.lngLat` + capture region/country via `regionFromPoint`, open name input, exit drop mode; OFF → Story 1.5 mark behavior UNCHANGED, plus a guard so a tap on an existing pin is a no-op (open-pin is 3.4). Roll-up to visited NOT done (3.9).
- **Types** — hand-added the `pins` table to `types/supabase.ts` so `tsc` passes; Simon regenerates from the live DB after `db push`.

**Verified:** `tsc --noEmit` 0, `pnpm lint` 0, `pnpm build` 0. Pure tests (`e2e/pins.spec.ts` `pinsToGeoJSON`) — 8 passed incl. the 1.6 roll-up suite, 1 skipped (the gated drop-pin e2e). Browser smoke (Playwright MCP): drop mode activates (`aria-pressed`), a place-tap opens the name dialog with its input — AC1 gesture + AC2 naming UI confirmed client-side. The 4 console errors during the smoke are the `pins` query failing (table missing) — the gate.

**Gate RESOLVED (2026-06-22):**
1. ✅ `supabase db push` applied `20260622120000_init_pins.sql` to the linked project `gnlatvacoqlwwabexbfm` (the `pins` table is live).
2. ✅ `types/supabase.ts` regenerated from the live DB (`supabase gen types typescript --linked`) — matches the hand-added types; tsc 0.
3. ✅ `.skip` removed; **full `pnpm test:e2e` = 12 passed**, including `dropping a named pin places it and persists across reload` (live drop → name → DB write → reload). No regression in the mark/roll-up suites.

### File List

**Added**
- `supabase/migrations/20260622120000_init_pins.sql` — `pins` table + RLS + indexes
- `data/pins.ts` — pins data-access (listPins, addPin)
- `features/pins/queries/pins-queries.ts` — `usePins` + optimistic `useAddPin`
- `features/pins/components/add-pin-button.tsx` — drop-mode "+ 新增回憶" affordance
- `features/pins/components/pin-name-input.tsx` — minimal name capture
- `features/map/lib/pins.ts` — `pinsToGeoJSON` builder + `applyPins` source updater
- `e2e/pins.spec.ts` — pure `pinsToGeoJSON` tests + the gated (skipped) drop-pin e2e

**Modified**
- `types/supabase.ts` — regenerated from the live DB (includes the `pins` table)
- `features/map/style.ts` — `pins` GeoJSON source + `pins-marker` circle layer
- `features/map/components/MapCanvas.tsx` — drop-mode state, tap-path branch, pins-apply effect, AddPinButton + PinNameInput
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3.1 → in-progress

### Change Log

- 2026-06-22 — Story 3.1 context created (ready-for-dev): drop a named pin (tap-to-place) — deliberate "+ add" drop mode, name → save to `pins`, terracotta marker; clustering/sheet/roll-up deferred to later Epic 3 stories.
- 2026-06-22 — Implemented (code complete, gated on migration): `pins` migration + RLS, `data/pins.ts`, optimistic `useAddPin`/`usePins`, drop-mode affordance + minimal name input, pin marker layer, tap-path branch (drop = place pin; plain = mark region, 1.5 unchanged). tsc/lint/build green; pure tests pass; MCP smoke confirms the drop gesture + name dialog. **HALT:** the live `supabase db push` + persist e2e are gated on Simon (production DB write).
- 2026-06-22 — Gate resolved → review: migration applied to the live project, `types/supabase.ts` regenerated, drop-pin e2e un-skipped. **`pnpm test:e2e` = 12 passed** (incl. live drop → name → persist → reload). All tasks complete.
- 2026-06-22 — Code review → done: 3 adversarial layers, verdict "substantially satisfies the spec" (AC1/AC3/AC5 + all architecture constraints; the migration RLS clean). 1 decision resolved (AC4 calm-retry now surfaced for pins via one combined `MarkStatus`+`onRetry`; fixed a bottom-center layout collision by moving `AddPinButton` to bottom-right), 4 deferred (marker double-render flash → 3.3; offline-save asymmetry + outbox → Epic 6; pins cache-key desync on auth change → Epic 2; failure/no-op e2e depth), 7 dismissed incl. a false-CRITICAL (`addMark` is the unchanged 1.5 mutation, not a nameless pin insert). tsc/lint/e2e green (12 passed).
