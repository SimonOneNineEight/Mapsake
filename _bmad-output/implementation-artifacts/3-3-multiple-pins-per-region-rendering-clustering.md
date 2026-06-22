---
baseline_commit: cc5b302
---

# Story 3.3: Multiple pins per region + pin rendering & clustering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want several named pins inside one region shown at their spots,
so that distinct city memories don't collapse.

## Acceptance Criteria

1. **Each pin renders at its location.** Given a region with multiple pins, when I zoom in, each pin renders at its own coordinates as the terracotta memory marker (no overlap-collapse — distinct pins stay distinct). [epics 3.3 AC1; DESIGN memory-pin]
2. **Dense pins cluster.** Given dense pins at coarser zoom, they collapse into a **count bubble** (terracotta `region-visited-fill` circle + cream count label); **tapping or zooming a cluster splits it** back toward individual pins (zoom to the cluster's expansion zoom). Standard MapLibre client clustering on the `pins` GeoJSON source. [epics 3.3 AC2; architecture line 148; DESIGN memory-pin.cluster]
3. **Pins are the zoomed-in layer; region fill carries coarse zoom.** Given I zoom out, pins (and clusters) recede so the region fill is the at-a-glance view; given I zoom into a region, the pins fade in. No hard pop — a quiet zoom-based fade. [epics 3.3 AC3; EXPERIENCE line 141 "region fill is the at-a-glance trophy layer; memory pins fade in once you zoom into a region and recede as you zoom back out"]
4. **No regression.** Story 3.1 still works: the "+ 新增回憶" drop affordance places a named pin, it persists, and a plain tap (drop mode off) still marks the region. A plain tap on a pin or a cluster does NOT mark the region. Opening a pin's memory is still NOT wired (that's Story 3.4).

## Tasks / Subtasks

- [x] **Task 1 — Turn the `pins` source into a clustered source (AC: 2)**
  - [x] In `features/map/style.ts`, add clustering to the existing `pins` GeoJSON source: `cluster: true`, `clusterRadius: 50` (tune), `clusterMaxZoom: 14` (above this, always show individual pins). Keep the source `data` empty FC (MapCanvas feeds it via `applyPins`). [architecture line 148]
  - [x] MapLibre auto-adds `point_count` / `point_count_abbreviated` / `cluster_id` to cluster features; unclustered features keep their `{id, name}` props. No change to `pinsToGeoJSON` (it stays a flat FeatureCollection — clustering is computed by MapLibre from it).
- [x] **Task 2 — Cluster + count + unclustered marker layers (AC: 1, 2, 3)**
  - [x] Replace the single `pins-marker` circle with three layers on the `pins` source:
    - **`pins-cluster`** (circle, filter `["has", "point_count"]`): terracotta `MAP_COLORS.visited` fill + cream `MAP_COLORS.surface` stroke; radius steps up with `point_count` (e.g. `["step", ["get","point_count"], 14, 10, 18, 50, 22]`). The cluster bubble. [DESIGN memory-pin.cluster]
    - **`pins-cluster-count`** (symbol, filter `["has","point_count"]`): `text-field: ["get","point_count_abbreviated"]`, cream `MAP_COLORS.surface` text, the existing label font, small size. The count label.
    - **`pins-marker`** (circle, filter `["!", ["has","point_count"]]`): the individual terracotta marker (keep id `pins-marker` so the 3.1 tap guard keeps working) — `MAP_COLORS.visited` fill + cream stroke, radius ~6.
  - [x] **Zoom fade (AC3):** give `pins-marker` (and optionally `pins-cluster`) a `circle-opacity` (+ `circle-stroke-opacity`) `interpolate`-by-`zoom` ramp so pins fade in around the admin-1 grain (~z5→z7) and are faint/absent at world zoom, where the region fill carries the view. Pick thresholds that read calm, not poppy; honor the existing reduced-motion posture (opacity by zoom is not a transition, so it's fine, but don't add motion transitions).
