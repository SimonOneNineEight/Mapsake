---
name: travel-map
status: final
sources:
  - ../../prds/prd-travel-map-2026-06-16/prd.md
  - ../../briefs/brief-travel-map-2026-06-16/brief.md
updated: 2026-06-20
---

# Mapsake — Experience Spine

> How Mapsake works. Visual identity (color, type, shapes, components' looks) lives in `DESIGN.md`; this spine references its tokens by `{path.to.token}`. Product scope, requirements, and personas are inherited by reference from the PRD and Brief — not restated here. The named journeys (UJ-1, UJ-2, UJ-3) are the PRD's. **When any mock conflicts with these spines, the spines win.**

## Foundation

Web-first **PWA**, responsive across phone and desktop, with a prominent install nudge (load-bearing for iOS web push). One product surface — a single continuous zoomable map plus a memory panel/sheet — not separate "browse" and "log" modes.

**Language: Traditional Chinese, Taiwan (zh-TW) is primary; English is a fast-follow second language.** The product name stays **"Mapsake"** (Latin, coined). Everything else — UI strings, labels, dates — is Chinese-first. All UI strings are externalized from day one, and layouts must handle both compact Chinese and wider English without breaking.

**v1 ships light-only.** The "Lamplight" dark theme is fully specified in `DESIGN.md` but deferred to Phase 2 — no theme toggle in v1.

**Account / auth placement & tone.** Auth is a real v1 surface (sign up / sign in), but the breadth-first bet argues for letting the payoff land first: onboarding (UJ-1) runs **local-first**, and the account/"keep your map" prompt sits **right after the onboarding payoff** (where it doubles as the cross-device-sync + push enable). A no-account user can mark and browse on-device; creating an account is what lets the map sync across devices and survive a reinstall — so the prompt's tone is a quiet keepsake guarantee ("keep your map safe across your devices"), never a gate or a nag. The **auth method (email / OAuth / magic-link) is explicitly DEFERRED to architecture**; only its placement and tone are owned here.

`DESIGN.md` is the visual identity reference.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Map | App open (cold) | The single continuous zoomable atlas; visited regions filled (explicit mark or rolled up from a contained pin), unvisited bare; memory **pins** appear inside regions when zoomed in. The home of everything. |
| Memory panel / sheet | Tap a memory PIN; notification deep-link | View/add the memory for one pin: name, optional date, note, photos. A region can hold many pins. Desktop = right-docked panel; phone = bottom sheet. (Marking a region visited vs. dropping a pin — see Component Patterns › Map region & Memory pin.) |
| Onboarding | First run only | Default-view question → rapid tap-to-mark backfill → one gentle line → drop into the filled map. |
| Places visited (text/list) | Menu / accessibility entry | A list alternative to the map — screen-reader path and a plain browse view. |
| Account / sign-in | After onboarding payoff; Settings | Sign up / sign in to keep the map across devices. Local-first before it; quiet keepsake tone, not a gate. Method deferred to architecture. |
| Settings | Menu | Account/auth, notifications (cadence, time, global off), language, per-memory mutes, **default view (world / focus country)**, **export my data**, **theme (Lamplight — Phase 2, not a v1 toggle)**. |

No separate "full-screen memory" surface — full immersion is the top snap of the same bottom sheet (see Interaction Primitives). Modal depth stays shallow; the map is always one gesture away.

→ Composition reference: `.working/layout-map-memory-1.html`, `.working/empty-states-1.html`. Spines win on conflict.

## Voice and Tone

Microcopy principles. The aesthetic/brand register lives in `DESIGN.md.Brand & Style`. Final strings are drafted during build, with a **native-fluent zh-TW pass before launch** — demo strings below (新增照片 / 稍後再補充 / 兩年前的今天：京都) are illustrative drafts, not final.

1. **Quiet and warm, never a salesperson.** No hype, no exclamation-mark urgency, no FOMO.
2. **Specific over generic.** "兩年前的今天：京都" beats "你有一則新回憶" — the specificity *is* the warmth.
3. **Never nags, never scolds.** No "complete your profile," no "0 photos," no streak guilt. Absence is normal.
4. **Invites, never commands.** "稍後再補充" not "請填寫"; the user controls the pace.
5. **Calm/literary register in Chinese**, matching the Song-serif keepsake feel — not a peppy app tone.

## Component Patterns

Behavioral. Visual specs live in `DESIGN.md.Components`.

| Component | Use | Behavioral rules |
|---|---|---|
| Map region | Map | **The memory unit is a pin, not the region** — a region is the at-a-glance trophy fill. **Tap a region (empty land, not a pin) → MARKS it visited** (the fill animates in as a quiet confirmation; the panel does NOT auto-open); tapping an already-visited region's empty land is a no-op (it stays marked). During onboarding backfill there is a fast **"marking rhythm"** where taps just mark, no panel — and a returning user doing bulk backfill can re-enter that rhythm via a "mark places" mode. **Visited rolls up:** a region reads visited if explicitly marked OR if it contains any pin; a country reads visited if marked OR if any admin-1/pin within it is — **no downward cascade** (marking a country never marks its regions). **Unmark:** open the region (long-press / region menu) and use "Remove this place" (a gentle confirm if it holds pins or a real memory; see Edit / remove). Visited carries the texture cue, not color alone. |
| Memory pin | Map (zoomed into a region) | **The core memory unit.** **Drop a pin:** an explicit **"+ add memory / pin" affordance** enters a drop mode → the next tap lands a pin at that spot → the user **names it** (e.g. "京都") → it becomes a memory and opens its panel/sheet. This keeps the gesture unambiguous: a plain tap on land marks the *region*; dropping a pin is always the deliberate "+ add" affordance, never an accidental tap. **Open a pin:** tap an existing pin → OPENS its memory. A region can hold **many pins** (San Francisco, Los Angeles, San Diego all inside California). **v1 pins are tap-placed + named;** GeoNames city search/autocomplete (type a city → pin snaps to true coordinates) is a deferred enhancement. **Delete a pin** removes that memory (gentle confirm if it holds content); if it was the only thing making a region read visited, the region returns to bare unless explicitly marked. |
| Memory panel | Desktop (right-docked) | Tapping another region swaps panel content in place; map stays interactive. Close (×) on the panel. |
| Memory sheet | Phone (bottom sheet) | Three drag snap points (see Interaction Primitives). Drag handle at top; pull-down / "▾ back to map" returns from full. |
| Memory card content | Panel + sheet | Title always; date, note, photos all optional. Renders complete with title alone — never shows empty slots or "Date: —". |
| Add-detail affordances | Panel + sheet | Quiet terracotta `{components.link-quiet}` invitations ("+ Add photos", "+ Write a note", low-emphasis "+ add date"). Present everywhere; never required. |
| Date picker | Memory card | Optional. Skipping is first-class; no default-filled or required date. zh-TW formatting (e.g. "2022 年 4 月"). |
| Photo batch upload | Panel + sheet (UJ-3) | Multi-select from the camera roll, eager. Per-file states: queued → uploading (quiet per-photo progress) → done; **per-photo failure shows a calm inline "retry," never a blocking error**. Thumbnails/placeholders render immediately so the card never looks broken mid-upload. Handles the "hot camera roll / many at once" case without a modal takeover. |
| Photo viewer / swipe | Panel + sheet (UJ-2 climax) | Tapping a photo opens a **full-screen viewer that captures the horizontal swipe** for moving between photos — this resolves the gesture collision: the viewer owns swipe, so it never competes with the sheet's vertical drag or the map's pinch-zoom (those are inactive while the viewer is up). Pull-down / × closes back to the memory. |
| Edit / remove | Panel + sheet | Edit a memory's note/date, remove an individual photo, **unmark a region** (set back to unvisited), or **delete a memory**. A bare mark removes with no friction; a memory holding a real note/photos gets **one gentle confirm** (durability is sacred — never imply accidental loss). Unmark and delete-memory are the same action on the region (removing it returns the land to bare paper). |
| Install nudge | App shell | Prominent PWA install prompt; gateway to iOS web push. Dismissible, not nagging. |

## State Patterns

Principle: **absence is normal, never a failure.** No sad-faces, no "0 photos," no empty/broken slots, no progress meters, no "incomplete" badges, no "complete your profile" nags.

| State | Surface | Treatment |
|---|---|---|
| Blank map (new user) | Map | All parchment (`{colors.canvas-bg}`), no terracotta. One soft centered line — "Tap anywhere you've been to begin" — with a faint serif-italic sub-line. Airy invitation, not a void. Fades once the first region is colored. |
| Bare visited mark (most common) | Panel / sheet | Place name + calm optional "+ Add photos / + Write a note." Looks complete as-is. No date row when date is absent. |
| Region with pins vs. bare region | Map | A **bare visited region** is just the terracotta trophy fill, no pins inside. A **region with pins** shows its pins once zoomed in (clustered when dense). Both are complete — pins are an enrichment, never required for a region to count as visited. |
| Empty region (zoomed in, no pins) | Map | Filled or bare, a region with no pins quietly invites a first one: a soft "+ add a memory here" affordance. Absence is normal — it's an invitation, never a "0 memories" scold. |
| Partial memory | Panel / sheet | Show what's present (e.g. the note). Missing pieces appear only as quiet optional offers, never errors or blank slots. |
| Multiple memories on one date | Notification + landing | Notification names one place; landing surfaces "N more from this day." |
| Muted place/memory | Notifications | Never resurfaces via notification; still fully visible on the map. |
| Reduced-motion | Map (re-live) | Fly-to + glow degrade to a gentle fade (see Accessibility Floor). |
| Photo upload in progress | Panel / sheet | Quiet per-photo progress + placeholders; the card stays whole. **Per-photo failure → calm inline "retry,"** never a blocking modal or red error. |
| Photo loading (re-live) | Panel / sheet | Placeholder/blur-up while a photo loads so the re-live moment isn't broken by a blank gap (NFR4). |
| Saving / sync | App shell | Durability-first, never alarming: a quiet "saved" affordance shown only after the server confirms the write (durable-write contract). On a transient failure, the edit is retained with a calm retry — never an "unsaved"/loss message. (v1 writes are online-only; see Offline.) |
| Offline (installed PWA) | App shell | Already-loaded map and cached memories stay **viewable**; a quiet offline indicator. **v1 is read-only offline:** write affordances (mark / add pin / edit) are disabled with a calm "viewing only — reconnect to add" banner, never a hard wall or silent failure. An offline-write queue is a documented fast-follow, not v1. |
| Export ready | Settings | Request → "preparing your keepsake" → ready to download. Framed as the trust guarantee: the memories are yours to take. |

## Interaction Primitives

The **map + memory layout model**. Honors the PRD hard rule: a re-live landing is map + memory *together*, never slideshow/takeover-first.

**Desktop (≥ ~1024px) — side-by-side split.** Map ~60–65% on the left; memory panel docked **right** ~35–40%. Map stays interactive; tapping another region swaps panel content. The panel has a close (×).

**Phone (portrait) — ONE draggable bottom sheet with THREE snap points:**
- **Default (half, ~45–55%)** — the landing for every re-live: glowing map above, memory below. "Together" is the primary path. Drag handle at the sheet top.
- **Expanded (~85%)** — photos dominate; a sliver of glowing map stays visible.
- **Full** — memory fills the screen for photo immersion; pull-down or "▾ back to map" returns.
- **Hard rule: full-screen is user-CHOSEN via drag, never the landing state.** The old "takeover" alternate is merged into this top snap, not a separate screen.

**Medium width (~768–1023px, e.g. tablet portrait).** Use the **split-panel** model (the docked-right memory panel), not the bottom sheet — the split threshold drops to **~840px** so tablet portrait gets the desktop layout. Below ~840px → bottom sheet.

**Phone landscape.** The three-snap half sheet is unusable in landscape (~375px tall → a ~180px letterbox). Instead, use a **side layout**: memory docked to one side (split-panel-like), map beside it — same content, no half-snap. If width is too tight even for that, collapse to a **two-snap** sheet (half + full), dropping Expanded.

**Keyboard open (writing a note).** Focusing a text field **forces the sheet to Full (a dedicated compose state)** and **disables snap-drag while editing** (so a drag is unambiguously scrolling the note, not moving the sheet); the input is pinned above the keyboard. iOS Safari PWA `visualViewport` / `100vh` handling is a known build constraint to honor here.

**Gestures & primitives:**
- **Tap empty land to mark** that region visited (no panel — quiet fill confirmation). **Tap a pin to open** its memory. The deliberate **"+ add memory / pin" affordance** enters drop mode, then a tap lands and names a pin. Three unambiguous acts: tap-land = mark region, tap-pin = open memory, +affordance-then-tap = drop a named pin.
- **Region marking is not a memory** — it's the trophy fill; the memory lives on the pin. A region's visited state also **rolls up** from any pin it contains.
- **Unmark / delete** is not a plain tap — removing a region or deleting a pin lives in the opened panel / region menu ("Remove this place" / delete the pin), with a gentle confirm for anything holding real content. This protects against misclicks during rapid backfill without making tap ambiguous.
- **Drag** the sheet between snap points; pinch/scroll to zoom the map across the three tiers (pins fade in zoomed-in, cluster when dense). A full-screen photo viewer captures horizontal swipe, so photo-swipe never collides with sheet-drag or map-pinch.
- **"Add details later" everywhere** — every memory entry point is an optional invitation, never a gate.

**Banned:** slideshow-first re-live, full-screen as a landing, engagement nags, streaks, leaderboards, progress meters, required fields on a memory.

## Notifications & Re-live Trigger

Resolves the PRD's open cadence question. Reference studied: Apple Photos "Memories / On This Day" — curation over completeness.

**Dates stay 100% OPTIONAL. The engine must never go silent for breadth-first / no-date users.** Notification eligibility runs a four-tier model so the loop fires regardless of whether a user ever sets a date:

1. **Explicit user date** → fires on the **anniversary** ("兩年前的今天：京都").
2. **No user date, but photos exist** → use the **first photo's EXIF capture date** as the anniversary date (UJ-3's hot camera roll gives this for free).
3. **No date at all** → fall back to the **entry-created date**, surfaced as **"added N year(s) ago"** rather than an anniversary.
4. **No date signal of any kind** → a gentle **"rediscovery"**: on a slow cadence (≈monthly, far below the daily ceiling) the engine resurfaces a **random older place** the user marked. Still curated, still mutable, still off-switchable.

