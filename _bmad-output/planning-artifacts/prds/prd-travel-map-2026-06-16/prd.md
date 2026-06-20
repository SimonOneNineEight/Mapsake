---
title: "PRD: Mapsake"
status: draft
created: 2026-06-16
updated: 2026-06-20
---

# PRD: Mapsake

> **Name:** Mapsake (proposed). _map + keepsake — "the map you keep, for the sake of memory."_ Codename: travel-map. Pending domain/trademark verification before launch (see §7).

## 1. Overview

Mapsake is a private, web-first travel memory keeper. It gives a person one continuous, zoomable world map that they fill in *after* their trips — color the countries and regions they've been, attach the photos and notes that matter, and keep them somewhere durable and personal. It is built for how people actually remember travel: from the couch, weeks later, with a camera roll and a few fond memories.

The product's real job is not logging — it is bringing the user back. An "on this day" notification surfaces a memory ("2 years ago today: Kyoto"), the user taps, and lands back inside their own map. That loop — remember, re-live, occasionally add — is the heart of the product and the thing the category gets wrong.

v1 is personal-first: built by and for the builder (Simon), who wants exactly this and can't find it, with a deliberate path to opening up once it earns return visits. So accounts, privacy, and durability are built for real from day one.

**Out of scope by design:** live GPS tracking, social/sharing features, and native mobile apps. See §6.

## 2. Goals & Success Metrics

Success comes in two stages, matching the personal-first-then-public trajectory.

### Stage 1 — the personal bar (does the loop work?)
- The builder voluntarily returns on days with nothing new to log — opening to re-live, not to record.
- Resurfacing notifications get **opened**, not muted.
- Within a few weeks, the builder has back-filled real travel history because he wanted to.

### Stage 2 — the public bar (does it work for strangers?)
- New users return in week two and beyond — clearing the category's retention cliff.
- Users log more than one trip (a second trip means the first visit earned trust).
- Nobody loses data.

### Counter-metrics (the signals that say we're wrong)
- **Notification mute / disable rate.** If users turn notifications off, the core thesis is failing — and that's worth learning early.
- **PWA install rate.** Low install means the loop can't reach users on their phones (see Risks).
- **Any data-loss incident.** Target is zero; data loss is the cardinal sin of the category.

## 3. User Journeys

Protagonist is **Simon**, the first user. Personal-first is intentional.

### UJ-1 — First fill-in (onboarding + backfill)
Simon signs up. The first thing the app asks: **how do you want to see your map** — the whole world, or focused on one country? He picks *world*. (Had he picked *focus on a country*, he'd choose which, and drop straight into that country's regions.) He then backfills: on the world map he **taps the countries he's been to**, coloring them in fast. He zooms into Japan and, at the **admin-1 level**, taps the prefectures he visited — and for places he remembers more precisely he **drops named pins** (Kyoto, Osaka) right on the spots. He opens one, adds a photo and a note from a trip three years back, skips the date, and closes the app. The bare mark is complete; nothing flags it as unfinished.

### UJ-2 — The re-live loop (the heart)
A year later, Simon's phone buzzes: *"2 years ago today: Kyoto."* He taps. The app opens with the **map flown to the Kyoto pin, the pin glowing inside its glowing region, and the memory panel already open** beside it — the photos he saved, the note he wrote. He lingers, swipes the photos, remembers the trip, and notices he never added the temple from the last day, so he drops in one more photo right there. Then he keeps wandering: zooms out, taps a nearby region, re-lives that one too. Two minutes later he closes the app, having added nothing he was obligated to add and re-lived three places he loves.

### UJ-3 — Logging a fresh trip
Back from Vietnam three weeks ago, Simon opens Mapsake, zooms to Vietnam, and **drops a named pin** on the spot he went — he taps the place on the map and types its name ("Hội An"). He uploads a batch of camera-roll photos onto that pin and writes two sentences. He sets the optional date, or skips it. The pin joins his map (and its province now reads visited by roll-up), ready to resurface in a year.