- [x] **Task 3 — Cluster click → expand (AC: 2)**
  - [x] In `features/map/components/MapCanvas.tsx`, add a `click` handler on `pins-cluster`: read the feature's `cluster_id`, call `(map.getSource("pins") as GeoJSONSource).getClusterExpansionZoom(cluster_id)`, then `map.easeTo({ center: <cluster geometry coords>, zoom })`. This splits the cluster. (MapLibre 5.x: `getClusterExpansionZoom` returns a Promise — `await` it or use the callback form; confirm the installed version's signature.)
  - [x] Update the plain-tap no-op guard (Story 3.1): it currently skips marking when `queryRenderedFeatures(point, { layers: ["pins-marker"] })` hits. Extend the layer list to **`["pins-marker", "pins-cluster"]`** so a tap on a cluster also never marks the region (the cluster-click handler handles it instead). Preserve the drop-mode branch + the Story 1.5 mark path + the `userId`/offline guards.
- [x] **Task 4 — Cursor affordance (polish, AC: 2)**
  - [x] Pointer cursor on `pins-cluster` hover (mouseenter/leave), matching the existing region-hover cursor pattern in MapCanvas, so a cluster reads as clickable. (Individual-pin hover/open is Story 3.4 — don't wire pin-open here.)
- [x] **Task 5 — Tests + verify (AC: 1-4)**
  - [x] e2e (`e2e/pins.spec.ts` or a new spec, `window.__mapsakeMap` harness): seed ≥2 pins in one country at different coords (drop via the 3.1 flow, or insert via the data layer), then at a LOW zoom assert a cluster feature renders (`querySourceFeatures("pins")` includes a feature with `point_count`, or `queryRenderedFeatures({layers:["pins-cluster"]})` non-empty); at a HIGH zoom assert individual `pins-marker` features render and no cluster. Fire a cluster click → assert the map zoomed in (zoom increased).
  - [x] Regression: the 3.1 drop → name → persist → reload test still passes; a plain tap still marks a region (drop mode off); a tap on a cluster does not create a mark.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Manual: drop 2–3 pins in one country, zoom out → they cluster with a count; click the cluster → it expands; zoom way out → pins recede and the region fill carries the view.

### Review Findings (code review 2026-06-22)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: satisfies the spec — all 4 ACs met; architecture + scope clean (MapLibre confined to features/map, `MAP_COLORS` tokens, no data/dep change, clustering = the NFR4 perf play). 0 decision-needed · 2 patch · 1 defer · dismissed (incl. one reviewer concern that's a verified non-issue).

**Patch (all applied 2026-06-22):**
- [x] [Review][Patch] Drop-mode tap on a cluster both drops a pin AND expands the cluster — **fixed:** added a `dropModeRef` (synced in the `onTapRef` effect) and the `pins-cluster` click handler now returns early when drop mode is on, so drop intent wins and the camera doesn't fly. [features/map/components/MapCanvas.tsx]
- [x] [Review][Patch] Harden the clustering e2e — **fixed:** the two seed pins now drop at distinct nearby coords (135.6,34.9 / 135.95,35.15) so "split at high zoom" tests real declustering, and the test waits for `queryRenderedFeatures(["pins-cluster"])` then clicks the rendered cluster's projected centroid. [e2e/pins.spec.ts]
- [x] [Review][Patch] **Surfaced during patching:** the Story 3.1 drop e2e reloaded on the OPTIMISTIC pin without waiting for the `已儲存` ack — a reload race (same as the 1.6 marks fix) that passed before by timing luck and failed reproducibly now. **Fixed:** wait for the ack before reload. [e2e/pins.spec.ts]

**Defer:**
- [x] [Review][Defer] AC3 zoom-fade is verified by inspection + the MCP visual, not an e2e assertion (opacity-by-zoom is fragile to assert in headless). Add a fade assertion when pin rendering gets richer (3.4+). [e2e/pins.spec.ts]

Dismissed (verified non-issues): **count-label click "falls through" to mark a region — NON-ISSUE.** The `pins-cluster-count` symbol always renders WITHIN the cluster circle (abbreviated count, ≤~18px wide, vs a ≥28px circle), so `queryRenderedFeatures(["pins-marker","pins-cluster"])` returns the circle beneath the glyph and the tap guard no-ops (no region mark); the expand handler fires on the same circle. Also dismissed: cursor flicker cluster→region (steady state is pointer over land, correct); z5–6.5 "dead band" (intended fade overlap); `getClusterExpansionZoom` Promise form + `GeoJSONSource` cast match maplibre 5.24; layer order (count above circle) correct; `["step",…]` expression valid; no 1.5/1.6 regression (`pins-marker` id + filter preserved, marks/hatch/roll-up layers untouched, `usePins`→`applyPins` unchanged).

Note (pre-accepted scope): the DESIGN teardrop marker shape stays a circle in 3.3 — a deliberate, documented deferral flagged for sign-off.

## Dev Notes

### Scope boundary — what 3.3 IS and is NOT
- **3.3 DOES:** make the `pins` source **clustered**; render cluster bubble + count + individual markers; **cluster-click-to-expand**; a **zoom fade** so pins are the zoomed-in layer and the region fill carries coarse zoom; multiple pins per region each at their own coords.
- **3.3 does NOT:** **open a pin → memory panel/sheet** (Story 3.4 — a plain tap on an individual pin stays a no-op here, exactly as 3.1 left it; only CLUSTER taps do something: expand). Note/date (3.5), photos (3.6), the **selected/re-live pin glow** (3.4/Epic 5), **roll-up into visited** (3.9), GeoNames **search** (3.2, deferred post-v1). Don't build these.
- **One scope decision (flag at end):** DESIGN's memory-pin is a **teardrop**; Story 3.1 shipped a **circle** placeholder and 3.3 keeps a circle (terracotta + cream ring) for both the marker and the cluster bubble. A true teardrop needs a registered icon image (a `symbol` layer with an `addImage`'d marker, like the visited-hatch in Story 1.5). Recommend keeping the circle for 3.3 (clustering + zoom behavior is the story's substance) and treating the teardrop shape as a later visual polish — confirm, or ask me to generate the teardrop icon now.

### Builds on Story 3.1 — current state (read before editing)
- `features/map/style.ts` — the `pins` source is `{ type: "geojson", data: { type:"FeatureCollection", features: [] } }`; the only pin layer is `pins-marker` (circle, radius 6, `MAP_COLORS.visited` fill, `MAP_COLORS.surface` stroke 2), appended LAST so it sits on top + is hit-testable. This story adds `cluster: true` to the source and splits the one layer into cluster/count/unclustered. `MAP_COLORS.visited` = `#B5663E`, `MAP_COLORS.surface` = `#FBF4E4` (cream) — reuse, never hardcode.
- `features/map/lib/pins.ts` — `pinsToGeoJSON(pins)` builds the flat FeatureCollection (Point per pin, props `{id, name}`); `applyPins(map, pins)` does `getSource("pins").setData(...)`. **Unchanged by 3.3** — MapLibre clusters from the flat source; `setData` re-clusters. The `PinFeatureCollection` local type stays.
- `features/map/components/MapCanvas.tsx` — has the `applyPins` effect (on `[pins, mapReady]`); the click handler branches on `dropMode` (drop = place pin via `regionFromPoint` + `e.lngLat`), and on the plain-tap path guards `if (queryRenderedFeatures(point,{layers:["pins-marker"]}).length) return;`. ADD the cluster-click handler + extend that guard to include `pins-cluster`. Preserve everything else (drop mode, the 1.5 mark path, `userId`/offline guards, the combined `MarkStatus`, the `window.__mapsakeMap` harness, the bottom-right `AddPinButton`).
- `data/pins.ts`, `features/pins/queries/pins-queries.ts` — **unchanged**. Pins still come from `usePins()` → `applyPins`. No data-layer or schema change in 3.3.

### MapLibre clustering specifics (the mechanism)
- Set `cluster: true` on the GeoJSON source. MapLibre computes clusters client-side per viewport/zoom and injects features with `point_count` (+ `point_count_abbreviated`, `cluster_id`). Cluster layers filter `["has","point_count"]`; the individual layer filters `["!", ["has","point_count"]]`.
- **Expand a cluster:** on click of the cluster layer, `const src = map.getSource("pins") as GeoJSONSource; const zoom = await src.getClusterExpansionZoom(clusterId); map.easeTo({ center: feature.geometry.coordinates, zoom });`. In maplibre-gl 5.x `getClusterExpansionZoom` returns a Promise (older callback form also exists) — verify against the installed version and use the Promise form.
- The cluster bubble radius/step should grow with `point_count` via a `["step", ["get","point_count"], r0, t1, r1, ...]` expression. The count label uses `point_count_abbreviated`.
- Clustering does not need `promoteId` (we don't use feature-state on pins). The string-UUID feature ids are fine for rendering (no feature-state on pins in v1).

### Architecture compliance (guardrails)
- **MapLibre stays in `features/map`** (the cluster layers, the cluster-click handler, `getClusterExpansionZoom` all live in `features/map`). `features/pins` is untouched by 3.3. [architecture line 283]
- **No data/schema/RLS change.** Pins are read via `usePins()` (`['pins', userId]`); 3.3 is pure render/interaction. [architecture line 281-282]
- **Tokens via `MAP_COLORS`** in `style.ts` (the sanctioned MapLibre-literal exception); never hardcode hex in components.
- **Performance (NFR4):** clustering is the performance play for many pins — keep `clusterRadius`/`clusterMaxZoom` sensible so a dense region doesn't render hundreds of overlapping circles. [architecture#Map subsystem]

### Conventions
Flat repo (no `src/`); feature-first; Tailwind v3, light-only, zh-TW primary (inline strings until i18n in Story 6.1 — the count label is numeric, no i18n needed). No Co-Authored-By; pnpm. No new dependency expected (MapLibre clustering is built in).

### Testing standards
- e2e (Playwright, `e2e/`): build on the `window.__mapsakeMap` harness + the `--enable-unsafe-swiftshader` config (Story 1.6). Seed multiple pins (the 3.1 drop flow writes to the live `pins` table — note prior runs leave pins in the shared dev DB, so assert on cluster/marker PRESENCE at the right zooms rather than exact counts). Wait for the durable ack (`已儲存`) before relying on persistence (Story 1.6 lesson).
- Pure unit: clustering is MapLibre-internal (not unit-testable without a map); `pinsToGeoJSON` is already covered by 3.1's pure tests and is unchanged.
- Manual: cluster → expand → individual markers; zoom-out recede.

### References
- [Source: epics.md#Epic 3 › Story 3.3 (AC1 each pin at its spot; AC2 cluster + split; AC3 recede on zoom-out)]
- [Source: architecture.md#Map subsystem line 148 ("Memory pins = GeoJSON source with clustering; pins fade in zoomed-in; selected/re-live pin glows"), NFR4 performance]
- [Source: EXPERIENCE.md line 141 (region fill = at-a-glance trophy; pins fade in zoomed-in, recede zoomed-out; dense pins cluster into a count bubble; zooming in splits the cluster)]
- [Source: DESIGN.md#memory-pin (terracotta `#B5663E` + cream `surface` outline) + memory-pin.cluster (region-visited-fill circle + cream `surface` count label, rounded-full)]
- [Source: 3-1-drop-a-named-pin-tap-to-place.md (the pins source/layer, applyPins/pinsToGeoJSON, MapCanvas tap guard + drop mode — all established here) + features/map/style.ts, features/map/lib/pins.ts, features/map/components/MapCanvas.tsx]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — create-story + dev-story

### Debug Log References

- Per-user pins under RLS (not a bug): each browser/anon session sees only its own pins, so a fresh session/MCP run shows the pins it created, not the e2e session's. Cross-session/device visibility is Epic 2 (account linking). Confirmed clustering by dropping ≥2 pins in one session.

### Completion Notes List

- **Clustered the `pins` source** (`style.ts`): `cluster: true`, `clusterRadius: 50`, `clusterMaxZoom: 14`. `pinsToGeoJSON`/`applyPins`/`data` unchanged — MapLibre clusters from the flat source; `setData` re-clusters.
- **Three layers** replace the single `pins-marker` circle: `pins-cluster` (terracotta bubble, radius steps with `point_count`), `pins-cluster-count` (cream `point_count_abbreviated` label), `pins-marker` (individual circle, filter `["!",["has","point_count"]]` — id kept so the 3.1 tap guard still works). Zoom-opacity ramps fade pins in at the region grain (marker z4→6.5; cluster z3→5) and let them recede at world zoom so the region fill carries the at-a-glance view (AC3).
- **Cluster click → expand** (`MapCanvas`): `map.on("click","pins-cluster", …)` reads `cluster_id`, `await getSource("pins").getClusterExpansionZoom(id)` (maplibre 5.24 Promise form), `easeTo` to that zoom at the cluster centroid. Extended the plain-tap no-op guard to `["pins-marker","pins-cluster"]` so a cluster tap never marks the region; added a pointer cursor on `pins-cluster` hover (individual pins stay non-clickable — open is 3.4).
- **No data/schema/dependency change.** MapLibre clustering is built in.
- **Verified:** tsc 0, lint 0, build 0. e2e **13 passed** incl. the new clustering test (cluster `point_count` at z4 → real cluster click zooms in → individual markers, no cluster, at z15) and the 3.1 drop/persist + 1.5 mark/roll-up regressions. Visual (MCP): 3 nearby pins render as one terracotta cluster bubble with the cream count "3" at z6.
- **Deferred (flagged):** the DESIGN teardrop marker shape — kept the circle (clustering + zoom behavior is the story's substance); teardrop is a later visual polish.

### File List

**Modified**
- `features/map/style.ts` — `pins` source `cluster: true` (+radius/maxzoom); replaced the single marker with `pins-cluster` / `pins-cluster-count` / `pins-marker` layers + zoom-opacity fade
- `features/map/components/MapCanvas.tsx` — cluster-click→`getClusterExpansionZoom`+`easeTo`; tap no-op guard extended to clusters; pointer cursor on cluster hover
- `e2e/pins.spec.ts` — clustering e2e (cluster at low zoom, split at high, cluster-click zooms in)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3.3 → in-progress

### Change Log

- 2026-06-22 — Story 3.3 context created (ready-for-dev): multiple pins per region + MapLibre clustering + zoom fade; teardrop deferred.
- 2026-06-22 — Implemented → review: clustered the `pins` source; cluster bubble + count + individual marker layers with a zoom-opacity fade; cluster-click-to-expand + extended tap guard + cluster hover cursor. No data/dep change. tsc/lint/build green; e2e 13 passed (incl. new clustering test); MCP visual confirms the count bubble. All tasks complete.
- 2026-06-22 — Code review → done: 3 adversarial layers, verdict "satisfies the spec" (4/4 ACs, architecture + scope clean). 2 patches applied (drop-mode tap on a cluster no longer double-acts — gated the expand handler on a `dropModeRef`; hardened the clustering e2e to distinct coords + rendered-cluster wait) + a 3rd surfaced during patching (the 3.1 drop e2e reload-race — wait for the `已儲存` ack before reload, same as 1.6). 1 deferred (AC3 zoom-fade not e2e-asserted). Dismissed a reviewer "count-label click marks region" concern (verified non-issue: the count always renders within the cluster circle). tsc/lint/build green; e2e 13 passed.
