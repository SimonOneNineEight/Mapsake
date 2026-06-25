---
baseline_commit: 7b5b54e
---

# Story 5.4: Deep-link re-live landing

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want tapping a notification to land me on the memory in its place,
so that I'm back inside my map, not on a bare list.

## Acceptance Criteria

1. **Tapping a notification lands on the pin's memory, in place.** Arriving at `/?pin={pinId}` (the URL Story 5-3's push + 5-1's `notificationclick` open) flies the map to that pin **zoomed into its region** (so it's an individual pin, not a cluster), shows the pin's **glow**, and **opens that pin's memory** (the desktop panel ≥840px / phone Vaul sheet) — the camera move and the memory open happen together, never a slideshow-first or a bare list. [epics 5.4 AC1; EXPERIENCE 136, 148]
2. **Reduced-motion degrades to a gentle fade.** With `prefers-reduced-motion: reduce`, the fly-to becomes an instant camera placement (`jumpTo`, no flying motion) and the glow/memory fade in gently — the same memory still lands. [epics 5.4 AC2; existing reduced-motion pattern in MapCanvas]
3. **A deep-link arrival is not interrupted by first-run onboarding.** A `?pin=` arrival skips the Story 4.1 first-run question overlay (the user tapped a notification with intent and may not be first-run); they land directly on the memory. The URL is scrubbed to `/` after handling (a refresh/back won't re-trigger), matching the `?auth_error=` pattern. [Story 4.1/4.2 gate; account-sheet URL-scrub pattern]
4. **A missing/deleted pin lands calmly.** If `?pin={id}` names a pin not in the user's set (deleted after the push, or otherwise absent once their pins load), nothing opens and no fly happens — the user simply lands on their map. No error, no empty sheet. [keepsake calm-failure principle]

### Decisions baked in

- **Reuse the existing wiring; add the minimum.** Selection already opens the memory and drives the glow: `MapMemoryShell` owns `selectedPinId`, `MemoryContainer` renders on a non-null `pinId`, and the `pins-selected` glow layer is filter-toggled by `selectedPinId` (MapCanvas). The camera already has an imperative handle (`cameraRef.flyToPin`, Story 4.7). 5-4 adds: a `?pin=` read in the shell, a reduced-motion-aware `flyToMemory` on the camera handle (4.7's `flyToPin` is left untouched), a gentle glow fade, and the onboarding-skip. NO new store, NO MapLibre import in the shell, NO new server route.
- **Skip onboarding on a deep-link (the Explore-flagged decision).** Obvious default: a notification tap is intentful and the target is the user's own pin, so do not show the first-run question. Gate the onboarding-on-mount with `&& !deepLinkPinId`.
- **No `getPin` query needed.** The re-live target is always the user's OWN pin, which is already in their `usePins()` list — open + fly once that list resolves (`usePin(pinId)`). A pin absent after the list loads is treated as AC4 (deleted → land calmly). This avoids a speculative `['pin', id]` fetch (a `getPin` is only for foreign/unlisted pins, which re-live never targets).
- **Scope = the single-memory landing only.** OUT: "N more from this day" and tapping nearby pins to keep re-living — that is **Story 5-5** (free wandering). 5-4 lands the one memory the notification named. The `othersFromThisDayCount` hint is not in the URL (only `?pin=`); 5-5 derives the day from the landed pin.

## Tasks / Subtasks

- [x] **Task 1 — Reduced-motion-aware camera + gentle glow (AC: 1, 2)** [features/map/components/MapCanvas.tsx (MOD), features/map/style.ts (MOD)]
  - [x] Extend the `cameraRef` handle with `flyToMemory(lat, lng)`: checks `window.matchMedia("(prefers-reduced-motion: reduce)").matches` (the existing pattern in the map `load` effect) — animated `map.flyTo({ center:[lng,lat], zoom })` normally, instant `map.jumpTo({...})` under reduced-motion. Use a zoom that un-clusters the pin into its region (≈7.5; clustering stops at `clusterMaxZoom:14`, markers are opaque by 6.5). Leave the existing `flyToPin` (Story 4.7 Places list) UNCHANGED. Update the `cameraRef` type in BOTH MapCanvas's prop type and `MapMemoryShell`.
  - [x] Give the `pins-selected` glow a gentle fade: add `"circle-opacity-transition": { duration: 280, delay: 0 }` to that layer's paint in `style.ts` (an opacity fade is reduced-motion-safe — the motion that degrades is the camera fly, handled above). The glow itself still appears via the existing `setFilter("pins-selected", … id === selectedPinId)`.
- [x] **Task 2 — Deep-link handling in the shell (AC: 1, 3, 4)** [features/memories/components/map-memory-shell.tsx (MOD)]
  - [x] On mount (one-shot, guarded by a `useRef` like account-sheet's `handledUrl`), read `new URLSearchParams(window.location.search).get("pin")` into a `deepLinkPinId` state; `window.history.replaceState(null, "", window.location.pathname)` to scrub it.
  - [x] Gate the first-run onboarding on the deep-link: `if (readDefaultView() === null && !deepLinkPinId) setOnboarding("question")` (so a `?pin=` arrival is not interrupted). Read the param synchronously in the same mount effect (or a lazy `useState` initializer) so the gate sees it.
  - [x] Resolve + land: with `deepLinkPinId` set, find the pin via `usePin(deepLinkPinId)` (reads the `usePins()` cache). In an effect, once the pin RESOLVES (coords available), set `selectedPinId` (opens the memory + glow) and call `cameraRef.current?.flyToMemory(pin.lat, pin.lng)` — guard with a ref so it fires once. If `usePins()` has loaded (`isSuccess`/`isFetched`) and the pin is still absent → clear the pending deep-link and do nothing (AC4: land calmly). Keep `selectedPinId` closable as today.
- [x] **Task 3 — Tests + validation (AC: 1, 3, 4)** [e2e/relive.spec.ts (NEW)]
  - [x] e2e (the shared-anon session can do this): drop a named pin via the existing flow, capture its id, navigate to `/?pin={id}`, assert the memory panel/sheet shows that pin's name AND the URL was scrubbed to `/`. Add: a fresh-storage arrival at `/?pin={id}` shows NO onboarding question overlay (the deep-link skip). Optionally: `/?pin=<nonexistent>` opens no memory and shows no error (AC4). The fly-to/glow are MapLibre internals (not asserted precisely); landing + open + scrub + onboarding-skip are the behavioral assertions.
  - [x] No-regression: `tsc` + `lint` + `pnpm build` clean; full `pnpm test:e2e` green. Normal pin tap-to-open, the Places list fly-to (4.7), and onboarding for a genuine first-run (no `?pin=`) must all still work.

## Dev Notes

### Exact wiring (from a codebase sweep — reuse, don't reinvent)
- **Selection already opens the memory + glow.** `MapMemoryShell` (`features/memories/components/map-memory-shell.tsx:28`) owns `const [selectedPinId, setSelectedPinId]`; it passes `onOpenPin={setSelectedPinId}` + `selectedPinId` to `MapCanvas` and renders `<MemoryContainer pinId={selectedPinId} … />` (line 113). `MemoryContainer` renders the desktop panel / Vaul sheet when `pinId` is non-null. So **setting `selectedPinId` IS opening the memory** — no new open mechanism. [map-memory-shell.tsx:28,82-83,113; memory-container.tsx]
- **The glow is already wired to `selectedPinId`.** `MapCanvas` toggles the `pins-selected` circle layer via `map.setFilter("pins-selected", ["all", ["!",["has","point_count"]], ["==",["get","id"], selectedPinId ?? ""]])` (MapCanvas.tsx ~376-386). Setting `selectedPinId` glows the pin automatically; 5-4 only adds the fade. [style.ts:265-275 layer; MapCanvas.tsx filter effect]
- **The camera handle.** `MapCanvas` assigns `cameraRef.current = { flyToPin: (lat,lng) => map.flyTo({center:[lng,lat], zoom:6}) }` when ready (MapCanvas.tsx:229-233); the shell holds `cameraRef` (map-memory-shell.tsx:41) and the Places list calls `cameraRef.current?.flyToPin` (line 94). Add `flyToMemory` alongside; do not change `flyToPin`. [MapCanvas.tsx:40-49,229-233; map-memory-shell.tsx:41,94]
- **Single-pin data.** `usePin(pinId)` (`features/pins/queries/pins-queries.ts:25-28`) returns the pin from the cached `usePins()` list — the user's own pins are all loaded, so no fetch. `usePins()` exposes the query state for the "loaded but absent" check (AC4). [pins-queries.ts]
- **URL-param + scrub pattern.** Mirror `account-sheet.tsx:86-97`: a `useRef` one-shot guard, `URLSearchParams(window.location.search).get(...)`, then `window.history.replaceState(null,"",window.location.pathname)`. [account-sheet.tsx:86-97]
- **Onboarding gate.** The shell sets onboarding on mount only when `readDefaultView() === null` (map-memory-shell.tsx:48-53). Add `&& !deepLinkPinId`. The overlay (`Onboarding`) renders only when `onboarding !== null`. [map-memory-shell.tsx:48-53,100-111]
- **Reduced-motion precedent.** The map `load` effect already does `window.matchMedia("(prefers-reduced-motion: reduce)").matches` to zero-out fill transitions (MapCanvas.tsx ~308-322) — reuse the same check for `flyTo` vs `jumpTo`. [MapCanvas.tsx ~308-322]
- **Clustering.** Source `pins` has `cluster:true, clusterRadius:50, clusterMaxZoom:14`; markers fade in zoom 4→6.5. Flying to ≈7.5 ensures the target renders as an individual, opaque pin (not a cluster). MapLibre re-clusters automatically on camera move. [style.ts:81-87,231-290]

### Timing (the one subtlety)
- `usePins()` is async; on a cold load the pin list may not be ready when the deep-link effect first runs. Hold the `deepLinkPinId` and act in an effect that re-runs as the query settles: open + fly when `usePin` returns the pin; give up (clear, land calmly) only once the list has loaded and the pin is still absent. A `flewToRef` (useRef) makes the fly fire exactly once.

### Scope guardrails
- NO "N more from this day", NO tap-a-nearby-pin-to-keep-reliving — that's **5-5**. NO changes to `flyToPin` (Places list, 4.7). NO new store, NO `getPin`/`['pin',id]` query, NO server route, NO migration. Don't alter normal tap-to-open or the onboarding flow for non-deep-link arrivals.

### Project Structure Notes
- MOD: `features/memories/components/map-memory-shell.tsx` (deep-link read + onboarding-skip + open/fly), `features/map/components/MapCanvas.tsx` (`flyToMemory` + reduced-motion + cameraRef type), `features/map/style.ts` (glow `circle-opacity-transition`). NEW: `e2e/relive.spec.ts`. No new dependency, no gated config — fully CI-verifiable.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.4 (lines 389-393)]
- [Source: EXPERIENCE.md lines 136 (deep-link to map+memory together, never a bare list), 141/148 (pins cluster; selected/re-live pin glows), 147-151 (reduced-motion / a11y floor)]
- [Source: architecture.md line 148 (selected/re-live pin glows), 290 (re-live loop wiring)]
- [Source: map-memory-shell.tsx, MapCanvas.tsx (cameraRef + glow filter + reduced-motion), memory-container.tsx, pins-queries.ts (usePin/usePins), account-sheet.tsx (URL-scrub pattern), style.ts (pin layers/clustering), Stories 5-1 (notificationclick opens data.url) + 5-3 (url = /?pin={pinId})]

### Dependency / handoff
- **From 5-3/5-1:** the notification opens `/?pin={pinId}` (5-3 payload `data.url`, 5-1 `notificationclick`).
- **To 5-5:** the landed pin (its `memoryDate`/region/coords) is the anchor for "N more from this day" + free wandering.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `relive.spec.ts`: 4/4 green (deep-link opens the memory + scrubs the URL; onboarding skipped on deep-link; missing pin lands calmly). tsc/lint/build clean; full e2e 98 passed, 1 pre-existing skip, no flakes.

### Completion Notes List

- **Reused the existing machinery as planned.** Setting `selectedPinId` opens `MemoryContainer` and drives the `pins-selected` glow (no new open/glow path). The glow got a gentle `circle-opacity-transition` (280ms) in `style.ts`.
- **Refinement vs the Task-1 plan: the fly is a prop, not a `cameraRef` method.** `cameraRef.current` is assigned only when the map reaches `load`, so a load-time deep-link fly through it would race a null handle. Instead `MapCanvas` takes a `flyToMemoryTarget` prop and flies in an effect gated on its OWN `mapReady` + a once-ref — race-free, and the reduced-motion `flyTo`→`jumpTo` choice lives where the map does. `flyToPin` (Story 4.7) is untouched. Net effect identical to the AC; cleaner wiring.
- **Open waits for the pin to resolve.** The shell holds the `?pin=` value (lazy `useState`, consumed only in effects/props so no hydration mismatch — the `initialView` approach), and opens the memory only once `usePin` returns the pin. If `usePins` has loaded and the pin is still absent (deleted/foreign), it gives up calmly — nothing opens (AC4). The fly target is derived from the same resolved pin.
- **Onboarding skip + URL scrub** mirror the established patterns: the first-run gate now also checks `!deepLinkPinId`; the param is scrubbed with `history.replaceState` after handling.
- No new dependency, no migration, no secrets — fully CI-verified.

### File List

- `features/memories/components/map-memory-shell.tsx` (MOD — `?pin=` read, onboarding-skip, open-on-resolve, scrub, pass `flyToMemoryTarget`)
- `features/map/components/MapCanvas.tsx` (MOD — `flyToMemoryTarget` prop + reduced-motion-aware fly effect)
- `features/map/style.ts` (MOD — `pins-selected` gentle opacity transition)
- `e2e/relive.spec.ts` (NEW)

### Change Log

- 2026-06-25 — Story created (context engine; grounded in epics 5.4 + EXPERIENCE 136/148 + a full sweep of the map/memory/onboarding wiring). Scope: the single-memory deep-link landing (fly + glow + open) reusing existing selection/camera/glow machinery; reduced-motion degrade; onboarding-skip on deep-link; calm handling of a missing pin. "N more"/free wandering deferred to 5-5. No new dep, no gated config — fully CI-verifiable.
- 2026-06-25 — Dev-story complete. `?pin=` deep-link in the shell + a `flyToMemoryTarget` prop on MapCanvas (race-free vs the cameraRef-at-load timing) + a gentle glow fade; 4 e2e cases. tsc/lint/build clean, full e2e 98 passed. Status → review.
- 2026-06-25 — Adversarial review (3 dimensions × skeptic verify): 1 false positive refuted, 1 confirmed (medium) fixed. Re-validated tsc/lint/build/e2e green. Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Changes Requested → addressed · 3 dimensions (deep-link lifecycle, hydration/regression safety, fly/glow/reduced-motion), each hand-traced by a skeptic. Lifecycle + hydration came back clean (the "AC4 latch stuck-closed" claim was refuted — the latch is correct). One real finding fixed.

### Action Items
- [x] **[Med] Zoom 7.5 doesn't reliably un-cluster the target pin.** `clusterMaxZoom` is 14, so at 7.5 clustering is still active — my comment had it backwards. For a lone pin it works, but a user with several nearby memories would land on a *cluster bubble* and the glow layer (individual-pins-only filter) would have nothing to glow (memory still opens, so a degraded landing, not a break). **Fixed:** after the fly settles (`moveend`), if a cluster sits over the target, expand it via `getClusterExpansionZoom` + `easeTo` (reusing the cluster-tap pattern) so the individual pin splits out and glows; reduced-motion keeps it instant. Corrected the comment.
- [refuted] **[—] AC4 give-up latches on first `usePins` success → stuck-closed.** Skeptic verified the `landedRef`/`isSuccess` interaction is correct: the give-up only latches once the pin is genuinely absent after load; a normal load resolves the pin and opens it. No change.
