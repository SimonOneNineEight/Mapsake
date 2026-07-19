---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-07-13'
project_name: 'Mapsake v2 (native iOS)'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-07-02/prd.md
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-07-02/addendum.md
  - _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/mockups/voice-guide.md
predecessor_v1_epics: _bmad-output/planning-artifacts/epics.md
---

# Mapsake v2 (native iOS) - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for **Mapsake v2**, decomposing the PRD (native iOS, `prd-travel-map-2026-07-02`), the UX spines + locked voice guide (`ux-travel-map-2026-07-02`), and the v2 Architecture (`architecture-travel-map-2026-07-09`) into implementable stories. It is separate from v1's `epics.md` (the shipped web app); v2 reuses the same Supabase backend.

## Requirements Inventory

### Functional Requirements

**Group A — The Map**
- **FR1:** Render the world with the parchment identity (region fills, visited roll-up) using the v1 PMTiles pipeline, at native map-app fluidity (pan, pinch-zoom, pin interaction) matching Google Maps on iOS.
- **FR2:** Cluster pins by **geography, not proximity** — zoomed out, one aggregate pin per region/country carrying the count of memories inside; tapping dives in. Close zoom shows individual pins.
- **FR3:** The map is **read-only outside explicit capture** — tap always reads (open pin / dive into cluster), never writes. Visited fill is fully derived (memories ∪ legacy web region-marks, read-only on iOS). Region-marking as a user action is removed on iOS.

**Group B — Capture**
- **FR4:** Place search is the capture front door — one box accepts a place name (zh-TW-first) or a pasted street address; the map flies to the spot.
- **FR5:** Direct placement via **long-press → "add a memory here"**; placement (search or long-press) offers a **draggable fine-tune pin with a reverse-geocoded preview** before confirm.
- **FR6:** **Multi-visit pins** — a pin (place) holds many visits, each with its own date, note, and photos; a revisit accumulates history. (Shared-backend change; web must keep reading AND writing.)
- **FR7:** Visit dates are explicit but **optional** (a visit may have no date).
- **FR8:** **Date-led photo suggestions** — once a date is set, the picker leads with photos taken around it; iOS photo-library auth requested contextually at first attach; **full or limited** honored; all suggestion logic on-device; nothing auto-attached; manual pick always available; uploads inherit v1 pipeline (resize ~2048px, per-pin/per-user caps).
- **FR9:** **Notes are per-visit**; the pin's name is place-level.
- **FR10:** **The save moment** — a short felt animation + haptic confirms each saved memory, shown only after the write is acknowledged.
- **FR11:** The capture loop — after saving, add the next or return to the map; run light (name-only) this same loop is **backfill mode** and an empty memory still colors its region visited.
- **FR12:** **Session recap** — an explicit end (`完成這次記錄`) presents everything just added (places, dates, photo counts).
- **FR29:** **Edit and remove** (v1 parity) — edit pin name; edit a visit's date/note; add/remove a visit's photos; delete a visit; delete a pin (removing its visits and photos), with calm confirmation for content-bearing deletions.

