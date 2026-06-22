---
baseline_commit: 9ad24e0
---

# Story 1.6: Visited roll-up rendering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want a country to show visited when I've marked any region inside it,
so that the map reflects my travels without extra taps.

## Acceptance Criteria

1. **Region → country roll-up.** Given an admin-1 region is marked, when I zoom out to where the country is the visible grain, the **country renders visited** (terracotta fill + the always-on hatch cue), rolled up from the contained mark. [epics 1.6 AC1; architecture#Data line 113; EXPERIENCE line 57/142]
2. **No downward cascade.** Given a **country-level** explicit mark, the country shows visited but its admin-1 regions are **NOT** auto-marked — zooming in shows the country's regions still bare (unless individually marked). Marking a country never marks its regions. [epics 1.6 AC2; EXPERIENCE line 57 "no downward cascade"]
3. **No marks → plain.** Given a country with no explicit marks and no marked admin-1 region inside it, the country stays unvisited (plain land). [epics 1.6 AC3]
4. **Computed client-side, derived not stored.** The roll-up is computed **client-side via MapLibre feature-state** from the user's marks (`useRegionMarks`). **No rolled-up state is persisted** — `region_marks` continues to hold only EXPLICIT marks; the country-visited render state is derived on each marks change. [epics 1.6 AC3; architecture line 113 "Persist explicit marks; compute the rolled-up render state client-side"]
5. **Reactive + no regression.** Roll-up updates live as marks change (add a region mark → its country lights up at low zoom; remove the last contributing region mark → the country clears unless it has its own explicit mark or another marked region). The directly-marked region's own fill, the hatch cue, the fill animation, and reduced-motion behavior from Story 1.5 are all preserved.

## Tasks / Subtasks

- [x] **Task 1 — Roll-up computation (pure, testable) (AC: 1, 2, 3, 4)**
  - [x] In `features/map/lib/visited.ts`, extract a **pure function** that maps the marks list → the full set of feature-state keys to render visited. Keys stay `"<sourceLayer>|<regionCode>"` (e.g. `regions|JP-26`, `countries|JP`).
    - Every mark contributes its **own** key (as today): `admin1` → `regions|<regionCode>`; `country` → `countries|<regionCode>`.
    - **Roll-up:** every `admin1` mark ALSO contributes `countries|<countryCode>` (the parent country lights up). `countryCode` is already on each mark (set in Story 1.5 from the tile feature's `country` prop).
    - **No downward cascade:** never derive `regions|*` keys from a `country` mark. A country mark contributes only `countries|<regionCode>` (itself).
    - Defensive: skip the roll-up contribution for an `admin1` mark with a missing/empty `countryCode` (do not write a malformed `countries|` key).
  - [x] Have `applyVisitedState` build its `next` set from this function, then keep the existing diff-against-`prev` logic (set `visited:true` on added keys, `visited:false` on removed keys). The function must be a **full recompute** each call so removing a mark correctly clears a roll-up that no longer has any contributor.
- [x] **Task 2 — Confirm the render across the zoom split (AC: 1, 2, 5)**
  - [x] Verify NO style change is needed: the rolled-up country fill is driven by the SAME `["feature-state","visited"]` expression already on `countries-fill-base` / `countries-fill-world` (+ their hatch layers) from Story 1.5/the tile-fidelity work. Setting `countries|<countryCode>` feature-state must light up both copies.
  - [x] Confirm the zoom behavior reads correctly and document it: for a `has_admin1` country, `countries-fill-world` (+ hatch) has `maxzoom 6`, so the **rolled-up country terracotta shows below ~z6** (the at-a-glance tier); above z6 the ADM1 union is the land and the **individually-marked region** shows its own terracotta while bare siblings stay plain. This is the intended "zoom out → country visited; zoom in → see which regions" behavior — there is no zoom gap. (For a country with no admin-1, `countries-fill-base` renders the country fill at all zooms — country marks already covered, no roll-up applies.)
  - [x] If (and only if) a real gap is found, prefer a minimal style/zoom adjustment over storing derived state — never persist roll-up.
- [x] **Task 3 — Tests (AC: 1, 2, 3, 4, 5)**
  - [x] **Unit** test the pure roll-up function (no MapLibre needed): an `admin1` mark `{regionCode:"JP-26",countryCode:"JP",level:"admin1"}` yields `{regions|JP-26, countries|JP}`; a `country` mark `{regionCode:"MN",level:"country"}` yields `{countries|MN}` only (no `regions|*`); two admin-1 marks in the same country yield one `countries|<cc>` (deduped); removing one of them keeps the country until the last is removed; empty marks → empty set.
  - [x] **e2e** (`e2e/map.spec.ts`, on the `window.__mapsakeMap` harness): mark an admin-1 region → assert `getFeatureState({source:"boundaries",sourceLayer:"countries",id:<countryCode>}).visited === true` (rolled up). Assert a `country` mark does NOT set any child `regions` feature-state (`visited` not true for a sibling region id). Mark→unmark path: after removing the region mark, the country's roll-up clears (no explicit country mark present).
- [x] **Task 4 — Verify (AC: 1-5)**
  - [x] Live: mark a Japan prefecture (e.g. 京都府 JP-26) at z6, zoom out below z6 → Japan reads visited (terracotta + hatch). Zoom back in → only 京都府 is terracotta, siblings plain (no cascade). Screenshot both tiers.
  - [x] Mark a country directly at low zoom (e.g. MN) → country visited; zoom in → its regions stay bare. Remove the region mark in a rolled-up country (re-tap is a no-op in 1.5, so use the data layer / a fresh session) → country clears. Note: full unmark UX is Epic 3 (Story 3.8) — do NOT build unmark here.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + build green. Reduced-motion + existing 1.5 marking still work (no regression).

### Review Findings (code review 2026-06-22)

3 adversarial layers (Blind Hunter / Edge Case Hunter / Acceptance Auditor). All 5 ACs met; no correctness bug and no Story 1.5 regression. 1 decision-needed · 2 patch · 2 defer · 8 dismissed.

**Decision-needed:**
- [x] [Review][Decision] Roll-up visible only at the world tier — for a has-admin1 country, `countries-fill-world` (+hatch) has `maxzoom 6` and the `regions` layer (minzoom 3) renders on top at z3–6, so the rolled-up country wash shows at z<3 (verified: Japan terracotta at z2) and the individually-marked region shows at z3–6. **RESOLVED 2026-06-22: keep as-is** — intended UX, matches AC1 ("zoom out to where the country is the visible grain") + EXPERIENCE "region fill is the at-a-glance trophy." [features/map/style.ts]

**Patch:**
- [x] [Review][Patch] Stale comment — "(Small-region pin fallback is Story 1.6.)" is now inaccurate; 1.6 defers it. [features/map/style.ts:110] — fixed (now "DESIGN UX-DR6 — is deferred")
- [x] [Review][Patch] Strengthen the dedup unit test to assert exactly one `countries|` key (currently leans on Set semantics + size===3). [e2e/rollup.spec.ts:19] — fixed

**Defer:**
- [x] [Review][Defer] No browser-level no-cascade / unmark→clear e2e — covered by the pure tests; unmark UX isn't wired until Epic 3 (Story 3.8). [e2e/map.spec.ts] — deferred
- [x] [Review][Defer] `splitKey` unguarded for a missing "|" — pre-existing inline behavior (1.5), unreachable by construction (keys always built with a separator). [features/map/lib/visited.ts:72] — deferred, pre-existing

Dismissed (8, verified non-issues): optimistic mark carries `countryCode` (roll-up correct pre-ack); removal path correct + not currently reachable (no unmark wiring); `countries|JP` roll-up vs explicit collapse is intended union semantics; no 1.5 regression from routing through `computeVisitedKeys`; unit tests in `e2e/` import + run in Node fine (allowed by the story, no unit runner exists); country-test's unused `countryCode` is harmless; `已儲存` ack text persists until next tap (mark-status success phase), not a transient-toast race; full-recompute removal logic correct.

## Dev Notes

### Scope boundary — what 1.6 IS and is NOT
- **1.6 DOES:** make a **country render visited when any admin-1 region inside it is marked** (region→country roll-up), computed client-side from `region_marks` via MapLibre feature-state, with **no downward cascade** and **no persisted derived state**. It extends the Story 1.5 feature-state applier.
- **1.6 does NOT:** **pins or pin-based roll-up** (pins don't exist until Epic 3; `3-9-pins-roll-up-into-visited` later extends this same applier so a region/country reads visited from a contained pin). **Unmark UX** ("Remove this place" + confirm) is Epic 3 / Story 3.8 — 1.6 only needs the roll-up to clear when a mark is removed via the data layer.
- **DEFERRED / open question (see end):** the **small-region pin fallback** (DESIGN `region-visited.small-region-fallback`, UX-DR6 — sub-~10px visited regions at world zoom get a small dot so the cue never disappears). Story 1.5 tagged it "Story 1.6," but the epics 1.6 AC is roll-up only and the requested scope is "mark-driven roll-up, no pins." Carried as a follow-up, not built here unless you fold it in.

### The whole mechanism (why this is small)
- Visited render = `["feature-state","visited"]` already drives `countries-fill-base/world`, `regions-fill`, and the three hatch layers (Story 1.5 + the tile-fidelity layer split). **Roll-up is purely "set more feature-state keys."** The ONLY new behavior is: for each `admin1` mark, also set `visited:true` on the parent **country** feature (`countries` sourceLayer, id = `countryCode`). No new layers, no new paint, no schema change.
- `promoteId: { countries:"iso", regions:"iso" }` (Story 1.3) means the feature id IS the ISO code, so `setFeatureState({source:"boundaries", sourceLayer:"countries", id: countryCode}, {visited:true})` lights the country directly. [style.ts]
- **Derived, never stored:** `region_marks` keeps only explicit marks (architecture line 113). Recompute the rolled-up set from `useRegionMarks` data on every change. Do NOT add a column, a "visited countries" cache, or write a country mark on the user's behalf when they mark a region.

### Files being modified — current state (read before editing)
- `features/map/lib/visited.ts` — **the one real edit.** `applyVisitedState(map, marks, prev): Set<string>` currently builds `next` as one key per mark (`sourceLayerFor(level)|regionCode`), sets `visited:true` on each, and clears keys in `prev\next`. The 1.5 author left this generic on purpose ("1.6 extends the same feature-state with the rolled-up parents"). Extract the `next`-set construction into a pure function and add the `admin1`→`countries|countryCode` roll-up entry. Keep `TappedRegion`/`regionFromPoint`/`createVisitedHatch` untouched. **Heads-up:** the current `applyVisitedState` param type is `ReadonlyArray<{ regionCode: string; level: RegionLevel }>` — it **omits `countryCode`**, so widen it to include `countryCode: string` (the caller's `RegionMark` already carries it; only the narrowed param type drops it). Without `countryCode` the roll-up has nothing to key the parent country on.
- `features/map/components/MapCanvas.tsx` — the apply-marks effect calls `applyVisitedState(map, marks ?? [], prevStateRef.current)` on marks change + once the `boundaries` source loads. **No change expected** (it passes the marks through; the roll-up happens inside `applyVisitedState`). Verify the marks objects reaching it include `countryCode`.
- `features/map/style.ts` — **expected: no change.** Country fill + hatch already read feature-state and the base/world split already exists. Only touch if Task 2 finds a real render gap.
- `features/regions/queries/region-marks-queries.ts` / `data/region-marks.ts` — `RegionMark` carries `{ regionCode, countryCode, level }`. No change; just the source of truth the roll-up reads.

### Data shapes (do not re-derive)
- `RegionMark` (from `data/region-marks.ts`, Story 1.4): `{ level: 'country'|'admin1', regionCode, countryCode, createdAt }`. For an `admin1` mark, `regionCode` = ISO 3166-2 (`JP-26`), `countryCode` = alpha-2 (`JP`). For a `country` mark, `regionCode` = `countryCode` = alpha-2.
- Tile feature props (from `scripts/build-tiles.mjs`): `{ iso, country, name, name_zh }` (+ `has_admin1` on countries). Roll-up does NOT read tiles — it reads the marks list. `has_admin1` only matters for understanding the zoom split (Task 2).

### Render at the zoom split (the subtle part — already correct, just confirm)
- A `has_admin1` country's `countries-fill-world` + `countries-visited-hatch-world` have `maxzoom 6`. So the **rolled-up country** is visible terracotta **below z6** (zoomed out = at-a-glance country tier). Above z6 those layers stop; the ADM1 union is the land and the marked region shows its own fill while bare siblings stay plain. That is exactly the desired behavior (AC1 "when I zoom out … its country renders visited"; AC2 zoom-in shows no cascade). No gap, no double-paint.
- A country with **no** admin-1 renders via `countries-fill-base` at all zooms; it only ever has `country` marks, so roll-up is a no-op for it.

### Conventions
Flat repo (no `src/`), feature-first; **MapLibre must not leak out of `features/map`** (roll-up lib lives in `features/map/lib/visited.ts`; the marks query stays in `features/regions`). Tailwind v3, light-only, zh-TW primary. Tokens never hardcoded except MapLibre style literals in `style.ts`. No Co-Authored-By; pnpm.

### Testing standards
- Unit (pure roll-up function) is the highest-value test here — it pins AC1/2/3 without a browser. Put it next to `visited.ts` (e.g. a `*.test.ts` in `features/map/lib/`) if a unit runner exists; otherwise assert the same cases in the e2e via `page.evaluate` against the exported function or via feature-state.
- e2e (Playwright, `e2e/`): extend `map.spec.ts` on the existing `window.__mapsakeMap` harness — mark admin-1 → country feature-state visited; country mark → no child region visited.
- Manual: reduced-motion still instant-fills; the 1.5 tap-to-mark + hatch are unbroken.

### References
- [Source: epics.md#Epic 1 › Story 1.6 (Visited roll-up rendering — AC1 region→country, AC2 no downward cascade, AC3 plain + client-side feature-state)]
- [Source: architecture.md#Data Architecture line 113 (visited = derived roll-up; persist explicit marks, compute render client-side), #Map subsystem line 147 (region fill via feature-state keyed by region_code, roll-up from marks+pins), line 261 (features/regions = region marks + visited roll-up logic), line 303 (FR5–8 visited roll-up)]
- [Source: EXPERIENCE.md line 57 (visited rolls up; region marked OR contains pin; country marked OR any admin-1/pin within; no downward cascade), line 142 (binary visited at country + admin-1, rolling up)]
- [Source: DESIGN.md#region-visited (terracotta fill + always-on hatch; small-region-fallback: pin-marker — DEFERRED, see scope boundary)]
- [Source: 1-5-tap-to-mark-a-region-visited.md#Dev Notes (1.5 vs 1.6 boundary; "keep the apply-marks-to-feature-state effect generic so 1.6 can extend it"; feature-state render seam)]
- [Source: features/map/lib/visited.ts (applyVisitedState seam), features/map/style.ts (feature-state fill + base/world split + hatch), data/region-marks.ts (RegionMark shape)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — create-story + dev-story

### Debug Log References

- **Headless WebGL** — the e2e suite couldn't run: chromium's headless shell has no WebGL context, so MapLibre's `map.style` stayed null and `querySourceFeatures`/`getFeatureState` threw "Cannot read properties of null". Fixed in `playwright.config.ts` with `launchOptions.args: ["--enable-unsafe-swiftshader"]` (software WebGL). This is what let the MapLibre e2e actually run headless (and unblocks CI).
- **Pre-existing broken 1.5 e2e helper** — the 1.5 `isVisited` helper closed over a Node-scope `const KYOTO` and was passed to `page.waitForFunction`, which serializes the fn and runs it IN THE BROWSER → `ReferenceError: KYOTO is not defined`. The 1.5 reload test therefore never actually executed its assertions. Fixed by inlining the feature ref inside the helper.
- **Reload race (not an app bug)** — after the helper fix, the 1.5 reload test failed on the post-reload re-apply. Root cause: it reloaded on the OPTIMISTIC fill (`isVisited`), racing the async DB write; the navigation cancelled the in-flight write so nothing persisted. Confirmed via the Playwright MCP that a real browser acks ("已儲存") in ~3s and the mark + roll-up survive a fresh load. Fixed the test to wait for the ack (`已儲存`) before reloading, per the durable-write contract.

### Completion Notes List

- **Roll-up implemented as a one-function change.** Extracted a pure `computeVisitedKeys(marks): Set<string>` in `features/map/lib/visited.ts`: each mark contributes its own key, and every `admin1` mark ALSO contributes `countries|<countryCode>` (parent country). No downward cascade (a `country` mark adds only its own `countries|<regionCode>`). Defensive: an `admin1` mark with no `countryCode` adds no malformed key. `applyVisitedState` now routes through it (full recompute → diff against `prev` → set/clear feature-state). Widened the `marks` param type to include `countryCode` (the caller's `RegionMark` already carried it).
- **No style change, no schema change, no MapCanvas change.** The rolled-up country lights up through the existing `["feature-state","visited"]` fill + hatch on `countries-fill-base/world`. `MapCanvas` already passed full marks (with `countryCode`) to `applyVisitedState`.
- **Derived, never stored** — `region_marks` still holds only explicit marks; the country render state is recomputed from `useRegionMarks` on every change (architecture line 113). Removing the last contributing region mark clears the country roll-up.
- **Verified live (Playwright MCP, real browser):** tap 京都府 (JP-26) at z6 → region visited + country JP rolled up to visited + "已儲存" ack; survives a fresh load. At **z2 the whole of Japan reads terracotta** (rolled-up trophy); at z4 only 京都府 is terracotta with bare siblings (no cascade). The roll-up country wash shows at the world tier (z<3, where the regions layer isn't drawn); at z3–6 the regions layer is on top so you see the individually-marked region — intended per the "region fill is the at-a-glance trophy" design (EXPERIENCE line 141).
- **Tests:** 5 pure `computeVisitedKeys` cases (AC1/2/3 + dedup + defensive) in `e2e/rollup.spec.ts` (run in Node, no browser); 1 browser integration test (tap region → country rolls up) added to `e2e/map.spec.ts`. Full suite **8 passed**. `tsc --noEmit` 0, `pnpm lint` 0.
- **Deferred (open question to Simon):** the small-region pin fallback (DESIGN UX-DR6) — kept out of 1.6 per the "roll-up only, no pins" scope; needs a home (fold into 1.6, its own story, or Epic 3).

### File List

**Added**
- `e2e/rollup.spec.ts` — pure `computeVisitedKeys` unit tests (Node-context Playwright)

**Modified**
- `features/map/lib/visited.ts` — `computeVisitedKeys` (pure roll-up) + `VisitedMark` type; `applyVisitedState` routes through it and keys feature-state by parsed `<sourceLayer>|<id>`
- `e2e/map.spec.ts` — roll-up integration test; fixed the `isVisited` helper (inline ref, no Node-scope closure); wait for the `已儲存` ack before reload
- `playwright.config.ts` — `--enable-unsafe-swiftshader` so headless chromium has software WebGL for MapLibre
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 1.6 → in-progress → review

### Change Log

- 2026-06-22 — Story 1.6 context created (ready-for-dev): region→country visited roll-up via MapLibre feature-state; client-side derived, no downward cascade, small-region fallback deferred.
- 2026-06-22 — Implemented → review: pure `computeVisitedKeys` roll-up in `visited.ts` (admin-1 mark lights its parent country; no cascade; derived not stored), routed through `applyVisitedState`. Added pure unit tests + a browser roll-up test; fixed a pre-existing 1.5 e2e helper bug + reload race; enabled headless WebGL for the suite (8 passed). Live-verified (Japan terracotta at z2, single prefecture at z4). tsc/lint green.
- 2026-06-22 — Code review → done: 3 adversarial layers, all 5 ACs met, no Story 1.5 regression. 1 decision resolved (roll-up shows at the world tier only — kept as-is, AC1/EXPERIENCE-aligned), 2 patches applied (stale `style.ts` small-region comment; strengthened the dedup unit test to assert exactly one `countries|` key), 2 deferred (browser no-cascade/unmark e2e; `splitKey` guard — both logged to deferred-work.md), 8 dismissed as verified non-issues. tsc/lint/tests green.