## 4. Functional Requirements

FRs are grouped by capability. IDs are stable and globally numbered.

### A. Accounts & Durability
*The cardinal sin of this category is data loss; these requirements answer it.*
- **FR1** — A user can sign up for and sign in to a personal account.
- **FR2** — User data persists durably and survives logout, reinstall, and device change.
- **FR3** — A user's map and memories sync across devices; the same map appears wherever they log in.
- **FR4** — A user can export their own data (the trust guarantee: the memories are theirs to take).

### B. The Map
- **FR5** — A single continuous, zoomable map spanning world → country → admin-1 sub-region, over shared data, with no separate modes or map toggle.
- **FR6** — A user can mark a place visited (binary) at both country and admin-1 level. Visited state can also be **derived (rolled up)**: a region reads visited if it has an explicit mark OR contains any pin; a country reads visited if it has an explicit mark OR contains any visited admin-1 / pin. There is **no downward cascade** — marking a country does not mark its regions.
- **FR7** — Visited places render visibly filled/colored (whether explicitly marked or visited by roll-up); unvisited places stay plain.
- **FR8** — At login, the user lands on their chosen default view (world, or a focus country).

### C. Place Memories
*The core memory unit is a **named pin** — a latitude/longitude point a user places inside a region, not one-memory-per-region.*
- **FR9** — A user can place a memory **pin** by tapping a spot on the map and giving it a name (e.g. "Kyoto"); the pin lands at the tapped coordinates. (A search-based path to placement is also provided — see FR24.)
- **FR10** — A user can have **multiple named pins within the same admin-1 region** (e.g. San Francisco, Los Angeles, and San Diego all inside California).
- **FR11** — A user can attach photos to a pin.
- **FR12** — A user can write a note on a pin.
- **FR13** — A user can set an optional date on a pin via a date picker; a date is never required.
- **FR14** — A per-pin memory view shows that pin's name, photos, note, and date.
- **FR15** — "Add details later" applies everywhere: a bare visited mark (region or pin) is a complete entry and is never flagged as incomplete.
- **FR24** — A user can **search a place by name and place a pin snapped to its true coordinates** (geocoding), as an alternative to tap-to-place (FR9). Pulled into v1 (2026-06-20).

### D. Onboarding
- **FR16** — Onboarding first asks the user to choose a default view (world, or focus on a country → then pick which country).
- **FR17** — Onboarding offers a rapid tap-to-mark backfill that adapts to the chosen view: tap countries on the world map, or tap admin-1 regions inside the focus country.
- **FR18** — A user can change their default view later in settings.
- **FR19** — Onboarding prompts the user to add the app to their home screen (PWA install) so memory notifications can reach them, including on iPhone.

### E. Retention / Re-live Loop
*The reason the product exists.*
- **FR20** — The system detects "on this day" memories: pins whose recorded date matches the current day in an earlier year.
- **FR21** — The system delivers a notification carrying specific memory text (place + how long ago), as memory delivery — never an engagement nag.
- **FR22** — Tapping the notification lands the user on **map + memory together**: the map zoomed to the pin (and its region), the pin highlighted, and that pin's memory panel open.
- **FR23** — From the re-live landing, the user can freely wander and re-live other pins across the map.

## 5. Non-Functional Requirements

- **NFR1 — Durability & reliability.** No data loss under any normal operation (logout, reinstall, device switch, app update). Backed by reliable cloud storage and backups. This is the product's top quality bar.
- **NFR2 — Privacy by design.** A user's map and memories are visible only to them. No social exposure, public feeds, or sharing of memory content in v1.
- **NFR3 — Sync consistency.** Edits propagate across a user's devices without conflicting states that could drop data.
- **NFR4 — Performance / fluidity.** Map zoom and pan stay smooth, and memory views and photos load quickly enough to keep the re-live moment unbroken.
- **NFR5 — Web-first, mobile-ready.** Responsive web / PWA at minimum, with an API-first backend so a future native mobile client can reuse it. No web-only choices that would force a rewrite for mobile. (See addendum for architecture detail.)
- **NFR6 — Photo durability.** Uploaded photos are stored durably at adequate viewing resolution.

