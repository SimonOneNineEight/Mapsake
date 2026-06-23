---
baseline_commit: bc39fa3
---

# Story 3.4: Open a pin → memory panel / sheet

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want tapping a pin to open its memory, adapting to my screen,
so that viewing and editing feel native everywhere.

## Acceptance Criteria

1. **Tap a pin → its memory opens, responsively.** Tapping an individual pin opens its memory: **desktop/tablet (≥840px) = a right-docked panel** (map stays interactive beside it); **phone (<840px) = a bottom sheet (Vaul) at the default half snap**, draggable up to expanded and full. The opened pin gets the **selected glow** (accent `#C8893B` + ~1.15× scale). [epics 3.4 AC1; EXPERIENCE Component Patterns + Responsibility/Layout; DESIGN memory-pin.selected, bottom-sheet]
2. **Responsive container rules.** At **≥840px** the split panel is used; **below 840px** the bottom sheet. The phone sheet has **three snap points** (half ~0.5 default / expanded ~0.85 / full 1.0) with a drag handle and a pull-down / "▾ 回到地圖" return. Phone-landscape uses a side layout (or a two-snap half+full fallback). The keyboard-open "compose" state is deferred with the note field (Story 3.5 — there's no editable field in 3.4). [epics 3.4 AC2; EXPERIENCE Layout lines 93-105]
3. **Open / close / swap.** Close (× on the panel, pull-down/▾ on the sheet) dismisses and clears the selected glow. Tapping a DIFFERENT pin swaps the content in place (no close-then-reopen). The map stays interactive throughout (the panel/sheet never blocks panning/zoom on desktop; the sheet sits over the map on phone). [EXPERIENCE Memory panel/sheet]
4. **Memory card renders complete with the title alone.** The card shows the pin's **name (title)** always. Date, note, and photos are LATER stories (3.5/3.6) — 3.4 shows NO empty slots, no "Date: —", no broken-looking placeholders. The card reads complete with just the title. [epics 3.4; EXPERIENCE Memory card content line 61 "renders complete with title alone — never empty slots"]
5. **No regression.** Story 1.5 marking, 1.6 roll-up, 3.1 drop, and 3.3 clustering/cluster-expand all still work. In drop mode, tapping a pin still places a new pin (does NOT open) — open is the plain (non-drop) pin tap.

## Tasks / Subtasks

- [x] **Task 0 — Dependency: shadcn Drawer (Vaul) (NEEDS APPROVAL)**
  - [x] Add the shadcn **Drawer** component, which pulls in **`vaul`** (the 3-snap bottom sheet — architecture line 213 "Drawer (Vaul) = the 3-snap memory bottom sheet"). `pnpm dlx shadcn@latest add drawer` (copies `components/ui/drawer.tsx` + adds the `vaul` runtime dep). **NEW runtime dep → confirm before installing** (like TanStack Query in Story 1.5). Vaul supports `snapPoints` + a drag handle, which AC2 needs.
- [x] **Task 1 — Selected-pin state + map↔memory shell (AC: 1, 3)**
  - [x] Create a `'use client'` shell that owns the ephemeral **`selectedPinId`** state (architecture: "UI state minimal … sheet snap" — React state/context, NOT a new store dep). It composes `<MapCanvas onOpenPin={setSelectedPinId} selectedPinId={selectedPinId} />` + the memory container, and is rendered by `app/page.tsx` in place of the bare `<MapCanvas />`. Suggested: `features/memories/components/map-memory-shell.tsx` (keeps `app/page.tsx` a Server Component that just renders the shell). The shell passes `selectedPinId` + an `onClose` (`() => setSelectedPinId(null)`) to the memory container.
- [x] **Task 2 — MapCanvas: open-on-pin-tap + selected glow (AC: 1, 3, 5)**
  - [x] Add props `onOpenPin?: (pinId: string) => void` and `selectedPinId?: string | null` to `MapCanvas`.
  - [x] Add a delegated `map.on("click", "pins-marker", (e) => …)` handler: gate on `dropModeRef.current` (in drop mode, a tap places a pin — don't open), read `feature.properties.id`, call `onOpenPin(id)`. The general-handler tap guard already no-ops over `pins-marker`, so this is the only place a pin tap acts. Keep the cluster-click handler unchanged.
  - [x] **Selected glow:** add a `pins-selected` circle layer in `style.ts` (filter `["all", ["!",["has","point_count"]], ["==", ["get","id"], ""]]` initially) styled as the accent halo (`#C8893B` — add `MAP_COLORS.accent`; larger radius / accent stroke to read as the ~1.15× glow). In `MapCanvas`, an effect calls `map.setFilter("pins-selected", ["all", ["!",["has","point_count"]], ["==",["get","id"], selectedPinId ?? ""]])` whenever `selectedPinId` changes (after style load). Clearing selection (null) filters to none. (Selected glow is the state Story 3.3 deferred.)
- [x] **Task 3 — Memory container: responsive panel vs sheet (AC: 1, 2, 3)**
  - [x] `features/memories/components/memory-container.tsx`: given `pinId` + `onClose`, render nothing when `pinId` is null; otherwise render the memory.
  - [x] **≥840px → right-docked panel:** a custom surface panel docked right (~35–40% width; DESIGN surface bg, soft shadow), map stays interactive beside it (the panel is a sibling, not a modal overlay), with a close ×. Swapping pins re-renders content in place.
  - [x] **<840px → Vaul Drawer sheet:** `snapPoints={[0.5, 0.85, 1]}`, default open at 0.5; drag handle (DESIGN `region-border` handle); top corners `rounded-[18px]` (rounded.lg) on `surface`; pull-down or a "▾ 回到地圖" control returns/closes. The sheet sits over the map; map stays pinch/pan capable when not dragging the sheet.
  - [x] Pick panel-vs-sheet by width (a `useMediaQuery`/matchMedia at 840px, or CSS + conditional mount). **Phone-landscape:** use a side layout (panel-like) or a two-snap (half+full) fallback per EXPERIENCE line 103 — keep this best-effort/minimal; flag if deferred. **Keyboard-compose (forces Full, disables snap-drag):** DEFERRED to Story 3.5 (no editable field exists in 3.4), note it in the sheet component for the next story.
- [x] **Task 4 — Memory card (title only) (AC: 4)**
  - [x] `features/memories/components/memory-card.tsx`: render the pin's `name` as the title (DESIGN serif title treatment). NOTHING else in 3.4 — no date row, no note, no photos, no empty slots. The "+ 寫筆記 / + 加照片 / + 加日期" quiet affordances are Stories 3.5/3.6, not here.
  - [x] Source the pin: read it from the `usePins()` cache by id (the list already holds the full row — `listPins` selects all columns), e.g. a small `usePin(pinId)` selector. **Do NOT add a `getPin`/`['pin', pinId]` fetch in 3.4** — the tapped pin is always in the loaded list. (A dedicated `getPin` + `['pin', pinId]` query is for deep-linking to a pin not in the list — Epic 5 re-live; flagged, not built here.)
- [x] **Task 5 — Tests + verify (AC: 1-5)**
  - [x] e2e (`e2e/pins.spec.ts` or new, `window.__mapsakeMap` harness): drop+name a pin, zoom in so it's an individual marker, tap it (real `mouse.click` at its projected point at high zoom), assert the memory container appears with the pin's name; assert `getFeatureState`/the `pins-selected` filter reflects the selected pin (glow). Close → container gone + selection cleared. Resize to ≥840 vs <840 and assert panel vs sheet (e.g. role/test-ids differ). In drop mode, tapping a pin does NOT open (places a pin instead).
  - [x] Regression: 3.1 drop/persist, 3.3 cluster-expand, 1.5 mark still pass.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. Manual: tap a pin on desktop → right panel with the title; narrow the window <840 → bottom sheet at half, drag to full, ▾ back to map; tap another pin → swaps; the opened pin glows.

### Review Findings (code review 2026-06-22)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: satisfies the spec — no correctness bug, no hook-order issue, no 1.5/1.6/3.1/3.3 regression; architecture + scope clean (MapLibre confined, UI state minimal, Vaul sanctioned, tokens via theme). 1 decision-needed · 2 defer · dismissed.

**Decision-needed:**
- [x] [Review][Decision] Selected glow omits the literal ~1.15× marker scale — DESIGN memory-pin.selected = accent glow **+ ~1.15× scale**. The `pins-selected` accent halo (radius 11 under the radius-6 marker) provides the glow AND enlarges the pin's footprint, but the marker itself isn't scaled. **RESOLVED 2026-06-22: accept + defer** — the halo satisfies the "gently enlarges + glows when selected" intent; the literal per-marker scale is logged as polish (with the deferred teardrop) in deferred-work.md. [features/map/style.ts]

**Defer:**
- [x] [Review][Defer] Desktop panel can occlude the opened pin — no recenter when the right panel docks, so a pin in the right ~38% sits under the panel. The title shows in the panel so the pin needn't be visible; a pan/`easeTo`-with-padding offset (or Epic 5's re-live fly-to) is the fix. [features/memories/components/memory-container.tsx, MapCanvas.tsx]
- [x] [Review][Defer] Phone sheet keeps its snap across a pin swap — swapping pins while dragged to full leaves the new pin's sheet at full (snap resets only on close). Minor; refine when the sheet content grows (3.5+). [features/memories/components/memory-container.tsx]

Dismissed (verified non-issues): ResizeObserver `observe(ref.current)` — provably non-null (the `!ref.current` early-return guards it; tsc clean) and disconnected on cleanup; `useIsWide` initial-`false` sheet-flash — unreachable (no pin is selected at mount, so the container renders null) and the `useState(false)`+effect form is the SSR-safe one; conditional-hooks — stable order (all hooks run before the early `return null`, container always mounted); glow `setFilter` lifecycle — gated on `mapReady` (post style-load), `pins-selected` is a static layer; Vaul non-modal — uses the vaul primitive directly (no shadcn overlay/scrim), map stays interactive; no listener leak (refs only; map.remove() drops listeners); drop-mode tap doesn't open (gated). NIT: box-shadow rgba literals in components are shadow tints, not palette tokens (consistent with the 1.5 affordance).

### Scope boundary — what 3.4 IS and is NOT
- **3.4 DOES:** wire pin-tap → open; the responsive **container** (≥840 right panel / <840 Vaul 3-snap sheet) with open/close/swap; the **selected-pin glow** (the 3.3-deferred state); the memory card showing the **title only**; map stays interactive.
- **3.4 does NOT:** **note + optional date** (3.5), **photos + upload** (3.6), **full-screen photo viewer** (3.7), **edit/remove + delete** (3.8), **roll-up** (3.9), GeoNames **search** (3.2 deferred). The "+ add note/photo/date" quiet affordances belong to 3.5/3.6 — 3.4's card is title-only and must look complete that way.
- **Flagged scope calls (see end):** (a) `getPin`/`['pin', pinId]` not added — 3.4 reads the tapped pin from the `usePins` list cache (it's always loaded); the dedicated single-pin fetch is for Epic 5 deep-link. (b) **Keyboard-compose** state deferred to 3.5 (no editable field in 3.4). (c) **Phone-landscape** side-layout/two-snap — best-effort; confirm whether to fully build it now or treat as a refinement.

### Builds on 3.1/3.3 — current state (read before editing)
- `features/map/components/MapCanvas.tsx` — the once-built map effect has the general `click` handler (tap guard no-ops over `pins-marker`/`pins-cluster`), the `pins-cluster` delegated click (expand, gated on `dropModeRef`), `dropModeRef`, the `applyPins` effect, and the bottom-right `AddPinButton` + `PinNameInput`. ADD: `onOpenPin`/`selectedPinId` props, a `pins-marker` delegated click (gated on `dropModeRef`) → `onOpenPin`, and the `pins-selected` setFilter effect. Preserve all existing handlers + the `window.__mapsakeMap` harness.
- `features/map/style.ts` — has the `pins` clustered source + `pins-cluster`/`pins-cluster-count`/`pins-marker` layers. ADD a `pins-selected` layer (accent glow) above `pins-marker`. `MAP_COLORS` has `visited`/`surface`; ADD `accent: "#C8893B"`. Pin feature props carry `{id, name}` (from `pinsToGeoJSON`).
- `features/pins/queries/pins-queries.ts` — `usePins()` returns the full `Pin[]` (all columns). Add a tiny `usePin(pinId)` selector that finds the pin in that cache (no new fetch). `data/pins.ts` is UNCHANGED in 3.4.
- `app/page.tsx` — currently renders `<MapCanvas />` directly inside `<main class="h-dvh … md:p-3.5">`. Change it to render the new client shell (which renders MapCanvas + the memory container). Keep the page a Server Component; the shell is `'use client'`.

### Architecture compliance (guardrails)
- **MapLibre stays in `features/map`** — the pin-tap detection + the glow layer live in MapCanvas/style; the memory panel/sheet is `features/memories` and receives a plain `pinId`, never a MapLibre object. [architecture line 283, 263]
- **UI state minimal** — `selectedPinId` + sheet snap are ephemeral view state (React state/context in the shell), not server state, not a new store dep. [architecture line 203]
- **Query keys** — pins come from `['pins', userId]` (already). `['pin', pinId]` is reserved for a dedicated single-pin fetch (deep-link, Epic 5), not used in 3.4. [architecture line 203]
- **shadcn Drawer (Vaul)** is the sanctioned sheet (line 213); theme it to DESIGN tokens (surface bg, region-border handle), don't ship stock styling.
- **Data boundary unchanged** — no new `data/` call in 3.4 (read from cache). [line 281]
- **Tokens** via `MAP_COLORS` (map) + Tailwind theme tokens (panel/sheet); no hardcoded hex in components. zh-TW inline strings ("回到地圖") until i18n (Story 6.1).

### Responsive rules (EXPERIENCE lines 93-105) — the heart of this story
- **≥840px**: split — map ~60–65% left, memory panel docked right ~35–40%, map interactive, swap-in-place, close ×. (Threshold is 840, not 1024 — tablet portrait gets the panel.)
- **<840px (phone portrait)**: ONE Vaul sheet, three snaps — half ~0.5 (default landing), expanded ~0.85, full 1.0; drag handle at top; full is user-chosen via drag, NEVER the landing.
- **Phone landscape**: the half-snap is unusable (~180px) → side layout (split-like), or a two-snap (half+full) fallback. (Best-effort in 3.4.)
- **Keyboard open**: focusing a text field forces Full + disables snap-drag (compose state). DEFERRED to 3.5 (3.4 has no text field).

### Selected-pin glow (DESIGN memory-pin.selected)
- `glow: accent #C8893B`, `scale ~1.15`. Implement as a `pins-selected` MapLibre layer under accent paint, filtered to the selected id (and `!has point_count`), driven by `setFilter` from `selectedPinId`. This is also the re-live glow Epic 5 will reuse (deep-link lands glowing the pin).

### Conventions
Flat repo (no `src/` — architecture tree shows `src/features` but THIS repo is flat: `features/`, `app/`, `data/`). Feature-first. Tailwind v3, light-only, zh-TW primary (inline strings until 6.1). No Co-Authored-By; pnpm. Tokens not hardcoded (MapLibre literals in `style.ts` are the sanctioned exception).

### Testing standards
- e2e (Playwright, `e2e/`, `window.__mapsakeMap` harness + `--enable-unsafe-swiftshader`): open-on-tap (high zoom so the pin is an individual marker, not clustered), panel-vs-sheet by viewport (`page.setViewportSize`), close/swap, drop-mode-tap-doesn't-open. Wait for the durable ack pattern when seeding pins (Story 1.6/3.3 lesson). Per-anon-user pins under RLS: seed in the test's own session.
- Manual: the responsive drag (half→full), ▾ back to map, the swap, the glow.

### References
- [Source: epics.md#Epic 3 › Story 3.4 (open pin → panel/sheet; ≥840 split; phone-landscape + keyboard rules)]
- [Source: EXPERIENCE.md Component Patterns lines 57-66 (memory pin "open" = tap; memory panel desktop right-docked/swaps; memory sheet 3 snaps + handle + ▾ back; memory card title-always-complete), Layout lines 93-105 (840 threshold, 3 snaps, landscape, keyboard-compose), Interaction Primitives lines 108-112]
- [Source: architecture.md line 203 (query keys `['pin', pinId]`; UI state minimal = sheet snap), line 213 (shadcn Drawer = Vaul 3-snap sheet), lines 263/283/288 (features/memories; MapLibre confined; pins/memories mapping)]
- [Source: DESIGN.md#memory-pin.selected (accent #C8893B glow + ~1.15× scale), #bottom-sheet (surface bg, rounded.lg=18px top corners, region-border handle), #surface (panels/cards/sheet)]
- [Source: 3-1 + 3-3 (pins source/layers, MapCanvas tap guard + dropModeRef + cluster handler, pinsToGeoJSON `{id,name}` props), features/pins/queries/pins-queries.ts (usePins full rows), app/page.tsx]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — create-story + dev-story

### Debug Log References

- **eslint `react-hooks` strictness** — resetting the sheet snap on pin-change via a `useEffect` tripped `set-state-in-effect`; the render-time "adjust state on prop change" ref pattern then tripped `Cannot access refs during render`. Resolved by resetting the snap in the close event handler (`onOpenChange(false)`) instead — lint-safe, and it keeps swap-in-place (no remount).
- **Per-user pins under RLS** — each browser/anon session sees only its own pins; e2e + MCP seed in their own session (not a bug; cross-session is Epic 2).

### Completion Notes List

- **Vaul approved + installed** (`vaul@^1.1.2` via `shadcn add drawer` → `components/ui/drawer.tsx`). The phone sheet uses the vaul primitive directly (non-modal, no scrim) so the map stays visible + interactive above it; the desktop panel is a plain flex sibling.
- **Shell** `features/memories/components/map-memory-shell.tsx` owns `selectedPinId` (UI state), composes `MapCanvas` + `MemoryContainer` in a flex row; `app/page.tsx` renders it in place of the bare MapCanvas.
- **MapCanvas** gained `onOpenPin`/`selectedPinId` props, a delegated `pins-marker` click (gated on `dropModeRef` → `onOpenPin`), a `pins-selected` glow `setFilter` effect, a pointer cursor on pins, and a **ResizeObserver** so the canvas resizes when the panel docks/undocks (MapLibre's `trackResize` only watches the window).
- **`style.ts`**: `MAP_COLORS.accent` (#C8893B) + a `pins-selected` accent-halo layer (under the marker, zoom-faded), driven by the selected id.
- **MemoryContainer** picks panel (≥840 flex aside) vs Vaul sheet (<840, snapPoints [0.5,0.85,1], default half, drag handle, "▾ 回到地圖" close); **MemoryCard** shows the title only; `usePin(pinId)` reads from the `usePins` cache (no new fetch).
- **Deferred (flagged):** keyboard-compose state → Story 3.5 (no editable field in 3.4); phone-landscape side-layout/two-snap → refinement; `getPin`/`['pin', pinId]` → Epic 5 deep-link; true side-by-side panel is implemented via flex+ResizeObserver (map resizes), DESIGN teardrop still a circle.
- **Verified:** tsc 0, lint 0, build 0. e2e **16 passed** incl. 3 new memory tests (desktop panel + glow + close; phone sheet; drop-mode tap doesn't open) + the 1.5/1.6/3.1/3.3 regressions. MCP visual: tapping a pin splits the map and docks the right panel with the title; the opened pin glows.

### File List

**Added**
- `components/ui/drawer.tsx` — shadcn Drawer (vaul wrapper)
- `features/memories/components/map-memory-shell.tsx` — owns selectedPinId; composes map + memory
- `features/memories/components/memory-container.tsx` — responsive panel (≥840) / Vaul sheet (<840)
- `features/memories/components/memory-card.tsx` — title-only card
- `e2e/memory.spec.ts` — open/panel/sheet/close + drop-mode-no-open tests

**Modified**
- `features/map/components/MapCanvas.tsx` — `onOpenPin`/`selectedPinId` props, pins-marker open click, `pins-selected` glow effect, pin pointer cursor, ResizeObserver
- `features/map/style.ts` — `MAP_COLORS.accent` + `pins-selected` glow layer
- `features/pins/queries/pins-queries.ts` — `usePin(pinId)` cache selector
- `app/page.tsx` — render `MapMemoryShell` instead of bare `MapCanvas`
- `package.json` — `vaul`
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3.4 → in-progress

### Change Log

- 2026-06-22 — Story 3.4 context created (ready-for-dev): open a pin → responsive memory panel/sheet; Vaul flagged for approval; keyboard-compose + phone-landscape + getPin deferred.
- 2026-06-22 — Implemented → review: Vaul approved + installed; map↔memory shell owning selectedPinId; pin-tap-to-open + accent selected glow + ResizeObserver in MapCanvas; responsive MemoryContainer (≥840 panel / <840 Vaul 3-snap sheet) + title-only MemoryCard; `usePin` cache selector. No data/schema change. tsc/lint/build green; e2e 16 passed; MCP visual confirms the desktop panel + glow + map split.
- 2026-06-22 — Code review → done: 3 adversarial layers, verdict "satisfies the spec" (4/4 ACs, no regression, architecture + scope clean). No correctness bugs. 1 decision resolved (selected glow: accept the accent halo, defer the literal ~1.15× marker scale). 2 deferred (desktop panel can occlude the opened pin → recenter/Epic 5 fly-to; phone sheet keeps snap across swaps). Dismissed several verified non-issues (ResizeObserver ref provably non-null, useIsWide flash unreachable + SSR-safe, conditional-hooks order stable, Vaul truly non-modal). tsc/lint/build green; e2e 16 passed.
