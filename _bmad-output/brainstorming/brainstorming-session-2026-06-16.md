---
stepsCompleted: [1]
inputDocuments: []
session_topic: 'travel-map — a web-first product for logging where you have been, built for remembering after the trip rather than GPS tracking during it'
session_goals: 'Expand the idea space past obvious "color in countries" apps; find a sharp differentiating angle; produce a feature pile to feed a product brief'
selected_approach: 'progressive-flow (AI-facilitated)'
techniques_used: []
ideas_generated: []
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Simon
**Date:** 2026-06-16

## Session Overview

**Topic:** travel-map — a web (later possibly native) product where users record where they have been on a zoomable world map, color in countries/regions visited, and attach notes and photos. Accounts + global↔regional map + place marking are the first-stage essentials.

**Goals:** Shape a still-fuzzy concept. Push past the obvious "scratch-map" version to a differentiating angle, and collect raw feature material for a product brief.

### Context Guidance — Competitive Landscape (researched 2026-06-16)

Category splits into two camps that don't overlap:
- **Color-your-countries apps** (Been, Visited, been.app, Skratch): mobile-only, good at map-filling, weak photos, fragmented/stacked paywalls, recurring data-loss on logout/reinstall.
- **GPS trip-journalers** (Polarsteps, FindPenguins): rich notes/photos but force background GPS tracking (battery, privacy, route bugs), built around live trips.
- Web options (visitedplaces.com) are static image generators — no account, no persistence, no photos.

**Five open gaps identified:**
1. Trust/durability — nobody owns "the safe permanent home for travel memories" (Google Timeline deleted user histories in 2025).
2. Manual-but-rich — Polarsteps-quality notes/photos *without* GPS tracking. Empty middle.
3. Web-first with real region coloring — best trackers are mobile-only; web tools are static.
4. Honest pricing — category is full of stacked paywalls.
5. Geography/geopolitics correctness — recurring errors (Scotland/Wales, Hong Kong, occupied territories).

Monetization patterns: freemium granularity unlocks, annual subscriptions, and the highest-margin model — Polarsteps printed travel books (€36–150).

### Chosen Wedge / North Star

**travel-map is built for remembering, not tracking.** Most people log travel from memory after a trip ends, sitting with a camera roll and fond-but-fuzzy memories. GPS-first apps optimize for the minority who tracked live. This product serves the majority who reminisce afterward. Lands on gaps #2 (manual-but-rich) and #3 (web-first region coloring).

## Idea Generation

### Technique 1: The Remembering Moment (day-in-the-life)

**Raw ideas generated:**
1. Fuzzy time as first-class input ("Spring 2026") — PARKED for v1 (optional date picker likely enough)
2. Camera-roll suggestion by date
3. Region nudge ("which prefectures did you visit?")
4. Messy "brain dump" notes box
5. "Stayed" vs "passed through" shading — CUT (pass-through ≠ visited; keep binary)
6. Two-level logging: country-level memory (photos + text) AND zoom-in region-level (e.g. Kyoto, Osaka) with the same capability — KEEP, core model
7. Date is optional — date picker present, never required — KEEP
8. EXIF auto-detection of GPS + timestamp — DOWNGRADED: EXIF may only quietly pre-fill the date field; it never auto-places photos on the map
9. Drag-folder auto-scatter — CUT as primary flow (accuracy + control concerns)
10. Photo clustering by timestamp into trips — parked
11. GPS-missing neighbor guessing — cut with auto-scatter
12. Manual pin-drop for photo-less memories — keep

**Decisions / refinements (Simon):**
- **Upload model:** user explicitly selects/zooms to a region, then uploads photos + notes TO that selected region. Manual and intentional. No auto-tagging from metadata. User keeps full control.
- **No pass-through state.** Binary visited / not-visited.
- **Possible alt state to revisit later:** "want to go" / wishlist (dream board), more valuable than pass-through.
- **Date:** optional picker. Fuzzy-granularity parked unless a timeline view becomes a headline feature.

### Technique 2: The Payoff (emotional reward / retention)

**Raw ideas:**
13. "On this day" resurfacing (memory + photo from years ago) — KEEP, core reward
14. Per-region "memory view" — click a country/region, replay photos + notes as a story — KEEP, core
15. Year-in-review auto-assembled recap — parked (nice-to-have)
16. Map-as-trophy (wallpaper/print-worthy filled map) — DELAYED to later feature
17. Shareable public map link — DEPRIORITIZED (see positioning decision)