## 6. Scope

### In, for v1 (web)
- Accounts with durable persistence and cross-device sync (FR1–FR4).
- One continuous zoomable map: world → country → admin-1, shared data (FR5–FR8).
- Binary visited marking at country and admin-1 level, with visited state rolling up from contained pins (no downward cascade).
- **Tap-placed, user-named point pins** as the core memory unit — multiple pins per admin-1 region; per-pin photos, notes, and optional date (FR9–FR15).
- **Search-to-place** a pin by name (geocoding snaps to true coordinates), alongside tap-to-place (FR24).
- Onboarding: choose default view, rapid tap-to-mark backfill, PWA install prompt (FR16–FR19).
- The retention loop: "on this day" detection, memory-delivery notifications, and map+memory re-live landing (FR20–FR23).

### Explicitly out of v1
- **Live GPS tracking** — out by design, not by timeline. It is the opposite of this product.
- **Social features** — sharing, public maps, friends, comparison, leaderboards. Private by design.
- **Native mobile app** — web-first; the stack stays mobile-ready (NFR5).

### Parked / fast-follow (post-MVP)
- _(City SEARCH & autocomplete was pulled into v1 on 2026-06-20 — see FR24 and "In, for v1". The implementation may use a hosted geocoder rather than a self-hosted GeoNames dataset; provider is an architecture/build detail.)_
- Auto-stitched **memory reel/video** from a place's photos + notes.
- **"Want to go" / wishlist** state (dream-board layer).
- **Printable / wallpaper "trophy map"** (note: print is the category's highest-margin model).
- **Year-in-review** recap.
- **Fuzzy-time** granularity (season/year, not just exact date).
- **EXIF date pre-fill** from a photo's metadata (never auto-place on the map).
- **Photo clustering** into trips by timestamp.
- **Sharing / public map links** — deliberately deprioritized; private by design. (Note: "make it public" = open the product to more users, NOT public/social sharing of maps.)

## 7. Risks & Open Questions

> **Scope change (2026-06-20, during architecture):** the core memory unit was changed from one-memory-per-region to a **named point pin** (multiple pins per region; region/country visited rolls up). First-user signal: people remember travel as cities/places, not administrative regions. Tap-placed named pins are v1; GeoNames-backed city search/autocomplete is the deferred fast-follow.

- **[RISK] PWA install is load-bearing for the core loop.** Web push on iPhone requires the user to install the PWA. If users skip the install nudge (FR19), the "on this day" notification never fires on the device that matters most, and the retention loop breaks for them. Mitigation: make the onboarding install nudge prominent; monitor install rate and notification-open rate post-launch. Email-as-carrier was considered and deferred.
- **[OPEN] Map-data sourcing & geopolitics.** v1 needs worldwide admin-1 boundary data. This carries geopolitical sensitivity (e.g. Taiwan, disputed borders). A boundary dataset and a stance on disputed/labeled territories must be chosen. → architecture / data step.
- **[OPEN] Name verification.** "Mapsake" cleared a web/app-presence check, but domain registration (e.g. mapsake.com) and a USPTO trademark search are still pending before launch commitment.
- **[OPEN] Auth method.** Email+password vs. OAuth (e.g. Google) vs. magic link — deferred to architecture.
- **[OPEN] Photo storage envelope.** Per-user storage expectations and limits, and resolution/compression policy — deferred to architecture; matters once the product opens beyond the builder.
- **[OPEN] Notification cadence.** How often "on this day" fires (every qualifying memory? a daily digest? a cap?) to stay a welcome memory and not become noise — to refine in UX.

## 8. Downstream

Technical constraints, the mobile-ready architecture direction, and map-data notes are captured in `addendum.md` for the architecture step. Recommended next: `bmad-ux` (the map UI and the re-live landing deserve real UX design), then `bmad-create-architecture`.
