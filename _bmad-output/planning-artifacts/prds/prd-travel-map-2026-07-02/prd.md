---
title: "PRD: Mapsake v2 (native iOS)"
status: final
created: 2026-07-02
updated: 2026-07-02
---

# PRD: Mapsake v2 — 私人旅行時光膠囊

## 1. Vision

**Mapsake 是一個私人旅行時光膠囊。** Mapsake v2 is a private travel time capsule, now a native iOS app. You log a trip after you come home — search the place, set the date, keep the photos — and it locks into your map. Then, quietly, on the right evening, a memory comes back to find you: a photo from this day, years ago. You open it, linger, and close it satisfied.

No followers, no streaks, no percentages. Two speeds, one promise: **fast to lock in, slow to savor.**

### Why v2

v1 shipped as a web PWA (live at mapsake.simon198.com) and proved the product's soul end-to-end: the re-live push loop works. It also proved the ceiling of the platform: iOS treats web push as a second-class citizen (the subscribe step failed on the founder's own iPhone), and a mobile-web UI never feels like an app. v2 moves the primary experience to native iOS, where the notification — the product's heartbeat — is first-class and photo-rich, and where the UI can be rebuilt to the standard the product deserves.

### Positioning

Every comparable is social-first (Polarsteps, Pin Traveler), completion-gamified (been, Visited, Skratch), or planning-focused (Wanderlog). None combines **private-by-default + daily memory resurfacing + place-centric multi-visit history**, and none is zh-TW-first. Mapsake owns that intersection. (Landscape: `research-comparables.md`.)

### Relationship to v1

The v1 web app **stays running** against the same backend, as the anonymous, try-before-you-install front door. The native app is the retention surface. The backend (Supabase, eligibility engine, cron sender, auth) carries over; backend changes for v2 must keep the web client working — including its **write paths** (web users still create and edit pins). `[ASSUMPTION]` The web client receives no new features during v2 development — maintenance only. Post-v2, if the native model proves out, the web app is a candidate for a rewrite aligning it to v2's interaction model (read-only map, memories-only writes, multi-visit) — Simon's stated intent, not a v2 deliverable.

## 2. User Journeys

The protagonist of UJ-1–3 is Simon — the founder is the primary user (stakes: personal + published).

### UJ-1 — Logging the trip (the capture ritual)

Simon is home, a week after a trip. The photos sit in his camera roll. He opens Mapsake to log the journey — *he does not capture during trips; capture is a post-trip ritual.*

1. He **searches** for a place he visited ("清水寺") — no zoom-hunting. The map flies to it.
2. He confirms the spot (a fine-tune drag if the pin needs nudging) — the place is added as a **visit**.
3. He sets the **visit date**. The photo picker leads with **photos taken around that date** (on-device library metadata); he confirms the ones he wants. Suggestion, never forced.
4. A **save moment** — a short animation confirms the memory is locked in.
5. He chooses: **add the next place** immediately, or glance back at the map.
6. When he ends the session, a **recap** shows everything just logged — the trip visibly settled into his map.

Each place takes seconds; a ten-place trip is a pleasure, not data entry.

### UJ-2 — The re-live moment (the soul)

A random evening, months later. A notification arrives: **「兩年前的今天」 with a photo from that day** as its image — the photo is what earns the tap. Tapping opens the map on **that date's visit**: its note, its photos. Simon reads, swipes through, maybe drifts to a nearby pin — then **closes the app satisfied**. No streak to maintain, no feed to scroll. The satisfaction is the retention.

### UJ-3 — The deliberate visit (the browse)

A quiet moment; Simon just wants to look. He opens to **his map** and wanders, or **searches a place he's visited** to jump straight there. When he browses the full collection, it reads **geographically — continent → country → region → place** — a surface reached through obvious, first-class navigation (v1 hid it behind an unlabeled button; v2 does not).

### UJ-4 — The first run