**Group C — Re-live**
- **FR13:** The v1 4-tier eligibility engine (explicit date → EXIF → created → rediscovery; mute; 1/day) carries over server-side, **extended per-visit** (each visit's date is an anniversary candidate); contentless backfill down-weighted/excluded until it gains content.
- **FR14:** Notifications are **native APNs, photo-rich** — the memory's photo appears in the notification (Notification Service Extension); the photo is the tap-earner.
- **FR15:** Tapping the notification **deep-links to that date's visit** — map flies there, pin glows, memory opens to the right visit.
- **FR16:** The **"N more from this day" cohort** behavior carries over.
- **FR17:** Notification controls (enable, global off, mute per place, delivery time) redesigned as **one coherent surface**.
- **FR18:** **"On this day" home-screen widget** — **IN scope for v2.0** (Simon, 2026-07-13: no launch date pressure, so committed; supersedes the PRD's stretch-goal tag). Photo + "N 年前" caption, deep-link to the pin (Day One pattern).

**Group D — Browse**
- **FR19:** The full collection is reachable from **obvious, first-class navigation** (never a hidden control).
- **FR20:** The collection organizes **geographically: continent → country → region → place** (no trips entity).
- **FR21:** Search serves browse too — searching a visited place jumps to it.
- **FR22:** The photo viewing experience meets Apple-Photos basics — fast, fluid, swipeable, **pinch-to-zoom**.
- **FR31:** **Offline read** (v1 parity, natively) — previously viewed base map, pins, memories, and photos remain browsable offline; capture and sync require a connection, said calmly.

**Group E — Account & first run**
- **FR23:** **Signed-in-first** — Sign in with **Apple + Google + email magic-link** (Apple mandatory). Returning web users steered to their original method; same-email identities link to one account; a Hide-My-Email sign-in must not silently fork a new account.
- **FR24:** First-run flow — warm intro (2–3 screens) → one-tap sign-in → **guided first memory** → recap → **contextual notification permission ask** (primed pre-prompt; OS prompt fires only after visible value).
- **FR25:** Accounts are the **same Supabase accounts** as the web — a web user signs into the same map on iOS, whichever method they originally used.
- **FR30:** **In-app account deletion** (App Store 5.1.1(v)) — reachable from Settings; deletes the account and all data (same map disappears from web too) and revokes the Sign in with Apple token.

**Group F — Care & settings**
- **FR26:** Settings and the **account surface** are designed screens — account (incl. deletion), notifications (one surface), default view, muted places, export, language. App opens to the user's map framed to their saved default view (world by default).
- **FR27:** **Export-my-data** carries over from v1.
- **FR28:** zh-TW is the first language of every surface, written in a **native Taiwan voice**; process requirement — the locked 語感 voice guide governs; all shipped copy drafted against it and **reviewed by Simon before implementation** (candidates until blessed).

### NonFunctional Requirements

- **NFR1 — Fluidity:** map pan/zoom and photo browsing sustain 60fps on an iPhone 12-class device; capture interactions respond < 100ms.
- **NFR2 — Notification delivery:** ≥ 99% of eligible sends accepted by APNs (failures logged, dead tokens pruned); photo attachment renders on the lock screen with graceful text-only fallback.
- **NFR3 — Privacy:** photo-library auth requested contextually and honored at the chosen level (full/limited); all suggestion logic on-device; photos leave the device only as explicit uploads; no analytics SDK — Sentry crash reporting only.
- **NFR4 — Durability:** no memory lost — writes acknowledged before "saved" is shown.
- **NFR5 — iOS floor:** iOS 17+.
- **NFR6 — Backend compatibility:** every backend change ships without breaking the live web client — reads AND writes.
- **NFR7 — App Store readiness:** passes App Review — Sign in with Apple, in-app account deletion, truthful privacy nutrition labels.
- **NFR8 — Accessibility floor:** VoiceOver labels on all surfaces, Dynamic Type (incl. zh-TW scaling), Reduce Motion honored (incl. the FR10 save animation), AA contrast on the parchment palette, ≥ 44pt touch targets, visited-state never conveyed by color alone.

### Additional Requirements

_Technical requirements from the v2 Architecture that generate or shape stories._

**Project foundation (Epic 1, Story 1 — the starter):**
- **AR1 — Xcode SwiftUI app + local SPM package.** New iOS App project (SwiftUI, iOS 17.0) + local package `MapsakeKit` with modules `MapsakeModels` / `MapsakeData` / `MapsakeDesign` (extension-API-only on Models/Data) + three targets (App, Notification Service Extension, optional Widget) + **App Group** + Keychain access group + `Package.swift`. SPM deps: `supabase-swift` (from 2.51.0), `maplibre-gl-native-distribution` (6.x, PMTiles); MapLibreSwiftUI DSL pending the map-layer decision.
- **AR2 — Separate dev Supabase project** (free tier allows 2 active) so debug builds + the destructive delete-RPC never touch prod; URL + anon key injected per `xcconfig` (gitignored `Secrets.xcconfig`), never hardcoded.

**Shared-backend migrations (Simon-gated, expand→activate→contract, contract-gated):**
- **AR3 — Additive multi-visit schema (Shape A):** new `visits` table (additional visits only; the `pins` row IS the primary visit) + `photos.visit_id` nullable + owner-scoped RLS mirroring `pins`. `pins.memory_date`/`note` stay web-writable, no bridge trigger.
- **AR4 — Per-visit EXIF aggregate** (`visits.exif_taken_at = MIN(...)`); the pin-level `sync_pin_exif_taken_at` trigger stays untouched.
- **AR5 — `promote_primary_visit` RPC** — `SECURITY DEFINER`, atomic promote-successor + delete + photo-repoint (never client multi-write).
- **AR6 — Server-side photo-object reaping** — DB-triggered, idempotent, covering the new per-visit delete path.
- **AR7 — `apns_device_tokens` table** — owner RLS + `apns_environment` column (sandbox vs prod); iOS owns the token write path via `MapsakeData`.
- **AR8 — Per-visit re-live engine** — per-place-per-day single selection, capture-recency floor, per-place cooldown, photo-first weighting, contentless down-weighting.

**Migration safety mechanism:**
- **AR9 — Executable consumer schema contracts** (`web-consumer` authored in travel-map; `ios-consumer` authored in `mapsake-ios`, **vendored** into travel-map by reviewed PR) gating every migration against a **prod-shape clone** (schema + PII-scrubbed, distribution-preserving, per the clone spec).
- **AR10 — CI gate map:** G1 structural contract gate, G2 pgTAP (triggers/RLS/promote-RPC idempotency), G3 anti-staleness gate (field-support manifest: contract ⊇ min-supported AND latest-released), G4 expand/contract lint; I1–I4 on the iOS side (unit, XCUITest, contract self-consistency, RC contract-bump PR); **X1 `mapsake-contract-e2e`** (clone + migration + web + min-supported & latest iOS, concurrent dual-writer Shape-A convergence + promote idempotency).
- **AR11 — Min-supported-version force-upgrade lever** + field-support manifest (correctness requirement — the only way to retire schema against a long-lived field).

**Push delivery:**
- **AR12 — APNs sender as a Supabase Edge Function** — single selection → atomic cap (before fan-out) → web-push + APNs (`.p8` JWT); honors `profiles.notif_time` via hourly cron.
- **AR13 — Push-payload contract** — a TS type in the sender mirrored by a Swift `PushPayload` `Codable`, fixture-tested on both ends; zh-TW push copy via **`loc-key`/`loc-args`** (words resolve in the iOS bundle).
- **AR14 — Notification Service Extension** — decodes the payload, uses the **read-only session token** (never refreshes in the 30s window), fetches + attaches a server-prepared JPEG (≤1MB, ≥300px, signed-URL TTL > retry window), text-only fallback.

**Client architecture & platform:**
- **AR15 — Data layer:** `MapsakeData` is the sole `import Supabase` site (greppable/lint-enforced); repo protocol seams + `MapsakeTestSupport` fakes; the merge → `[TimelineEntry]` (one function, source-tagged, deterministic tiebreak); `CalendarDate` for date-only columns; separate read/write structs.
- **AR16 — Identity model:** explicit `linkIdentity` + a merge/reconciliation path (Hide-My-Email relay defeats email-match; Apple `sub` is the stable id); the Supabase auto-link-on-verified-email config is a named decision; deletion revokes the Apple token and cascades to web session invalidation.
- **AR17 — Deep linking:** AASA file served from `mapsake.simon198.com`; Associated Domains entitlement; `Core/Router` opens the targeted visit.
- **AR18 — App Store compliance artifacts:** `PrivacyInfo.xcprivacy`, truthful privacy labels (simplified by EXIF-strip), entitlements (aps-environment, App Group, Keychain group, Associated Domains).
- **AR19 — iOS CI:** macOS runner — build + code-signing, SwiftLint, Swift Testing unit, XCUITest (a11y + Reduce-Motion), xcstrings candidate gate, TestFlight lane.

**Spikes / open technical decisions (resolve before their dependent story):**
- **AR20 — Geocoding provider spike** — Apple `MKLocalSearch`/`CLGeocoder` vs OSM Nominatim/Photon on TW/JP address quality; resolve **before the FR4 capture-search story**.
- **AR21 — Map layer DSL-vs-raw** — MapLibreSwiftUI DSL vs `UIViewRepresentable`; resolve at the FR1–3 map build (gates NFR1 proof).

### UX Design Requirements

_First-class actionable UX work items from DESIGN.md, EXPERIENCE.md, and the locked voice guide._

- **UX-DR1 — Parchment design token system (SwiftUI, `MapsakeDesign`):** the Sepia-Parchment palette (all tokens incl. the AA-verified pairs and the ink-text selected-chip fix), the Noto Serif TC + Noto Sans TC type ramp mapped to iOS text styles (serif = display/emotional only, weight 500 never 700; CJK line-height floors; inputs ≥17pt), 8px spacing, radii, ink-tinted shadows. Light-only (dark deferred).
- **UX-DR2 — Component library (`MapsakeDesign`):** button-primary / button-ghost / button-quiet; chip (ink-text selected); sheet (grabber, detents); field; search-pill; list-row; grouped-card; cluster-pin; **pin-marker (standard / hero / approximate dashed-hollow)**; recap-card; sign-in buttons; notif-preview-card; browse-expand-card; photo-tile (+ dashed ＋其他照片 add-tile); photo-strip-tile; toggle; toast; tab-bar; avatar.
- **UX-DR3 — Motion system + single gate:** save settle+ripple+haptic (FR10); re-live glow pulse; Reduce-Motion fallbacks; all routed through one `.mapsakeMotion(…)` gate reading `accessibilityReduceMotion`, proven by a Reduce-Motion-on UI test.
- **UX-DR4 — App shell:** three-tab bottom bar (地圖 / 去過的地點 / 設定), a single forward-moving modal capture stack, sheet-over-map grammar (map stays visible; full-screen is user-chosen), no frame-jolt on focus/transition.
- **UX-DR5 — Voice/i18n system:** `.xcstrings` zh-TW catalog; **no string literal reaches a view** (typed keys, lint-enforced); candidate gating (`needs_review` + `CANDIDATE:` comment) with a CI grep blocking release; the arbitrated vocabulary binding (記錄 / 選擇地點 / 上傳 / 重溫 / 回憶 / 第 N 次 / 已儲存 / 地點 / 去過的地點 / 「哪一天去的呢？」); VoiceOver labels draw from the same blessed key; the don'ts (no 「…以…」, no soft-question CTAs, no system-speak).
- **UX-DR6 — Accessibility floor:** `.mapsakeAccessible(label:trait:)` required-argument modifier; per-surface VoiceOver reading orders (re-live, capture steps, map); Dynamic Type incl. zh-TW; ≥44pt targets; AA contrast; visited-never-color-alone (always-on hatch); load-bearing focus ring.
- **UX-DR7 — Multi-visit pin sheet:** opens on the most-recent visit (date line, photos, note); additional visits as a compact history below (tap to swap); single-visit pins show no history block; a deep-link opens the targeted visit.
- **UX-DR8 — Re-live landing sheet:** glowing pin; terracotta context line (「N 年前的今天 · {date} · 第 N 次」); that visit's swipeable photo strip + note; cohort chip (「這天還有 N 個回憶 →」); ⋯ overflow holding mute. Journey-framed variant when a place has multiple same-day anniversaries.
- **UX-DR9 — Capture flow screens:** search (place/address, 「你去過 N 次」 rows); fine-tune (draggable + tap-to-move, plain-text address preview, 選擇地點); date (serif 「哪一天去的呢？」, session/今天 chips, wheel, 略過); photo step (date-suggested grid, ＋其他照片 tile, contextual permission full/limited, inline note field); save moment; loop (記錄下個地點 / 完成這次記錄); session recap (no 第 N 次 in rows).
- **UX-DR10 — Approximate region-backfill pin:** searching a region/country offers 「記錄這個地區」 → visit on a dashed-hollow approximate pin at the region center; colors the region visited; solidifies to a standard marker when dragged to a real spot.
- **UX-DR11 — Geographic browse (去過的地點):** continent labels → country rows (flag, 「N 個回憶 · N 個地區」) → **expand-in-place** into a grouped card of region rows with place-name previews → tap dives to the map; in-collection search pinned on top.
- **UX-DR12 — First-run:** brand moment (the one poetry-allowed surface, 「你的私人旅行時光膠囊」) → sign-in screen (Apple/Google/Email order, reassurance + returning-web-user steering) → guided first memory (the capture flow itself) → notification pre-prompt (mini preview with the user's own place, 「開啟通知，重溫你的旅行」).
- **UX-DR13 — Settings & notification-control surfaces:** profile card; grouped 通知 (回憶通知 toggle + delivery-time + 靜音的地點 list) / 地圖 (預設畫面) / 資料 (匯出我的回憶, 刪除帳號 destructive) / 語言 (static 繁體中文); quiet 登出; account-deletion confirm naming the web-too consequence.
- **UX-DR14 — State patterns:** absence-is-normal empty states (invitation not apology); saving / saved / save-failed (calm retry, no 錯誤/失敗); per-photo upload progress + inline retry; offline read-only banner; permission states (full/limited/denied); search no-results (offer long-press); zero-memory map + browse.

### FR Coverage Map

- **FR1** → Epic 1 (map render, parchment identity, PMTiles)
- **FR2** → Epic 1 (geographic clustering with counts)
- **FR3** → Epic 1 (read-only map, derived visited fill)
- **FR4** → Epic 2 (place/address search)
- **FR5** → Epic 2 (long-press + draggable fine-tune)
- **FR6** → Epic 1 (additive schema/DDL) → Epic 2 (multi-visit write + memory-sheet substance)
- **FR7** → Epic 2 (optional visit date)
- **FR8** → Epic 2 (date-led photo suggestions, contextual auth, EXIF strip)
- **FR9** → Epic 2 (per-visit notes)
- **FR10** → Epic 2 (the save moment)
- **FR11** → Epic 2 (capture loop / backfill)
- **FR12** → Epic 2 (session recap)
- **FR13** → Epic 3 (per-visit eligibility engine)
- **FR14** → Epic 3 (APNs photo-rich push, NSE)
- **FR15** → Epic 3 (deep-link landing on the memory sheet)
- **FR16** → Epic 3 ("N more from this day" cohort)
- **FR17** → Epic 3 (notification controls, one surface)
- **FR18** → Epic 6 (on-this-day widget)
- **FR19** → Epic 4 (first-class browse navigation)
- **FR20** → Epic 4 (geographic organization)
- **FR21** → Epic 4 (search serves browse / jump-to-visited)
- **FR22** → Epic 2 (photo viewer with pinch-zoom, built with the memory sheet)
- **FR23** → Epic 5 (sign in Apple/Google/email + identity continuity)
- **FR24** → Epic 6 (first-run flow)
- **FR25** → Epic 5 (same Supabase accounts as web)
- **FR26** → Epic 5 (settings + account surface + default view)
- **FR27** → Epic 5 (export my data)
- **FR28** → Epic 1 (voice/i18n machinery) → all epics (per-story application) → Epic 6 (final copy blessing)
- **FR29** → Epic 2 (edit and remove)
- **FR30** → Epic 5 (in-app account deletion + Apple token revocation)
- **FR31** → Epic 4 (offline read)

_All 31 FRs mapped. NFR1 (Epic 1 map, Epic 2 photos), NFR2 (Epic 3), NFR3 (Epic 2/3), NFR4 (Epic 2), NFR5 (Epic 1), NFR6 (Epic 1/2 migration + gates), NFR7 (Epic 6), NFR8 (Epic 1 machinery + every epic)._

## Epic List

_Build order de-risks the crown jewel first and lets Simon feel the full loop (capture a real trip → get ambushed by it) by the end of Epic 3. Accessibility (UX-DR6) and voice (FR28/UX-DR5) are per-story build rules whose enforcement machinery is built in Epic 1 and applied in every story, not a separate epic. Revised via party-mode (John/Winston/Murat) + assumption audit, 2026-07-13._

### Epic 1: Foundation, Platform & the Map
Stand up the walking skeleton and the canvas. Xcode project + `MapsakeKit` SPM package (Models/Data/Design, extension-API-only) + the three targets + App Group + Keychain group + the **dev Supabase project**; the design-token system and the **voice + accessibility enforcement machinery** (`.xcstrings` candidate gate, `.mapsakeAccessible`, `.mapsakeMotion`); a **per-install Supabase anonymous session** as the working principal; the **additive multi-visit DDL** (visits table/columns/promote-RPC defined, reversible, unused) shipped as an isolated step; and the **read-only map** rendering PMTiles with the derived visited fill and geographic clusters against the current schema. Done: the app runs, reads real pins, CI is green.
**FRs covered:** FR1, FR2, FR3 · **Backbone:** AR1, AR2, AR3 (DDL only), AR15, AR21 · **Machinery:** UX-DR1, UX-DR2, UX-DR5, UX-DR6, NFR5, NFR8

### Epic 2: Capture the Trip & Prove the Migration
The logging ritual (UJ-1) and the crown-jewel de-risk. Story 2.1 is the thinnest real visit-write through the vendored data-access layer, turning **X1 dual-writer convergence green as a merge gate** before the UX. Then the full ritual: search → fine-tune pin → date → date-suggested photos (contextual permission, EXIF strip) → the save moment → loop / recap; multi-visit writes; the approximate region-backfill pin; edit/remove; and the **memory-sheet substance** (a visit's photos/note/date, swipeable) + photo viewer. All migration-safety gates (consumer contracts, prod-shape clone, anti-staleness) are proven here against the first real writer.
**FRs covered:** FR4, FR5, FR6 (write + sheet), FR7, FR8, FR9, FR10, FR11, FR12, FR22, FR29 · **Backbone:** AR4, AR5, AR6, AR9, AR10, AR11, AR20 · **UX:** UX-DR3, UX-DR7 (substance), UX-DR9, UX-DR10, UX-DR14 · **NFR:** NFR3, NFR4

### Epic 3: Re-live — the Soul
The payoff (UJ-2), pulled forward so Simon feels it at ~40% build against pins he really captured. Story 3.1 is the **soul spike** — a manual push of one of Simon's real memories to his own device, proving the payoff before the full engine. Then the per-visit engine (per-place-per-day, cooldown, recency floor, photo-first, journey-framed multi-anniversary), the Edge Function sender + push-payload contract, the Notification Service Extension (photo-rich, read-only token), the deep-link landing (adds the **re-live framing** — glow, context line, cohort, mute — on top of Epic 2's sheet substance), and the one-surface notification controls. Runs on the anonymous principal (device token carries over on later upgrade).
**FRs covered:** FR13, FR14, FR15, FR16, FR17 · **Backbone:** AR7, AR8, AR12, AR13, AR14 · **UX:** UX-DR8 · **NFR:** NFR2

### Epic 4: Browse & Offline
The collection (UJ-3). First-class geographic browse (continent → country → region → place, expand-in-place), search-jump to a visited place, and native offline read of previously-viewed content.
**FRs covered:** FR19, FR20, FR21, FR31 · **UX:** UX-DR11

### Epic 5: Sign In & Your Account
Real identity, built once there are real rows to protect. Sign in with Apple / Google / email magic-link that **`linkIdentity`-upgrades the live anonymous session in place** (stable uid → capture rows and the device token carry over, no data migration); the merge/reconciliation path proven against the real rows Epic 2 produced; the account + settings surface; export; and in-app account deletion (Apple token revocation + web-session cascade).
**FRs covered:** FR23, FR25, FR26, FR27, FR30 · **Backbone:** AR16, AR18 · **UX:** UX-DR13

### Epic 6: First Run, Widget & Launch
Make it a shippable first-time experience and get it into the store. The brand intro → sign-in → **guided first memory** → notification pre-prompt (UJ-4; signed-in-first gated here for the shipped flow); the on-this-day home-screen widget; the final copy-blessing pass (FR28); and App Store readiness (privacy labels, `PrivacyInfo.xcprivacy`, final NFR verification, TestFlight, submission).
**FRs covered:** FR18, FR24, FR28 (final) · **Backbone:** AR19 · **UX:** UX-DR12 · **NFR:** NFR7

### Load-bearing seams (recorded from the assumption audit)
- **The anonymous→real-auth upgrade (Epics 1→5):** the Epic 1 session MUST be per-install Supabase anonymous auth, and Epic 5's sign-in MUST `linkIdentity`-upgrade that same live session (never a fresh sign-in) so the uid is stable and rows/tokens carry over. This is the single most important seam in the build order.
- **The memory-sheet split (Epics 2→3):** Epic 2 owns the sheet *substance* (visit content, swipe, viewer); Epic 3 adds only the re-live *framing* (glow, context line, cohort, mute).
- **Merge-against-real-rows (Epic 5):** the working bet is that `linkIdentity`+merge is easier proven against Epic 2's real rows; if merge needs design earlier, this is the known flex point.

## Epic 1: Foundation, Platform & the Map

Stand up the walking skeleton and the canvas: the project, the shared modules, the enforcement machinery, and a read-only map that reads real pins on the current schema.

### Story 1.1: Project scaffold, SPM package & targets

As the maintainer,
I want the Xcode project, the local `MapsakeKit` package, and the three app targets wired up,
So that every later story has a buildable, CI-green foundation to add to.

**Acceptance Criteria:**

**Given** a fresh clone,
**When** the project is opened and built,
**Then** the App target, a Notification Service Extension target, and a Widget target all compile against iOS 17.0,
**And** `MapsakeKit` exposes `MapsakeModels` / `MapsakeData` / `MapsakeDesign`, with `MapsakeModels` and `MapsakeData` set `APPLICATION_EXTENSION_API_ONLY = YES`,
**And** an App Group and Keychain access group are shared across all three targets,
**And** `supabase-swift` (≥2.51) and `maplibre-gl-native-distribution` (6.x) resolve via SPM.

**Given** the dev Supabase project exists,
**When** the app initializes,
**Then** the Supabase URL + anon key are read from a gitignored `Secrets.xcconfig` (never hardcoded), injected into `MapsakeData` at launch,
**And** a macOS CI workflow builds, signs, and runs an (empty) test suite green.

### Story 1.2: Design tokens & the voice/accessibility machinery

As the maintainer,
I want the parchment design system and the voice + accessibility enforcement gates in place,
So that every screen built afterward is on-brand, in-voice, and accessible by construction.

**Acceptance Criteria:**

**Given** `MapsakeDesign`,
**When** a view uses a token,
**Then** the Sepia-Parchment palette (incl. the AA-verified pairs), the Noto Serif TC + Noto Sans TC type ramp mapped to iOS text styles, 8px spacing, radii, and ink-tinted shadows are all available as typed tokens.

**Given** the enforcement machinery,
**When** CI runs,
**Then** a lint rule fails the build on any string literal in `Text`/`Label`/`.accessibilityLabel`/alerts,
**And** a grep gate fails release on any `.xcstrings` entry still `needs_review` or commented `CANDIDATE:`,
**And** `.mapsakeAccessible(label:trait:)` (required args) and `.mapsakeMotion(…)` (reads `accessibilityReduceMotion`) exist in `MapsakeDesign`.

### Story 1.3: Anonymous session & the data-access boundary

As the maintainer,
I want a real per-install Supabase anonymous session and a clean data-access layer,
So that later stories write real, claimable rows through one tested seam.

**Acceptance Criteria:**

**Given** a first launch,
**When** the app starts,
**Then** `MapsakeData` establishes a **per-install Supabase anonymous session** (a real principal with a stable uid), persisted across launches.

**Given** the data layer,
**When** any code accesses Supabase,
**Then** only `MapsakeData` imports `Supabase` (enforced),
**And** repositories are defined as protocols with `MapsakeTestSupport` fakes,
**And** date-only columns decode into a `CalendarDate` value type (never a bare `Date`),
**And** read and write structs are separate (`Pin` vs `PinInsert`/`PinUpdate`).

### Story 1.4: Additive multi-visit DDL (isolated, reversible)

As the maintainer,
I want the multi-visit schema added additively behind the migration gates,
So that the new shape exists without breaking the live web client and before any writer depends on it.

**Acceptance Criteria:**

**Given** the shared Supabase,
**When** the migration is applied,
**Then** a `visits` table (additional visits only), `photos.visit_id` (nullable), and the `promote_primary_visit` RPC are created with owner-scoped RLS mirroring `pins`,
**And** `pins.memory_date`/`note` remain writable with no bridge trigger,
**And** the migration is reversible.

**Given** the migration CI,
**When** a migration PR runs,
**Then** the `web-consumer` and vendored `ios-consumer` contracts both verify against a prod-shape clone (G1), pgTAP covers RLS + the RPC signature (G2), the anti-staleness gate is armed (G3), and expand/contract lint passes (G4),
**And** the dashboard is labelled "migration regression-safe" (not "proven" — X1 is not yet runnable).

### Story 1.5: Read-only map with pan & zoom

As a traveler,
I want to open the app and see a fluid world map,
So that I have the canvas my memories will live on.

**Acceptance Criteria:**

**Given** the map tab,
**When** the app opens,
**Then** the map renders the parchment identity via the v1 PMTiles pipeline and supports pan + pinch-zoom at native fluidity (NFR1),
**And** the three-tab shell (地圖 / 去過的地點 / 設定) is present,
**And** the MapLibre integration approach (MapLibreSwiftUI DSL vs `UIViewRepresentable`, AR21) is decided and recorded.

### Story 1.6: Derived visited fill & geographic clusters

As a traveler,
I want the regions I've been to shown as visited, with pins grouped by geography,
So that my map reads as a personal atlas even before I add anything on iOS.

**Acceptance Criteria:**

**Given** existing pins and legacy web region-marks,
**When** the map renders,
**Then** the visited fill is derived from memories ∪ legacy marks (read-only on iOS), shown as terracotta **plus the always-on hatch texture** (never color alone, NFR8/UX-DR6).

**Given** a zoomed-out map,
**When** pins are present,
**Then** they cluster **by geography** (one aggregate pin per region/country carrying the memory count), and tapping dives in; close zoom shows individual pins.

## Epic 2: Capture the Trip & Prove the Migration

The logging ritual and the crown-jewel de-risk. The migration is proven here against the first real writer before the full UX is built.

### Story 2.1: First real visit-write & dual-writer convergence gate

As the maintainer,
I want the thinnest real iOS visit-write through the production data-access layer, exercised against a live web writer,
So that the multi-visit migration is proven before three epics build on it.

**Acceptance Criteria:**

**Given** the vendored `MapsakeData` write path (not a hand-rolled insert),
**When** a headless test inserts one visit onto an existing pin,
**Then** the visit round-trips and the live web client still reads and writes the same pin correctly.

**Given** the `mapsake-contract-e2e` surface,
**When** it runs a concurrent web-writer + iOS-writer scenario against the prod-shape clone,
**Then** the two writers converge (no corruption), the `promote_primary_visit` RPC is idempotent under race, and **X1 is green as a merge gate on the migration**.

### Story 2.2: Place & address search

As a traveler,
I want to search a place name or paste an address and have the map fly there,
So that logging a trip starts without zoom-hunting.

**Acceptance Criteria:**

**Given** the search front door,
**When** I type a place name (zh-TW-first) or paste a street address,
**Then** the chosen geocoding provider (Apple vs OSM, resolved by the AR20 TW/JP spike) returns results and the map flies to the spot,
**And** a visited place shows 「你去過 N 次」,
**And** 取消 returns to the map.

### Story 2.3: Fine-tune placement & create the visit

As a traveler,
I want to nudge the pin to the exact spot and confirm,
So that my memory lands where it actually happened.

**Acceptance Criteria:**

**Given** a placement (from search or a long-press on the map),
**When** the fine-tune step opens,
**Then** a draggable 44pt pin shows a reverse-geocoded address preview as plain text (never the mechanism's name), with a tap-anywhere-to-move alternative (WCAG 2.5.7),
**When** I confirm with 選擇地點,
**Then** a **visit** is created on the (possibly existing) pin via `MapsakeData`.

### Story 2.4: Visit date (optional)

As a traveler,
I want to set when I was there, or skip it,
So that dating a memory is easy but never forced.

**Acceptance Criteria:**

**Given** the date step,
**When** it opens,
**Then** it shows the serif question 「哪一天去的呢？」, shortcut chips (the session's previous date, 今天), and the iOS date wheel,
**And** 略過 is the single skip; the visit may be saved with no date (FR7),
**And** the date is stored as `CalendarDate` on the visit.

### Story 2.5: Date-led photos, EXIF strip & per-visit note

As a traveler,
I want the picker to lead with photos from around that date, and a place to write a line,
So that attaching the right memories takes seconds.

**Acceptance Criteria:**

**Given** a set visit date,
**When** the photo step opens,
**Then** photo-library authorization is requested contextually, and **full or limited access is honored** (limited suggests within the user's subset with a manage affordance); all suggestion logic runs on-device; nothing is auto-attached.

**Given** selected photos,
**When** they upload,
**Then** GPS EXIF is **stripped** before upload while capture-date is retained, images resize ~2048px, and per-pin/per-user caps apply,
**And** a quiet optional one-line note field saves onto **this visit** (FR9).

### Story 2.6: The save moment, loop & recap

As a traveler,
I want a felt confirmation and an easy way to keep going or stop,
So that logging a ten-place trip is a pleasure, not data entry.

**Acceptance Criteria:**

**Given** a save,
**When** the server acknowledges the write (NFR4),
**Then** the save moment plays (settle + ripple + light haptic via `.mapsakeMotion`, Reduce-Motion → toast only) and 已儲存 shows with 「{place} · 第 N 次」.

**Given** the loop,
**When** the memory is saved,
**Then** I can 記錄下個地點 (→ search, session date carried) or 完成這次記錄 (→ recap),
**And** the recap shows every place logged (place · date · photo count, no 第 N 次 rows).

### Story 2.7: Multi-visit memory sheet & photo viewer

As a traveler,
I want to open a pin and see its memory, with older visits below,
So that a revisited place shows its history.

**Acceptance Criteria:**

**Given** a pin,
**When** I tap it,
**Then** a bottom sheet opens on the most-recent visit (date line, photos, note) over the still-visible map,
**And** additional visits render as compact history rows (tap to swap); single-visit pins show no history block.

**Given** a photo in the sheet,
**When** I tap it,
**Then** a full-screen viewer opens owning swipe + **pinch-to-zoom** (FR22), gestures not colliding with sheet-drag or map-pan.

### Story 2.8: Approximate region-backfill

As a traveler,
I want to log "I was in Hokkaido years ago" without false precision,
So that backfilling old trips is honest and fast.

**Acceptance Criteria:**

**Given** a search for a region or country,
**When** I choose 「記錄這個地區」,
**Then** a visit is created on an **approximate pin** (dashed-hollow marker) at the region's center and the region colors visited immediately,
**And** the marker solidifies to a standard pin when later dragged to a real spot,
**And** rapid name-only backfill through the same loop still colors each region visited.

### Story 2.9: Edit & remove

As a traveler,
I want to fix or delete a memory,
So that my map stays true and mine.

**Acceptance Criteria:**

**Given** a pin or visit,
**When** I edit,
**Then** I can change the pin name, a visit's date/note, and add/remove a visit's photos.

**Given** a delete,
**When** I delete a visit that is the primary,
**Then** the **`promote_primary_visit` RPC** atomically promotes the most-recent remaining visit into the pin row (or NULLs `memory_date` if none remain),
**And** deleting a pin removes its visits and photos, with a calm single confirm naming the thing and the consequence for content-bearing deletions.

## Epic 3: Re-live — the Soul

The payoff, pulled forward. Prove the feeling first, then build the engine that delivers it reliably.

### Story 3.1: Soul spike — one real push to my own device

As Simon (the primary user),
I want a real photo-rich notification of one of my actual memories on my own iPhone,
So that I can feel whether the soul works before building the full engine.

**Acceptance Criteria:**

**Given** the anonymous principal and a registered APNs device token (this story creates the `apns_device_tokens` table + token write path if not present),
**When** a manual trigger fires,
**Then** a photo-rich push for a real seeded memory arrives on Simon's device — including a **minimal photo-attach NSE built here** (Story 3.4 later hardens it: read-only token, size limits, text fallback), so this story stands alone,
**And** tapping it opens the app to that memory,
**And** the outcome is recorded as a go/no-go on the re-live concept.

### Story 3.2: Per-visit eligibility engine

As a traveler,
I want the right memory chosen for each day,
So that what comes back feels chosen by time, not shuffled.

**Acceptance Criteria:**

**Given** the eligibility engine (server-side),
**When** it runs for a user,
**Then** selection is **per-place-per-day** (one voice per place), honoring the capture-recency floor, the per-place cooldown, photo-first weighting, and contentless down-weighting,
**And** a same-place multi-anniversary day yields the journey-framed variant with the oldest anniversary's photo leading,
**And** it is verified under a 200-pin × 10-visit fan-out to emit ≤ the daily cap.

### Story 3.3: Edge Function sender & push-payload contract

As a traveler,
I want one memory a day delivered to all my devices,
So that the capsule feels curated, never spammy.

**Acceptance Criteria:**

**Given** the Supabase Edge Function sender,
**When** the daily job runs,
**Then** it makes one selection above the channels, enforces the daily cap **atomically before fan-out**, and fans out to web-push + APNs (`.p8` JWT),
**And** the payload matches the shared `PushPayload` contract (fixture-tested both ends), with zh-TW copy resolved via `loc-key`/`loc-args`,
**And** delivery honors `profiles.notif_time` via an hourly cron.

### Story 3.4: Notification Service Extension (photo-rich)

As a traveler,
I want the memory's photo on every notification, reliably,
So that the photo earns the tap even under real-world constraints.

**Acceptance Criteria:**

**Given** the minimal NSE from Story 3.1,
**When** this story hardens it,
**Then** it decodes `PushPayload`, uses a **read-only** session token (never refreshes in the 30s window), and attaches a server-prepared JPEG (≤1MB, ≥300px, signed-URL TTL > retry window),
**And** a missing/late image degrades to a graceful text-only notification (NFR2).

### Story 3.5: Deep-link re-live landing

As a traveler,
I want tapping the notification to drop me into that exact memory,
So that re-living is one tap.

**Acceptance Criteria:**

**Given** the AASA file served from `mapsake.simon198.com` and the `Core/Router`,
**When** I tap the notification,
**Then** the map flies to the pin, it glows (Reduce-Motion → static halo), and the sheet opens on **that visit** with the re-live framing (context line 「N 年前的今天 · {date} · 第 N 次」, swipeable photo strip, note, cohort chip 「這天還有 N 個回憶 →」, ⋯ mute),
**And** the framing sits on Epic 2's sheet substance.

### Story 3.6: Notification controls

As a traveler,
I want one clear place to manage notifications,
So that I can tune the capsule without fighting contradictory switches.

**Acceptance Criteria:**

**Given** 設定 › 通知,
**When** I open it,
**Then** one surface shows the 回憶通知 toggle, the delivery-time preference, and the 靜音的地點 list,
**And** muting a place stops its notifications on **all** channels instantly and remains visible on the map,
**And** mute-rate is measurable across both channels (the counter-metric).

## Epic 4: Browse & Offline

The collection, reachable in two obvious taps, and readable without a connection.

### Story 4.1: Geographic browse

As a traveler,
I want to wander my collection by geography,
So that it reads like an atlas of my life.

**Acceptance Criteria:**

**Given** the 去過的地點 tab,
**When** I open it,
**Then** it organizes continent → country → region → place with expand-in-place (a country lifts into a grouped card of its region rows with place-name previews),
**And** tapping a place dives to it on the map.

### Story 4.2: Search serves browse

As a traveler,
I want to search a place I've visited and jump straight to it,
So that finding an old memory is instant.

**Acceptance Criteria:**

**Given** the in-collection search field,
**When** I search a visited place,
**Then** the result jumps to its pin on the map (FR21).

### Story 4.3: Offline read

As a traveler,
I want previously-seen content to stay browsable offline,
So that my memories are there even without a connection.

**Acceptance Criteria:**

**Given** previously-viewed content,
**When** the device is offline,
**Then** the base map, my pins, and loaded memories/photos remain browsable via the `OfflineCache` actor,
**And** capture and sync say calmly that they need a connection (never a hard wall or silent failure).

## Epic 5: Sign In & Your Account

Real identity, built once there are real rows to protect, upgrading the anonymous session in place.

### Story 5.1: Sign in with Apple (in-place upgrade)

As a traveler,
I want to sign in with Apple and keep everything I've already logged,
So that my map is safe and follows me across devices.

**Acceptance Criteria:**

**Given** the live anonymous session with real rows,
**When** I sign in with Apple,
**Then** `linkIdentity` **upgrades the same session in place** (uid unchanged), so all pins/visits/photos and the device token carry over with no data migration,
**And** a Hide-My-Email sign-in does not fork a new account (the Apple `sub` is the stable identity).

### Story 5.2: Google, email magic-link & returning-web-user continuity

As a returning web user,
I want to sign in the way I always have and land on my existing map,
So that iOS is the same account, not a new one.

**Acceptance Criteria:**

**Given** the sign-in screen,
**When** I choose Google or email magic-link,
**Then** the flow completes and links same-email identities to one account (the Supabase auto-link-on-verified-email config is set deliberately),
**And** returning web users are steered to their original method,
**And** a link collision surfaces as a calm reroute ("sign in with your other method"), never a raw error,
**And** the merge/reconciliation path is proven against the real rows from Epic 2.

### Story 5.3: Account & settings surface

As a traveler,
I want a calm settings screen,
So that managing the app feels like part of the keepsake.

**Acceptance Criteria:**

**Given** 設定,
**When** I open it,
**Then** it shows the profile card (avatar, name, email · method), 地圖 (預設畫面, applied on cold open), 語言 (static 繁體中文), and a quiet 登出,
**And** all copy is drafted against the voice guide as candidates.

### Story 5.4: Export my data

As a traveler,
I want to take my memories with me,
So that they are truly mine.

**Acceptance Criteria:**

**Given** 設定 › 資料,
**When** I request an export,
**Then** the flow moves request → preparing → ready and delivers the user's data (v1 export carries over),
**And** it is framed as a trust guarantee, not a warning.

### Story 5.5: In-app account deletion

As a traveler,
I want to delete my account and all its data from inside the app,
So that I stay in control (and the app passes App Review).

**Acceptance Criteria:**

**Given** 設定 › 資料 › 刪除帳號,
**When** I confirm (a plain confirm naming that the same map disappears from the web too),
**Then** the account and all its data are deleted, the Sign in with Apple token is revoked (even with multiple linked identities), and active web sessions are invalidated (App Store 5.1.1(v)).

## Epic 6: First Run, Widget & Launch

Make it a shippable first-time experience and get it into the store.

### Story 6.1: First-run flow

As a first-time user (雅婷),
I want a warm start that ends with one real memory logged,
So that I leave with a reason to come back in a year.

**Acceptance Criteria:**

**Given** a fresh install,
**When** I open the app,
**Then** I see the brand intro (the one poetry-allowed surface, 「你的私人旅行時光膠囊」) → **sign-in (signed-in-first, no anonymous UI)** → the guided first memory (the capture flow itself) → recap → the notification pre-prompt,
**And** the pre-prompt shows a mini preview with my own just-logged place and 「開啟通知，重溫你的旅行」 before the OS prompt fires,
**And** declining notifications changes nothing else and never nags again from this flow.

### Story 6.2: On-this-day widget

As a traveler,
I want a home-screen widget that resurfaces a memory,
So that the capsule finds me even without opening the app.

**Acceptance Criteria:**

**Given** the Widget target,
**When** it renders,
**Then** it shows a memory's photo + an "N 年前" caption and deep-links to the pin (sharing the `reliveSelection()` pure function and the router),
**And** it honors the per-place cooldown so it doesn't fixate on one place.

### Story 6.3: Final copy-blessing pass

As Simon (the native arbiter),
I want every candidate string swept for my blessing,
So that no translation-shaped Chinese ships.

**Acceptance Criteria:**

**Given** the `.xcstrings` catalog,
**When** the release build runs,
**Then** every user-facing string (incl. VoiceOver labels) is blessed (no `needs_review`/`CANDIDATE:` survivors, CI-enforced),
**And** each was drafted against the locked voice guide and reviewed by Simon (FR28).

### Story 6.4: App Store readiness & submission

As the maintainer,
I want the app to pass App Review and ship,
So that Mapsake v2 is live on the Taiwan App Store.

**Acceptance Criteria:**

**Given** the build,
**When** submission is prepared,
**Then** truthful privacy labels + `PrivacyInfo.xcprivacy` are in place (simplified by EXIF-strip), Sign in with Apple + in-app deletion are present (NFR7),
**And** the NFR floors are verified (NFR1 60fps map/photo, NFR2 APNs delivery, NFR8 accessibility sweep),
**And** a TestFlight build is distributed and the App Store submission is created.