This means even the median breadth-first user — 40 countries marked, nothing else added — keeps getting pulled back via tiers 3–4; the loop never depends on a date being set. **Note:** resurfacing a user's own older place is **not an "invented occasion"** — the banned thing is fake/external occasions ("it's National Map Day"), not "a real place of yours, resurfaced." Rediscovery honors the "memory resurfacing, never a nag" contract.

- **Curated, max ONE per day.** Hard daily ceiling across all four tiers. Anniversaries (tiers 1–2) fire first; tier-3/4 surfacings fill the quiet stretches on a slow cadence so the engine never goes silent, while most days still stay quiet. Thin/low-value entries are skipped so every buzz is worth it.
- **No engagement nags ever.** No "you haven't opened Mapsake," no invented occasions. A notification is a real memory resurfacing.
- **Multiple matches same date → pick one, hint at the rest.** Names one place; landing surfaces "N more from this day."
- **Tie-breaker [DEFAULT, revisitable]:** oldest memory wins (more years-ago = more emotional); photos as a secondary tiebreaker so it leads somewhere visual.
- **Default delivery time [DEFAULT, revisitable]:** evening (the quiet couch re-live mood). User-changeable in settings.
- **Per-memory / per-place MUTE** — "feature this place less / mute this memory." Kindness for places tied to a hard time. Reinforces "for yourself, on your terms."
- **Global off switch** in settings. No dark patterns.
- **Deep-link to map + memory together** (photos present) — lands on the layout model above, never a bare list.