**Defining decision (Simon) — POSITIONING:**
- **travel-map is a PRIVATE, personal memory keeper, not a social / show-off product.** Users already share trips on other social media; this is the quiet place they return to for themselves. Differentiates from the entire category (Been/Visited/Polarsteps all lean social/compare/leaderboard).
- **Core reward = re-living, not measuring.** "On this day" + per-region memory replay are the heart.
- **Re-engagement via notifications** that pull users back to revisit what they logged.
- Stats/% and trophy-map: later. Sharing: not a v1 priority.

### Crystallized Concept

travel-map — a private, web-first travel memory keeper. Zoomable world map filled at two levels (country → region). Log trips *after* they happen by selecting a place and adding photos + notes intentionally, with full control. Dates optional. Reward is re-living: "on this day" resurfacing + per-region memory replay + gentle notifications. Not social, not stats-driven.

### Technique 3: Cold-start & first-run (the empty-map problem)

**Raw ideas:**
18. First session = fast "tap all countries you've been to" → instant filled map — KEEP (onboarding)
19. "Add details later" always fine; a country is never "incomplete" — KEEP, core theme
20. Log one trip at a time on your schedule — accepted (no pressure), but "scheduling" framing rejected (this is a memory keeper, not a planner)
21. Gentle "you marked Japan but added no memories" nudge — keep (ties to notifications)

**Decisions (Simon):**
- **Onboarding:** new user selects already-visited countries via the map view AND/OR a country dropdown list. Quick first pass.
- **"Add details later" is a top theme.** Users won't have time to document fully on first go; the product must never punish a bare entry.
- **No planner/scheduling features in v1.** This is a memory keeper. Revisit only if users ask.
- **One continuous map:** global and regional are the same map via fluid zoom/navigation, not two modes the user toggles. (To confirm.)

## Convergence — Organized Output

### Concept (one line)
A private, web-first travel memory keeper: fill in a zoomable world map (country → region) with photos and notes logged *after* trips, and re-live them through resurfaced memories.

### MVP candidates (v1)
- Accounts (signup/login, reliable cross-device persistence — directly answers the category's #1 data-loss complaint)
- One continuous zoomable map: world view → country → sub-regions (fluid zoom, no mode toggle)
- Mark a country/region as visited (binary visited / not)
- Per-place memory: upload photos + write notes, attached to the explicitly selected country or region
- Optional date field (date picker, never required)
- Onboarding: quick "tap the countries you've visited" (map + dropdown), instant filled map
- "Add details later" everywhere — bare entries are first-class, never flagged incomplete
- Manual pin/mark for memories without photos

### Reward / retention (v1 or fast-follow)
- "On this day" resurfacing of past memories
- Per-region "memory view" — replay a place's photos + notes as a little story
- Gentle notifications nudging users back (revisit, or add memories to bare entries)

### Later / parked (post-feedback)
- "Want to go" / wishlist state (dream-board layer)
- Map-as-trophy: wallpaper / printable map (note: print is the category's highest-margin model — Polarsteps books)
- Year-in-review recap
- Fuzzy-time granularity (season/year, not just exact date)
- EXIF: quietly pre-fill the date field from a photo (never auto-place on map)
- Photo clustering into trips
- Native mobile app (web-first to start)
- Sharing / public map link (deliberately deprioritized — product is private by design)

### Positioning summary
Private over social. Remembering over tracking. Manual + intentional over auto-GPS. Web-first. Trustworthy, durable home for travel memories.

### Decision — One map + adaptive default home view
Resolves the "empty global map demotivates domestic travelers" risk.
- **Data model: ONE continuous zoomable map, shared data.** Never two separate maps. The country/region view is just the world map zoomed in. No mode toggle.
- **Default "home view" is user-chosen.** Onboarding asks: default to the **world map** or a **country (home) map**.
- **Changeable in the settings page** anytime.
- **On login, the user lands on their selected default** (world, or their chosen country).
- **Bonus:** completion stats become relative to the user's world — e.g. "38 of 50 states" for a domestic traveler vs "24 countries" for an international one — so neither feels empty.
