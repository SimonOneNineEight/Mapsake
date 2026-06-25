---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-06-20'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-06-16/prd.md
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-06-16/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-06-16/DESIGN.md
---

# Mapsake (travel-map) - Epic Breakdown

## Overview

This document decomposes the PRD, UX Design, and Architecture into implementable stories. Core unit = a **named pin** (lat/lng) within an admin-1 region; region fill is the at-a-glance layer with visited rolling up from pins/marks. Stack = Next.js 16 + Supabase + Vercel; zh-TW-first; light-only v1.

## Requirements Inventory

### Functional Requirements

**A. Accounts & Durability**
- FR1 — Sign up / sign in to a personal account.
- FR2 — Data persists durably; survives logout, reinstall, device change.
- FR3 — Map and memories sync across devices.
- FR4 — User can export their own data.

**B. The Map**
- FR5 — One continuous zoomable map (world → country → admin-1), shared data, no mode toggle.
- FR6 — Mark visited (binary) at country + admin-1; visited also derives (rolls up) from a contained pin/visited child; no downward cascade.
- FR7 — Visited renders filled (explicit or rolled-up); unvisited stays plain.
- FR8 — At login, land on the chosen default view (world or focus country).

**C. Place Memories (core unit = named pin)**
- FR9 — Place a memory pin by tapping a spot + naming it; lands at tapped coords.
- FR10 — Multiple named pins within the same admin-1 region.
- FR11 — Attach photos to a pin.
- FR12 — Write a note on a pin.
- FR13 — Optional date on a pin (date picker); never required.
- FR14 — Per-pin memory view (name, photos, note, date).
- FR15 — "Add details later" everywhere; a bare mark (region or pin) is complete, never flagged incomplete.
- FR24 — Search a place by name and place a pin snapped to its true coordinates (geocoding), alongside tap-to-place (FR9). **In v1** (added 2026-06-20).

**D. Onboarding**
- FR16 — First asks default view (world, or focus country → pick country).
- FR17 — Rapid tap-to-mark backfill adapting to the chosen view.
- FR18 — Change default view later in settings.
- FR19 — Prompt PWA install (home screen) so notifications reach the user, incl. iPhone.

**E. Retention / Re-live Loop**
- FR20 — Detect "on this day" pins (recorded date matches current day in an earlier year).
- FR21 — Deliver a notification with specific memory text (place + how long ago); never an engagement nag.
- FR22 — Tapping the notification lands on map + memory together (map zoomed to the pin/region, pin highlighted, memory open).
- FR23 — From the landing, freely wander and re-live other pins.

### NonFunctional Requirements
- NFR1 — Durability & reliability: no data loss under any normal operation. Top quality bar.
- NFR2 — Privacy by design: a user's map/memories visible only to them; no social exposure in v1.
- NFR3 — Sync consistency: edits propagate without conflicting states that drop data.
- NFR4 — Performance/fluidity: smooth map zoom/pan; fast memory and photo loads.
- NFR5 — Web-first, mobile-ready: responsive web/PWA min; API-first backend; no web-only lock-in.
- NFR6 — Photo durability: photos stored durably at adequate viewing resolution.