## Map & Localization

- **Three zoom tiers:** world → country → admin-1 (states/provinces/counties). One continuous map, no mode toggle.
- **Region fill is the at-a-glance "trophy" layer; pins are the memory layer.** Region fills carry the view at coarse zoom; **memory pins fade in once you zoom into a region** and recede again as you zoom back out. **Dense pins cluster into a count bubble** at coarser zoom (standard MapLibre clustering); zooming in splits the cluster back into individual pins.
- **Binary visited state** at country and admin-1 level (visited / not), **rolling up** from contained pins (region/country reads visited if explicitly marked OR if it contains any pin / visited child; **no downward cascade**). No partial fills, no intensity scale.
- **Admin-1 granularity is data-driven** — available where the boundary dataset provides it; otherwise the country level is the finest grain. (Dataset specifics are an architecture decision.)
- **Chinese map labels** where the boundary dataset provides them (台灣 + its counties/municipalities, 日本/京都, etc.); English/endonym fallback where Chinese is unavailable.
- **Taiwan-respecting border/label UX stance:** respect the Taiwan-user perspective — Taiwan as a distinct entity with its own admin-1 regions. The specific dataset/border choices are deferred to architecture/data; this is the UX stance to carry in.

## Accessibility Floor

Modest floor appropriate to a private personal keepsake; not over-built. Visual contrast values live in `DESIGN.md`.