雅婷, a friend in Taipei, installs Mapsake. She sees a **short, warm introduction** (2–3 screens), signs in with **one tap (Apple, Google, or email)** — the app is signed-in-first, no anonymous mode — and is guided to **log one real memory**: a place she loves, a date, a few photos, the save moment, the recap. *Now* the app asks, in context: 「開啟通知，重溫你的旅行」 (Simon-approved copy — the reference tone for the FR28 voice guide) — and only then triggers the one-shot iOS notification permission prompt. She leaves with one memory locked in and a reason to return in a year. *(All zh-TW copy in this document is an illustrative placeholder unless marked Simon-approved — final copy is written to the FR28 voice guide and approved by Simon.)*

## 3. Features & Requirements

*(Implementation constraints inherited from v1 — PMTiles, the `pin-photos` bucket, the server-side engine — appear where load-bearing and are constraints, not designs; details in the Addendum.)*

### Group A — The Map

- **FR1.** The map renders the world with Mapsake's parchment identity (region fills, visited roll-up) using the v1 tile pipeline (PMTiles), at native map-app fluidity — pan, pinch-zoom, and pin interactions at the bar set by Google Maps on iOS, measured by NFR1.
- **FR2.** Pins cluster and declutter at low zoom — by **geography, not proximity**: zoomed out, each region/country renders one aggregate pin carrying the **count of memories inside it**; tapping it dives into the region. At close zoom, tapping a pin opens its memory. (Upgrade over v1's geometric proximity clustering; cheap to derive — every pin, including legacy web pins, already carries its region/country code. Visual design → UX phase.)
- **FR3.** **The map is read-only outside explicit capture flows.** Tapping always *reads* (open a pin, browse) and never writes; the only write gestures are the deliberate long-press of FR5 and the confirm step inside FR4's search-led capture. Region marking as a user action is **removed on iOS**: the visited fill is fully derived — from the user's memories plus their legacy web region-marks (which iOS reads but never writes; marks remain manageable on the web). Memories are the only way anything gets onto the map. (Resolves v1's overloaded-tap problem and accidental marking outright.)

### Group B — Capture: the logging ritual

- **FR4.** **Place search is the front door of capture**: one search box accepts a place name (zh-TW-first) **or a pasted street address**; the map flies to the exact spot and the user places the pin there. (Promoted from v1's deferred backlog to v2 core; native iOS geocoding makes addresses cheap. Geocoding provider — Apple vs OSM-based, incl. the display-terms nuance with a MapLibre map — is an architecture decision; see Addendum.)
- **FR5.** Direct placement stays possible: **long-press on the map opens "add a memory here"** — the one deliberate map write gesture. Placement (from search or long-press) offers a **draggable fine-tune pin with a reverse-geocoded preview** of the spot before the user confirms.
- **FR6.** **Multi-visit pins**: a pin (place) holds many **visits**, each with its own date, note, and photos. A revisited place accumulates history instead of overwriting it. This is a shared-backend data-model change; the web client must remain functional for reads AND writes (see Addendum).
- **FR7.** Visit dates are explicit but optional (a visit may have no date — the re-live engine's tiers handle dateless memories).
- **FR8.** **Date-led photo suggestions**: once a visit date is set, the picker leads with photos taken around that date. This uses iOS photo-library authorization, requested **contextually at first photo attach** — and the user's choice is honored either way: **full access** (suggestions across the library) or **limited access** (suggestions across the user-selected subset, with an easy manage-selection affordance). All suggestion logic runs on-device. Manual picking is always available; nothing is ever auto-attached. Uploads inherit v1's photo pipeline policy (client resize ~2048px, per-pin and per-user caps shared with the web client).
- **FR9.** **Notes are per-visit** (decided): each visit carries its own note, so the re-live landing shows *that date's* words. The pin's name is place-level.
- **FR10.** **The save moment**: a short, felt animation (+ haptic) confirms each saved memory — "you locked something in."
- **FR11.** The capture loop: after saving a place, the user can immediately add the next, or return to the map. The same loop, run light, is the **backfill mode**: adding multiple name-only ("empty") memories in rapid succession replaces v1's region-tap backfill entirely — an empty memory still colors its region visited.
- **FR12.** **Session recap**: when a logging session ends, a recap presents everything just added (places, dates, photo counts) as the session's payoff beat. `[ASSUMPTION]` "Session end" is inferred (user navigates away from capture) rather than an explicit "end session" button — UX phase decides.
- **FR29.** **Edit and remove** (v1 parity): the user can edit a pin's name; edit a visit's date and note; add or remove a visit's photos; delete a visit; and delete a pin (removing its visits and photos), with calm confirmation for content-bearing deletions (v1's posture). Legacy web region-marks are not manageable from iOS (web-only; see §6).

### Group C — Re-live: the time capsule opens

- **FR13.** The v1 eligibility engine (4 tiers: explicit date → EXIF → created → rediscovery; mute; 1/day ceiling) carries over server-side, extended to multi-visit pins: **each visit's date is an anniversary candidate** ("你第 3 次來到京都" becomes possible). Contentless backfill memories (no date, no photos, no note) are down-weighted or excluded from re-live until they gain content — a batch backfill must never flood the capsule (see Open Questions).
- **FR14.** Notifications are **native APNs push, photo-rich**: the memory's photo appears in the notification (Notification Service Extension). The photo is the tap-earner (Apple Photos Memories mechanic).
- **FR15.** Tapping the notification deep-links to **that date's visit** — the map flies there, the pin glows, the memory opens to the right visit.
- **FR16.** The "N more from this day" cohort behavior carries over from v1.
- **FR17.** Notification controls carry over (enable, global off, mute per place, delivery time) — redesigned as one coherent surface (v1 shipped two contradictory controls).
- **FR18.** `[ASSUMPTION]` **"On this day" home-screen widget** is IN scope for v2 as a stretch goal (photo + "N 年前" caption, deep-link to the pin; Day One pattern): ship v2.0 without it only if it threatens the launch date. Decide finally at epic planning.

### Group D — Browse: the collection

- **FR19.** The full collection is reachable from **obvious, first-class navigation** — never hidden behind an unlabeled control.
- **FR20.** The collection organizes **geographically: continent → country → region → place**, replacing v1's flat alphabetical list. (No trips entity — geography is the organizing spine.)
- **FR21.** Search serves browse as well as capture: searching a *visited* place jumps to it.
- **FR22.** The photo viewing experience meets the bar of Apple Photos for the basics: fast, fluid, swipeable, **pinch-to-zoom** (deferred in v1; table stakes in a native gallery — decided IN).
- **FR31.** **Offline read** (v1 parity, natively): previously viewed content — the base map, the user's pins, loaded memories and photos — remains browsable without connectivity. Capture and sync require a connection; the app says so calmly (v1's read-only posture).

### Group E — Account & first run

- **FR23.** **Signed-in-first**: the app requires sign-in after the warm intro. **Sign in with Apple + Google + email (magic link)** — Apple is mandatory per App Store rules; email restores v1 parity so every existing web user has a path in. Returning web users are steered to their original method (「用過網頁版？用同一種方式登入」), and same-email identities link to one account. A Hide-My-Email Apple sign-in must not silently fork a new account for an existing user (identity-continuity requirement; mechanics → architecture).
- **FR24.** First-run flow: warm intro (2–3 screens) → one-tap sign-in → **guided first memory** (a real memory with note + photos — replaces v1's region-backfill payoff) → recap → **contextual notification permission ask** (primed pre-prompt; the OS prompt fires only after visible value).
- **FR25.** Accounts are the same Supabase accounts as the web — a user who used the web app signs into the **same map** on iOS, whichever sign-in method they originally used (see FR23's continuity requirement).
- **FR30.** **In-app account deletion** (App Store 5.1.1(v)): reachable from Settings; deletes the account and all its data — with clear messaging that the same map disappears from the web app too — and revokes the Sign in with Apple token on deletion.

### Group F — Care & settings

- **FR26.** Settings — and the **account surface** — are **designed screens**, not stacked functions: account (incl. deletion per FR30), notifications (one coherent control surface per FR17), default view, muted places, export, language. The app opens to the user's map framed to their **saved default view** (world by default) — the v1 landing behavior carries over.
- **FR27.** Export-my-data carries over from v1.
- **FR28.** zh-TW is the first language of every surface, written in a **native Taiwan voice — never translation-shaped Chinese**. Process requirement: the UX phase produces a **語感 voice guide** (tone, register, reference phrasing — including the product's capture verb: the "lock it in / seal it into the capsule" concept Simon consistently uses) before screens are written; all shipped copy is drafted against it and **reviewed by Simon (the native arbiter) before implementation**. Any zh-TW strings in this PRD are illustrative placeholders unless marked Simon-approved. `[ASSUMPTION]` English ships post-v2, as on web.

## 4. Non-Functional Requirements

- **NFR1. Fluidity:** map pan/zoom and photo browsing sustain 60fps on an iPhone 12-class device; capture flow interactions respond < 100ms.
- **NFR2. Notification delivery:** ≥ 99% of eligible sends are accepted by APNs (with failures logged and dead tokens pruned); the photo attachment renders on the lock screen, with graceful text-only fallback per APNs constraints.
- **NFR3. Privacy:** photo-library authorization is requested contextually (FR8) and honored at the user's chosen level (full or limited); all suggestion logic runs on-device; photos leave the device only as the user's explicit uploads. No analytics SDK in v2 — Sentry crash reporting only (which also provides SC5's crash-free measurement).
- **NFR4. Durability:** no memory is ever lost by the app — writes are acknowledged before "saved" is shown (v1's durable-write posture carries over).
- **NFR5. iOS floor:** `[ASSUMPTION]` iOS 17+ (SwiftUI-maturity floor for the chosen stack; architecture ratifies component details, not the stack itself — see Addendum).
- **NFR6. Backend compatibility:** every backend change ships without breaking the live web client — reads AND writes (web users still create/edit pins during v2).
- **NFR7. App Store readiness:** passes App Review — Sign in with Apple (FR23), in-app account deletion (FR30), truthful privacy nutrition labels (§7).
- **NFR8. Accessibility floor** (v1 parity, natively): VoiceOver labels on all surfaces, Dynamic Type (including zh-TW scaling), Reduce Motion honored (the FR10 save animation included), AA contrast on the parchment palette, ≥ 44pt touch targets, visited-state never conveyed by color alone.

## 5. Success Criteria

Personal + published stakes — quality bars, not growth targets:

- **SC1.** Simon logs a real trip through UJ-1 and rates the ritual "a pleasure, not data entry."
- **SC2.** Simon receives a photo-rich re-live notification on his own iPhone (the moment v1 never delivered to him) and the landing matches UJ-2.
- **SC3.** The app is live on the Taiwan App Store under the 私人旅行時光膠囊 positioning.
- **SC4.** A first-time user (not Simon) completes UJ-4 unaided: intro → sign-in → first memory → notification opt-in.
- **SC5.** Crash-free sessions ≥ 99.5% in the first month (measured via Sentry, per NFR3).
- **Counter-metric:** mute rate stays low — fewer than 20% of notified users (server-side: users sent a push in the trailing 30 days) mute a place or disable notifications. The capsule must feel curated, never spammy. If people silence it, the soul is failing.

## 6. Scope

### In (v2.0)
Everything in §3, on iPhone, App Store-published, zh-TW.

### Out (explicitly)
- Social features, sharing, followers — against the product's soul.
- Trips as an entity; gamification/completion percentages.
- **Notification scarcity/pressure mechanics** — Timehop-style 24h expiry, "you haven't looked" nudges, multi-per-day sends: considered and rejected; the 1/day ceiling and calm cadence are the product's chosen posture.
- **Live Activities** — considered and rejected for v2 (no fit; the only candidate use, an "on a trip" session, contradicts the post-trip capture model).
- Android, iPad-optimized layouts (SwiftUI written adaptively so iPad is a later layout pass), Apple Watch.
- English locale (post-v2), offline *capture* (offline read is IN per FR31), HEIC edge cases beyond what the native picker solves for free.
- Managing legacy web region-marks from iOS (web-only; iOS derives and displays them read-only per FR3).
- Monetization: v2 ships **free**. `[ASSUMPTION]` Pricing (lifetime-unlock pattern fits the category) is a post-launch decision; research parked in the addendum.
- Cross-account merge (v1's 2-8) — mooted on iOS by signed-in-first; stays a web-only backlog item.

### Open questions (phase-blockers marked ⛔)
- ⛔ **Multi-visit data model + full web compatibility strategy** — architecture phase. Scope now explicitly includes: web WRITE-path compatibility (web still creates/edits pins; `memory_date` must stay writable or be trigger-bridged), per-visit engine semantics (anniversary per visit; contentless down-weighting per FR13), iOS deriving visited from memories ∪ legacy web marks (read-only), and cross-channel push behavior (the per-user daily ledger already caps one notification/day across web-push + APNs fan-out — verify, don't assume). (FR6, NFR6)
- **Empty-memory placement granularity** — a backfill memory of "Japan, ten years ago" shouldn't demand false point-precision; region-level placement (e.g., pin bound to a region rather than exact coords) — UX + architecture. (FR11)
- **Graduated re-live curation** — beyond binary place-mute: per-visit "show this less" feedback (research: Photos-style controls; multi-visit makes place-mute coarser) — UX phase. (FR17)
- **EXIF location metadata in uploads** — uploaded photos can carry GPS EXIF; strip at upload vs declare in the privacy label — architecture. Until decided, §7 declares it. (FR8, §7)
- Widget in/out of v2.0 — epic planning (FR18).
- **Late-arriving v1 gripes** — Simon marked his design-gripe intake "not finished"; sweep for additions before the UX phase starts.

## 7. App Store Presence

- **Name/subtitle:** Mapsake — 私人旅行時光膠囊. `[ASSUMPTION]` Subtitle keywords target the underserved zh-TW long-tail (足跡地圖, 旅行紀錄, 回憶).
- **Category:** Travel. **Price:** free at launch.
- **Privacy labels (truthful):** photos — library access at the user's chosen level (full/limited), used on-device for suggestions; user-selected photos are uploaded and **may contain embedded location (EXIF) metadata** (unless architecture opts to strip it — see Open Questions). Account: email. The app itself requests **no location permission** — the map never tracks the user.
- Screenshots and copy produced during the UX phase, from the same design system.

## 8. Glossary

- **Pin (place):** a named point on the map — the container. Carries the place name and its region/country codes.
- **Visit:** one dated occasion at a pin — carries its own date, note, and photos (FR6/FR9). A pin holds one or more visits.
- **Memory:** a visit's content — colloquially "a memory" is what the user logs (UJ-1) and what re-live resurfaces (UJ-2). "Contentless memory" (FR13) = a visit with no date, no note, no photos (name-only backfill).
- **Legacy mark:** a v1 web region-mark. Read by iOS for the visited fill; written only on the web.
- **Visited fill:** the derived region coloring — memories ∪ legacy marks (FR3).
- **The capsule / re-live:** the notification loop that resurfaces a memory (Group C).

## 9. Assumptions Index

Single sweep-point for downstream phases; inline tags remain at their sections.

| # | Where | Assumption | Status |
|---|---|---|---|
| 1 | §1 | Web client is maintenance-only during v2 | Open — revisit if v2 slips |
| 2 | FR12 | Session end inferred, no explicit button | UX phase decides |
| 3 | FR18 | Widget in scope as stretch | Epic planning decides |
| 4 | FR28 | English ships post-v2 | Accepted |
| 5 | NFR5 | iOS 17+ floor | Architecture ratifies |
| 6 | §6 | v2 ships free; pricing post-launch | Accepted (research parked) |
| 7 | §7 | Subtitle/keyword ASO strategy | UX/launch phase |

*(Resolved and removed from the index: per-place notes → per-visit (FR9); permissionless photo picking → contextual authorization at user-chosen level (FR8/NFR3); pinch-zoom → IN (FR22).)*