### Additional Requirements (from Architecture)
- AR1 — **Starter init (Epic 1 Story 1):** `pnpm create next-app --example with-supabase mapsake` (Next.js 16, TS, Tailwind, Supabase cookie-SSR auth).
- AR2 — Supabase project + schema migration (`profiles`, `region_marks`, `pins`, `photos`, `push_subscriptions`) + owner-scoped **RLS** policies + indexes.
- AR3 — Data-access layer (`src/data/`): snake_case→camelCase mappers, Supabase generated types, TanStack Query, **durable-write contract** (saved only after ack), **online-writes-only** (offline read-only).
- AR4 — Map tile pipeline (`scripts/build-tiles.ts`): geoBoundaries ADM0/ADM1 → tippecanoe → **PMTiles**, ISO 3166-2 region codes, **Wikidata zh-Hant label gazetteer baked into tiles**; served from Storage/CDN.
- AR5 — MapLibre render: region fill via **feature-state (roll-up)**, pins GeoJSON + **clustering**, base-map offline cache.
- AR6 — Auth: Supabase **magic-link + Google OAuth**; local-first onboarding + post-payoff account prompt; middleware session + locale.
- AR7 — Photo pipeline: client resize to WebP (~2048px/q80), private Storage bucket + signed URLs/CDN, EXIF date at upload; caps ~2GB/user, ~30/pin.
- AR8 — PWA/offline shell: **Serwist** service worker + manifest + install nudge; cache app shell + base map.
- AR9 — Push subsystem: Web Push/**VAPID**, service-worker handler, per-device subscriptions, **Vercel Cron `on-this-day`** + 4-tier eligibility + max-1/day + mute + global-off + evening default + deep-link.
- AR10 — Data export generation (FR4).
- AR11 — i18n: **next-intl**, zh-TW default, externalized strings, `[locale]` routing.
- AR12 — CI/CD (GitHub Actions: typecheck/lint/test/migrate; Vercel deploy), Sentry; generate `project-context.md` for agent consistency.
- AR13 — **Thin de-risk spike (early):** mark offline → reconnect → confirm durable; render geoBoundaries admin-1 tiles on a real mid-range phone (60fps, file-size budget).

### UX Design Requirements
- UX-DR1 — Implement DESIGN.md **design tokens** into Tailwind theme + CSS variables: light palette, dual-script typography (Newsreader/Nunito Sans + Noto Serif/Sans TC, CJK 1.4 line-height, Latin-only label tracking), spacing, radii.
- UX-DR2 — **shadcn/ui** set up and themed to tokens for chrome: dialog, dropdown/menu, popover, tooltip, switch, toast, form controls.
- UX-DR3 — **Bottom sheet (Vaul Drawer)** with three snap points (half / expanded / full), drag handle, "▾ back to map".
- UX-DR4 — **Responsive layout model:** desktop + tablet (≥840px) split with right-docked panel; phone-portrait sheet; phone-landscape side layout / two-snap fallback; **keyboard-open compose state** (sheet→full, disable snap-drag, visualViewport handling).
- UX-DR5 — **Memory pin marker** (terracotta teardrop, selected glow + scale) and **cluster count bubble**.
- UX-DR6 — **Visited region rendering:** always-on texture/hatch (zoom-stable, screen-space) + small-region pin fallback; roll-up fill via feature-state.
- UX-DR7 — **Empty/quiet states:** blank-map invitation; bare visited mark; region-with-pins vs bare; empty-region "+ add a memory here"; partial memory. "Absence is normal," never a scold.
- UX-DR8 — **Photo batch upload UX:** queued→uploading→done, per-photo inline retry, immediate placeholders, no blocking error.
- UX-DR9 — **Full-screen photo viewer/swipe** that captures horizontal swipe (resolves gesture collision with sheet-drag/map-pinch); pull-down/× closes.
- UX-DR10 — **Save / sync / offline / export UI:** quiet "saved"; offline read-only banner ("viewing only — reconnect to add"); export "preparing your keepsake".
- UX-DR11 — **Accessibility floor:** AA contrast (corrected tokens), redundant texture cue, SR/keyboard model (map = single focus stop + "Places visited" canonical path), `prefers-reduced-motion` fade, ≥44px targets, CJK text scaling ~200%, visible focus.
- UX-DR12 — **Voice & tone microcopy** framework (zh-TW first; quiet/never-nag/invite-not-command); native-fluent zh-TW pass before launch.
- UX-DR13 — **"Places visited" list view** (screen-reader path + plain browse alternative to the map).
- UX-DR14 — **Re-live landing layout** (map + memory together, pin glow, deep-link target).
- UX-DR15 — **Place search / autocomplete UI** (FR24): debounced search input (shadcn combobox/command), candidate list, on-select drops the pin at returned coords + prefills the name; calm empty/error states. Backed by a hosted geocoder (e.g. Photon/OSM or MapTiler) — provider + rate-limit/attribution handling is a build detail.

### FR Coverage Map

- FR1 → Epic 2 (sign up / sign in)
- FR2 → Epic 2 (durable persistence; partial via Epic 1 anon session)
- FR3 → Epic 2 (cross-device sync)
- FR4 → Epic 2 (data export)
- FR5 → Epic 1 (continuous zoomable map)
- FR6 → Epic 1 (mark visited + roll-up)
- FR7 → Epic 1 (visited render)
- FR8 → Epic 4 (land on chosen default view)
- FR9 → Epic 3 (tap-to-place named pin)
- FR10 → Epic 3 (multiple pins per region)
- FR11 → Epic 3 (photos on a pin)
- FR12 → Epic 3 (note on a pin)
- FR13 → Epic 3 (optional date)
- FR14 → Epic 3 (per-pin memory view)
- FR15 → Epic 3 (add details later)
- FR16 → Epic 4 (default-view question)
- FR17 → Epic 4 (rapid tap-to-mark backfill)
- FR18 → Epic 4 (change default view later)
- FR19 → Epic 4 (PWA install prompt)
- FR20 → Epic 5 (on-this-day detection + eligibility)
- FR21 → Epic 5 (memory-text notification)
- FR22 → Epic 5 (deep-link map + memory landing)
- FR23 → Epic 5 (free wandering from landing)
- FR24 → Epic 3 (search-to-place a pin)

NFRs: NFR1 → E1(anon)/E2 · NFR2 → E2 (RLS) · NFR3 → E2 (sync) · NFR4 → E1/E3 + E6 perf pass · NFR5 → E4 (PWA) · NFR6 → E3 (photos).

## Epic List

### Epic 1: See and fill your map (foundation + region marking)
Open Mapsake, see the continuous world → country → admin-1 map, and tap to color the places visited; visited rolls up (region/country derive from contained pins/marks, no downward cascade); state persists server-side from the first tap (Supabase anonymous session). Establishes the project, datastore, tile pipeline, and render.
**FRs covered:** FR5, FR6, FR7 · **Arch:** AR1, AR2, AR4, AR5, AR13 · **UX:** UX-DR1, UX-DR6

### Epic 2: Keep your map (accounts & durability)
Sign in with magic-link or Google, link the anonymous session to a real account, sync the same map across devices, and export your data. The durable-write contract (saved only after ack) and the post-payoff "keep your map" prompt.
**FRs covered:** FR1, FR2, FR3, FR4 · **NFR:** 1, 2, 3 · **Arch:** AR3, AR6, AR10 · **UX:** UX-DR10

### Epic 3: Pin your memories (the core unit)
Drop named pins by tap-to-place or search-to-place, multiple per region, each with photos, a note, and an optional date; the memory panel/sheet, batch photo upload, and the full-screen photo viewer. Delivers the fresh-trip flow (UJ-3).
**FRs covered:** FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR24 · **NFR:** 6 · **Arch:** AR7 · **UX:** UX-DR2, UX-DR3, UX-DR4, UX-DR5, UX-DR7, UX-DR8, UX-DR9, UX-DR15

### Epic 4: First-run & make it yours (onboarding + PWA)
The default-view question, the rapid backfill marking rhythm, landing on the chosen view, changing it later, the PWA install nudge + offline-capable shell, and the "Places visited" list view.
**FRs covered:** FR8, FR16, FR17, FR18, FR19 · **NFR:** 5 · **Arch:** AR8 · **UX:** UX-DR13

### Epic 5: The re-live loop (retention)
"On this day" detection with the four-tier eligibility model, the web-push memory notification, and the deep-link landing on map + memory together with free wandering. Push subsystem, scheduler, and mute/off controls.
**FRs covered:** FR20, FR21, FR22, FR23 · **Arch:** AR9 · **UX:** UX-DR14

### Epic 6: Launch-ready (localization, accessibility, settings, ops)
zh-TW internationalization, the full accessibility floor, voice/tone microcopy, the settings surfaces, and CI/CD + monitoring + project-context generation. (Design tokens and baseline a11y are applied within each epic; this completes the cross-cutting pass and the performance check.)
**NFR:** 4 (performance pass) · **Arch:** AR11, AR12 · **UX:** UX-DR11, UX-DR12

> Dependency flow: E1 standalone → E2/E3 build on E1 → E4 on E1+E3 → E5 on E3+E4 → E6 hardens all. No epic requires a later epic to function. Anonymous-session persistence in E1 protects data before accounts (E2).

## Epic 1: See and fill your map (foundation + region marking)

Open Mapsake, see the continuous map, tap to color where you've been; visited rolls up; state persists from the first tap (anon session).

### Story 1.1: Project scaffold, tokens & deploy pipeline
As the builder, I want the project initialized on the chosen stack and deploying, so that every later story builds on a consistent, live foundation.
**Acceptance Criteria:**
**Given** a clean repo **When** I run `pnpm create next-app --example with-supabase mapsake` **Then** a Next.js 16 + TS + Tailwind + Supabase app runs locally.
**Given** DESIGN.md tokens **When** the Tailwind theme + CSS variables are configured **Then** the light palette and dual-script fonts (Newsreader/Nunito Sans + Noto Serif/Sans TC) are available app-wide.
**Given** a GitHub repo **When** I push **Then** CI (typecheck/lint) runs and the app deploys to Vercel; **And** the Supabase project is linked via env vars with no secrets committed.

> **Split 2026-06-21:** original Story 1.2 ("world map renders with admin-1 tiles") was split into **1.2 (tile pipeline)** + **1.3 (map render + zoom)**; the old "continuous zoom + world landing" story folded into 1.3. Epic 1 remains 6 stories.

### Story 1.2: Admin-1 boundary tiles (data pipeline)
As the builder, I want the worldwide country + admin-1 boundaries built into a single map-tile file with Chinese labels, so that the render story has fast, correctly-labeled geometry to draw.
**Acceptance Criteria:**
**Given** `scripts/build-tiles.ts` **When** it processes geoBoundaries ADM0 + ADM1 through tippecanoe **Then** it outputs one **PMTiles** file with per-feature `iso` (ISO 3166-2), `country`, `name`, and `name_zh` properties.
**Given** the label step **When** it joins **Wikidata** by ISO 3166-2 (`wdt:P300`) **Then** each feature carries a `zh-Hant` label (fallback `zh` → English), baked into the tiles (no runtime lookup).
**Given** tippecanoe simplification (per-zoom, `--detect-shared-borders`) **Then** the PMTiles file meets the size budget (tens of MB) and admin-1 geometry is gap-free.
**Given** Taiwan **Then** it is its own ADM0 with its admin-1 (counties/special municipalities), per the documented stance.

### Story 1.3: Render the map + continuous zoom
As a user, I want a continuous parchment map I can fluidly zoom from world to admin-1, so that I can find the places I've been.
**Acceptance Criteria:**
**Given** the PMTiles from Story 1.2 served from Storage/CDN **When** I open the app **Then** MapLibre renders the parchment-styled map via the `pmtiles` protocol and I land on the world view (chosen-view selection comes in Epic 4).
**Given** the map **When** I zoom **Then** tiers flow world → country → admin-1 with no mode toggle, over shared data; labels show in zh-TW where available, English otherwise.
**Given** a mid-range phone **When** I pan/zoom at admin-1 **Then** it stays smooth (~60fps — the de-risk spike acceptance).
_Depends on: 1.2 (tiles). FR5._

### Story 1.4: Durable anonymous session + marks store
As a user, I want my actions saved from the first tap without signing up, so that nothing is lost before I create an account.
**Acceptance Criteria:**
**Given** a first visit **When** the app loads **Then** a Supabase anonymous session is established.
**Given** migrations **When** they run **Then** `profiles` and `region_marks` exist with owner-scoped RLS and indexes.
**Given** an anon user writing **Then** RLS scopes all rows to their session and no other user's data is readable.

### Story 1.5: Tap to mark a region visited
As a user, I want to tap a region to mark it visited and watch it color in, so that I can record where I've been.
**Acceptance Criteria:**
**Given** the map at admin-1 **When** I tap empty land in a region **Then** it marks visited and fills terracotta + the texture cue (never color alone).
**Given** a visited region **When** I tap its empty land again **Then** it stays visited (no-op; unmark lives elsewhere).
**Given** a mark **Then** it persists to `region_marks` and survives reload (optimistic + confirmed on ack); **And** marking works at country and admin-1 levels.

### Story 1.6: Visited roll-up rendering
As a user, I want a country to show visited when I've marked any region inside it, so that the map reflects my travels without extra taps.
**Acceptance Criteria:**
**Given** an admin-1 region marked **When** I zoom out **Then** its country renders visited (rolled up).
**Given** a country-level explicit mark **Then** the country shows visited but its regions are NOT auto-marked (no downward cascade).
**Given** no marks in a country **Then** it stays plain; **And** roll-up is computed client-side via MapLibre feature-state from the user's marks.

## Epic 2: Keep your map (accounts & durability)

Sign in, claim your anonymous map, sync across devices, export your data; durable-write posture throughout.

### Story 2.1: Sign in with email magic-link
As a user, I want to sign in with a one-time email link, so that I have an account without managing a password.
**Acceptance Criteria:**
**Given** the sign-in surface **When** I enter my email **Then** Supabase sends a magic link and clicking it signs me in.
**Given** a signed-in user **When** the session is established **Then** it is cookie-based SSR and persists across reloads.

### Story 2.2: Sign in with Google
As a user, I want to sign in with Google, so that I can start fast with an account I already have.
**Acceptance Criteria:**
**Given** the sign-in surface **When** I choose Google **Then** Supabase OAuth completes and I'm signed in.
**Given** two sign-in methods exist **Then** neither is the sole path (no single-OAuth lock-in).

### Story 2.3: Claim your map (link anon session to account)
As a user, I want my pre-signup map to become my account's map, so that nothing I built is lost when I sign up.
**Acceptance Criteria:**
**Given** an anonymous session with marks/pins **When** I create or sign into an account **Then** that data is linked to the account (anon → permanent), with none lost.
**Given** the onboarding payoff has landed **When** the "keep your map across your devices" prompt appears **Then** it reads as a quiet keepsake guarantee, never a gate or nag.

### Story 2.4: Cross-device sync
As a user, I want the same map wherever I log in, so that my keepsake follows me.
**Acceptance Criteria:**
**Given** a signed-in user on a second device **When** they open the app **Then** the same map and memories appear.
**Given** a change on one device **When** the other device regains focus or pulls to refresh **Then** it shows the latest (refetch-based; no live Realtime in v1).

### Story 2.5: Save / sync status (durable-write posture)
As a user, I want clear reassurance my edits are saved, so that I trust the app with my memories.
**Acceptance Criteria:**
**Given** an edit **When** it is persisted **Then** the UI shows "saved" only after the server ack (optimistic until then; never claims saved prematurely).
**Given** a transient failure **When** a write fails **Then** the edit is retained with a calm retry, never silently dropped; **And** messaging is durability-first, never implying loss.

### Story 2.6: Export my data
As a user, I want to export everything I've created, so that my memories are mine to take.
**Acceptance Criteria:**
**Given** Settings **When** I request an export **Then** I see "preparing your keepsake," then a downloadable file of my marks, pins, notes, dates, and photo references.
**Given** the export **Then** it contains only my data (RLS-scoped).

### Story 2.7: Merge an anonymous map into an existing account (returning user / second device)
_Carved from Story 2.3 (2026-06-25): the cross-account merge was split out so 2.3 could ship the post-payoff prompt + the already-working in-place claim without introducing a service-role/RLS-bypass surface for a rare edge._
As a returning user signing in on a second device, I want the marks/pins I made on this device to be added to my existing account, so that nothing is lost when my local map meets my account's map.
**Acceptance Criteria:**
**Given** an anonymous session with local marks/pins **When** I sign into an account that already exists (email/Google, `email_exists`/`identity_already_exists`) **Then** I am signed into that existing account (real sign-in, not link-in-place) and its map loads.
**Given** I have local data on this device **When** I sign into the existing account **Then** I am offered a calm, one-time "add this device's map to your account?" choice; accepting merges the local marks/pins (and photos) into the account with conflict-safe rules, and declining leaves the account untouched — never silent loss, never a nag.
**Given** the merge runs **Then** it executes server-side only (a SECURITY DEFINER RPC or service-role route, `SUPABASE_SERVICE_ROLE_KEY` never on the client), re-parents `region_marks`/`pins`/`photos` to the target uid, moves the `pin-photos` storage objects, and resets the userId-keyed caches (or forces a reload).

## Epic 3: Pin your memories (the core unit)

Drop named pins (tap or search), multiple per region, with photos, note, and optional date; the memory panel/sheet, upload, and viewer.

### Story 3.1: Drop a named pin (tap-to-place)
As a user, I want to drop a pin where I went and name it, so that my memory is anchored to the place.
**Acceptance Criteria:**
**Given** a region **When** I use the "+ add memory / pin" affordance and tap a spot **Then** a pin lands at those coordinates.
**Given** a dropped pin **When** I name it (e.g. "京都") **Then** it saves to `pins` (with region_code/country_code from the tapped feature) and opens its memory.
**Given** a plain tap on land (not the affordance) **Then** it marks the region, never accidentally drops a pin.

### Story 3.2: Search-to-place a pin
As a user, I want to type a place name and have the pin placed precisely, so that I don't have to find it on the map.
**Acceptance Criteria:**
**Given** the place-search input **When** I type a name **Then** a debounced geocoder returns candidates.
**Given** I select a candidate **Then** a pin drops at its true coordinates with the name prefilled; **And** empty/error/no-result states are calm, never blocking.

### Story 3.3: Multiple pins per region + pin rendering & clustering
As a user, I want several named pins inside one region shown at their spots, so that distinct city memories don't collapse.
**Acceptance Criteria:**
**Given** a region with multiple pins **When** I zoom in **Then** each pin renders at its location as the terracotta marker.
**Given** dense pins at coarser zoom **Then** they cluster into a count bubble; zooming in splits the cluster.
**Given** zooming out **Then** pins recede and the region fill carries the at-a-glance view.

### Story 3.4: Open a pin → memory panel / sheet
As a user, I want tapping a pin to open its memory, adapting to my screen, so that viewing and editing feel native everywhere.
**Acceptance Criteria:**
**Given** a pin **When** I tap it **Then** its memory opens — desktop: right-docked panel; phone: bottom sheet (Vaul) at the default half snap with drag to expanded/full.
**Given** tablet ≥840px **Then** the split panel is used; below that, the sheet; **And** phone-landscape and keyboard-open behave per the responsive rules (side layout / compose state).

### Story 3.5: Add a note and optional date to a pin
As a user, I want to write a note and optionally set a date, so that the memory carries context.
**Acceptance Criteria:**
**Given** an open pin **When** I write a note **Then** it saves to the pin.
**Given** the date affordance **When** I set a date **Then** it saves; **And** skipping the date is first-class — no required field, no "Date: —".

### Story 3.6: Add photos to a pin (batch upload)
As a user, I want to upload a batch of photos to a pin, so that I can capture a trip's images at once.
**Acceptance Criteria:**
**Given** the camera roll **When** I select multiple photos **Then** they resize client-side to WebP (~2048px/q80), upload to a private Storage bucket, and attach to the pin (metadata in `photos`).
**Given** an upload in progress **Then** placeholders + quiet per-photo progress show; a per-photo failure offers calm inline retry, never a blocking error.
**Given** a photo with EXIF **Then** its capture date is captured (feeds re-live eligibility).

### Story 3.7: Full-screen photo viewer / swipe
As a user, I want to swipe through a pin's photos full-screen, so that I can re-live the trip.
**Acceptance Criteria:**
**Given** a pin's photos **When** I tap one **Then** a full-screen viewer opens and captures horizontal swipe to move between photos.
**Given** the viewer is open **Then** sheet-drag and map-pinch are inactive (no gesture collision); pull-down / × closes back to the memory; **And** photos blur-up/placeholder while loading.

### Story 3.8: Edit / remove + quiet states
As a user, I want to edit or remove memories and regions safely, so that I stay in control without fear of loss.
**Acceptance Criteria:**
**Given** an open memory **When** I edit the note/date or remove a photo **Then** it persists.
**Given** delete a pin or unmark a region **When** it holds real content **Then** one gentle confirm appears; a bare mark removes with no friction.
**Given** a bare pin or region **Then** it renders complete (no "0 photos"/empty slots); an empty region quietly invites "+ add a memory here."

### Story 3.9: Pins roll up into visited
As a user, I want dropping a pin to make its region read visited, so that adding a memory also fills the map.
**Acceptance Criteria:**
**Given** a region with no explicit mark **When** I add a pin inside it **Then** the region (and its country) render visited by roll-up.
**Given** I delete the only pin making a region visited **And** there is no explicit mark **Then** the region returns to bare.

## Epic 4: First-run & make it yours (onboarding + PWA)

A fast, calm first run that lands on a filled map, installable, with a list alternative.

### Story 4.1: Default-view question
As a new user, I want to choose how I see my map first, so that onboarding fits how I think about my travels.
**Acceptance Criteria:**
**Given** first run **When** onboarding starts **Then** it asks "whole world" or "focus on a country."
**Given** I pick focus **Then** I choose a country and drop straight into its regions; **Given** I pick world **Then** I start on the world map.

### Story 4.2: Land on chosen view + change later
As a user, I want to land on my chosen view and change it later, so that the app opens where I want.
**Acceptance Criteria:**
**Given** a saved default view **When** I open the app **Then** I land on it.
**Given** Settings **When** I change the default view **Then** the new choice takes effect next open.

### Story 4.3: Rapid backfill marking rhythm
As a new user, I want to color in many places fast, so that I build my map in a couple of minutes.
**Acceptance Criteria:**
**Given** backfill **When** I tap regions in sequence **Then** they mark with quiet fill confirmations and no panel interruptions (a fast "marking" mode).
**Given** backfill **Then** memory entry is never pushed; I may optionally drop named pins, but it's not required.

### Story 4.4: Onboarding payoff hand-off
As a new user, I want to end onboarding inside my filled map, so that the payoff is the map itself.
**Acceptance Criteria:**
**Given** the end of backfill **Then** one gentle, skippable line invites adding pins/photos/notes later.
**Given** I finish **Then** I drop into my freshly colored map; the bare marks are complete, nothing is flagged incomplete.

### Story 4.5: PWA install nudge + installable shell
As a user, I want to install Mapsake to my home screen, so that memory notifications can reach me (incl. iPhone).
**Acceptance Criteria:**
**Given** the app **When** Serwist + manifest are configured **Then** it is installable as a PWA with the app-shell cached.
**Given** onboarding **Then** a prominent, dismissible install nudge appears (not nagging).

### Story 4.6: Offline read-only shell + write banner
As a user, I want to view my map offline and be told writes need a connection, so that the app feels reliable.
**Acceptance Criteria:**
**Given** an installed PWA offline **When** I open it **Then** the cached app shell, base map, and already-loaded memories are viewable.
**Given** offline **When** I try to mark/add **Then** write affordances are disabled with a calm "viewing only — reconnect to add" banner, never a hard wall or silent failure.

### Story 4.7: "Places visited" list view
As a user (incl. screen-reader users), I want a list of my places, so that I can browse and navigate without the map.
**Acceptance Criteria:**
**Given** the menu **When** I open "Places visited" **Then** I see my regions and pins as a navigable list.
**Given** a screen reader **Then** the list is the canonical browsing/opening path (the map is a single focus stop); **And** selecting an item opens its memory.

## Epic 5: The re-live loop (retention)

Memories resurface and pull you back to map + memory together.

### Story 5.1: Push subscription & permission
As a user, I want to enable memory notifications, so that my places can resurface.
**Acceptance Criteria:**
**Given** an installed PWA **When** I grant notification permission **Then** a VAPID web-push subscription is stored per device in `push_subscriptions`.
**Given** the service worker **Then** it handles incoming push and shows a native OS notification; **And** iOS requires the installed PWA (handled by Epic 4).

### Story 5.2: On-this-day detection + eligibility
As the system, I want to find which memories qualify to resurface, so that the loop fires even without dates.
**Acceptance Criteria:**
**Given** a user's pins **When** eligibility runs **Then** it applies the four tiers: explicit date → photo EXIF date → entry-created ("added N years ago") → dateless monthly "rediscovery."
**Given** a muted pin **Then** it is excluded; **And** dates remain fully optional — the engine never goes silent for no-date users.

### Story 5.3: Daily scheduler + send notification
As the system, I want to send at most one curated memory notification a day, so that it stays welcome.
**Acceptance Criteria:**
**Given** a Vercel Cron trigger **When** the `on-this-day` job runs **Then** it computes each user's eligible memory and sends one web-push (hard max 1/day).
**Given** multiple matches **Then** one is chosen (oldest wins, photos as tiebreaker) and the rest are hinted; **And** copy is specific memory text, never an engagement nag; default delivery is evening.

### Story 5.4: Deep-link re-live landing
As a user, I want tapping a notification to land me on the memory in its place, so that I'm back inside my map.
**Acceptance Criteria:**
**Given** a notification **When** I tap it **Then** the map flies to the pin (zoomed into its region), the pin glows, and its memory opens simultaneously (panel/sheet) — never a slideshow-first or bare list.
**Given** reduced-motion **Then** the fly-to/glow degrades to a gentle fade; the same memory still lands.

### Story 5.5: Free wandering from the landing
As a user, I want to keep re-living from the landing, so that one memory becomes a few.
**Acceptance Criteria:**
**Given** the re-live landing **When** I tap a nearby pin/region **Then** I re-live that one too, freely.
**Given** other memories share the date **Then** "N more from this day" is offered.

### Story 5.6: Notification controls
As a user, I want to control notifications, so that they stay on my terms.
**Acceptance Criteria:**
**Given** an open memory **When** I mute it/its place **Then** it never resurfaces via notification (still visible on the map).
**Given** Settings **Then** I can set delivery time and turn notifications fully off (no dark patterns).

## Epic 6: Launch-ready (localization, accessibility, settings, ops)

Localized, accessible, settable, and operationally sound for launch.

### Story 6.1: i18n framework + zh-TW strings
As a Taiwan user, I want the app in Traditional Chinese, so that it feels native.
**Acceptance Criteria:**
**Given** next-intl with `[locale]` routing **When** the app loads **Then** zh-TW is the default and all UI strings come from externalized messages (no hardcoded copy).
**Given** dates/numbers **Then** they format per zh-TW; **And** the layout holds for both compact Chinese and wider English (English ready as fast-follow).

### Story 6.2: Accessibility floor pass
As any user, I want the app to meet a sensible accessibility floor, so that it works for me.
**Acceptance Criteria:**
**Given** the corrected tokens **When** contrast is audited **Then** text meets AA (4.5:1) and meaningful non-text 3:1.
**Given** visited regions **Then** the texture cue is present (never color alone); **Given** `prefers-reduced-motion` **Then** motion degrades to fade; **And** tap targets ≥44px, visible focus, CJK scales to ~200%, and "Places visited" is the keyboard/SR path.

### Story 6.3: Settings surface
As a user, I want a settings home, so that I can manage my account and preferences.
**Acceptance Criteria:**
**Given** Settings **Then** I can manage account/auth, notifications (time, global off), language, default view, muted places, and data export.
**Given** dark mode **Then** it is absent as a v1 toggle (Lamplight is documented Phase 2).

### Story 6.4: Performance pass
As a user, I want the map and photos to stay fluid, so that re-living is unbroken (NFR4).
**Acceptance Criteria:**
**Given** a mid-range phone **When** I pan/zoom and open memories **Then** map interaction stays smooth and photos load with placeholders/blur-up.
**Given** the tile file **Then** it meets the size budget; large photo sets load progressively.

### Story 6.5: CI/CD hardening, monitoring & project-context
As the builder, I want quality gates and observability, so that changes ship safely and agents stay consistent.
**Acceptance Criteria:**
**Given** CI **Then** typecheck, lint, tests, and Supabase migrations run on push; Vercel preview deploys per PR.
**Given** runtime errors **Then** Sentry captures them; **And** a `project-context.md` is generated capturing stack, patterns, and conventions for AI agents.