- **Redundant non-color cue for visited state (the one Mapsake-specific a11y risk):** visited = terracotta `{colors.region-visited-fill}` **+ an always-on subtle texture/hatch** (`{components.region-visited.texture}`). Visited is never signaled by color alone. (Decided: Option A, texture — cartographic standard, validated against deuteranopia simulation.)
- **Screen-reader / keyboard model:** the map is a **single focus stop** (an interactive canvas), and **"Places visited" is the canonical keyboard + screen-reader path** for browsing and opening memories. This deliberately does NOT attempt full per-region polygon keyboard navigation — the list view is the accessible equivalent, which both closes the gap and avoids over-building.
- **Text/list alternative to the map** ("Places visited") — also doubles as a plain browse view for everyone.
- **Honor `prefers-reduced-motion`:** fly-to and the re-living glow degrade to a gentle fade.
- **Tap targets ≥ ~44px** for interactive controls; small admin-1 regions stay selectable via zoom and/or tap-assist (the list view is the reliable fallback for hard-to-hit regions).
- **Text scaling** without breaking layout, including **CJK up to ~200%** (primary language is zh-TW); **visible focus states**; reading-order focus traversal.
- **Contrast floor: text AA 4.5:1; meaningful non-text 3:1.** The hybrid contrast fix in `DESIGN.md.Colors` brings all key pairs — including the `{colors.region-border}` unvisited separator (now 3.03:1) and `{colors.text-muted}` dates — to AA (verified table there). AA is the ceiling; no AAA / APCA over-build.

## Key Flows

The named journeys are the PRD's. The onboarding/depth **bet** runs through all three: users mark **breadth-first**, add **depth later** (mostly via the re-live loop). Onboarding optimizes for fast marking and **never pushes memory entry**; the fresh-trip path is the deliberate exception.

### UJ-1 — First fill-in (onboarding + backfill)

1. New user lands; onboarding asks the **default-view question** (whole world vs. focus on one country).
2. Drops into a blank parchment map with the soft "Tap anywhere you've been to begin" invitation.
3. User **taps rapidly to mark** regions visited — marks only, **no inline memory prompts** during backfill. (They can also **drop named pins** for places they recall precisely, but backfill never pushes it.)
4. The map fills with terracotta as they go.
5. At the end, **one gentle, skippable line** — "Tap any place to add a pin, photos and notes whenever you like."
6. **Climax:** the user drops into their freshly colored map — a personal atlas of where they've been, built in a couple of minutes. The filled map is the payoff; depth can come later.

Note: the bare visited mark is *complete*, not a compromise — this is the design's correct default.

### UJ-2 — The re-live loop

1. On a real anniversary, a single evening notification: "兩年前的今天：京都" (one place, illustrative).
2. User taps it.
3. **Deep-link lands on map + memory together:** the map flies to the **pin** (zooming into its region so the pin is visible), the **pin glows** (`{colors.accent}`) inside its glowing region, and the pin's memory opens simultaneously — desktop right panel, or the phone sheet at its **default half snap**.
4. User reads the note, looks at the photos. On phone they may **drag up** to Expanded or Full for immersion.
5. If there were others that day, "N more from this day" is offered on the landing.
6. **Climax:** a moment they hadn't thought about in two years is back in front of them — unprompted, specific, theirs. No feed to scroll, no task to complete.

Reduced-motion: the fly-to/glow becomes a gentle fade; the same memory still lands.

### UJ-3 — Fresh-trip logging (the deliberate exception)

1. User returns from a recent trip with a hot camera roll.
2. They **drop a named pin** where they went — tap the spot, type its name — then open it. (v1 is tap-placed + named; city search/autocomplete is a deferred enhancement.)
3. **Depth entry is frictionless and prominent here** — eager batch photo upload, note, date — the opposite emphasis from backfill. Two moments, two emphases.
4. Photos and note attach to the pin; date optional as always. The pin's region now reads visited by roll-up.
5. **Climax:** the just-lived trip is captured while it's fresh, and the pin now glows on the map ready to resurface on a future anniversary — closing the loop back into UJ-2.
