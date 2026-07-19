---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-07-13'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-07-02/prd.md
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-07-02/addendum.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/EXPERIENCE.md
  - project-context.md
workflowType: 'architecture'
project_name: 'travel-map'
project_variant: 'Mapsake v2 (native iOS)'
user_name: 'Simon'
date: '2026-07-09'
predecessor: _bmad-output/planning-artifacts/architecture.md
---

# Architecture Decision Document — Mapsake v2 (native iOS)

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together. It covers the native iOS app of Mapsake v2; the v1 web architecture (`../architecture.md`) remains the reference for the shared Supabase backend, which v2 reuses._

## Project Context Analysis

### Requirements Overview

**Functional Requirements** (31 FRs, six groups; two stretch/assumption-tagged):

- **Group A — The Map (FR1–3):** Full-bleed `maplibre-native` render reusing the v1 PMTiles pipeline unchanged, at Google-Maps-on-iOS fluidity. The map is **read-only outside capture**; the visited fill is **fully derived** on iOS (memories ∪ legacy web region-marks, read-only — iOS never writes region marks). Clustering is **geographic, not proximity-based** (one aggregate pin per region/country carrying a memory count), cheap to derive from the region/country codes every pin already carries.
- **Group B — Capture (FR4–12, FR29):** Search-led capture (place names + pasted addresses, zh-TW-first) → draggable fine-tune pin with reverse-geocoded preview → date → date-suggested photos → save moment. The load-bearing structural change is **FR6 multi-visit**: a pin (place) holds many visits, each with its own date/note/photos. → geocoding-provider decision, PhotoKit on-device date-matched suggestions, and a **shared-backend schema migration** that keeps the live web client reading *and writing*.
- **Group C — Re-live (FR13–18):** The v1 server-side eligibility engine (4 tiers: explicit date → EXIF → created → rediscovery; mute; 1/day) carries over, **extended per-visit** (each visit's date is an anniversary candidate; contentless backfill down-weighted). Push becomes **native APNs, photo-rich** via a Notification Service Extension; deep-link lands on the exact visit. Cross-channel (web-push + APNs) must stay capped at one notification/day per the existing ledger. Widget (FR18) is a stretch goal.
- **Group D — Browse (FR19–22, FR31):** First-class geographic browse (continent→country→region→place), search-jumps-to-visited, Apple-Photos-grade full-screen viewer with pinch-zoom, native offline read of previously-viewed content.
- **Group E — Account (FR23–25, FR30):** **Signed-in-first**; Sign in with Apple + Google + email magic-link, against the **same Supabase accounts** as web. Identity continuity is a hard requirement (Hide-My-Email must not fork a new account; same-email identities link). In-app account deletion with Apple token revocation (App Review 5.1.1(v)).
- **Group F — Care & settings (FR26–28):** Designed settings surface, export carryover, zh-TW native voice (process requirement, not architecture).

**Non-Functional Requirements** (8): NFR1 Fluidity (60fps map + photo, <100ms capture) · NFR2 APNs delivery (≥99% accepted, photo attachment + text fallback) · NFR3 Privacy (contextual photo auth, on-device suggestion logic, Sentry-only, no analytics SDK) · NFR4 Durability (ack-before-"saved") · NFR5 iOS 17+ floor · NFR6 Backend compatibility (no web breakage, reads AND writes) · NFR7 App Store readiness · NFR8 Accessibility (VoiceOver, Dynamic Type incl. zh-TW, Reduce Motion, AA, ≥44pt).

### Scale & Complexity

- **Primary domain:** native iOS client (Swift/SwiftUI, decided) over a **reused, shared Supabase backend** — the backend is a constraint, not a greenfield.
- **Complexity level:** medium-high — not from raw scale (single user per account, small per-user data) but from three coupling points: (1) a schema migration on a **live shared database with two writers on independent deploy clocks**, (2) native subsystems new to this codebase (APNs + NSE, PhotoKit, Sign in with Apple, MapLibre-native), and (3) identity continuity across web and iOS.
- **Estimated components:** SwiftUI app (map / capture / browse / re-live / settings), a data-access layer over `supabase-swift`, an on-device photo-suggestion module, a Notification Service Extension, a deep-link router, an offline read cache; plus shared-backend deltas — multi-visit schema + web-compat bridge, per-visit eligibility engine, an APNs sender alongside the existing web-push, an optional widget extension.

### Technical Constraints & Dependencies (decided upstream; ratified here)

- **Stack decided:** Swift/SwiftUI, iOS 17+, `supabase-swift`, `maplibre-native` (PMTiles confirmed), APNs via NSE. Architecture ratifies component details, not the stack.
- **Backend reused:** Supabase (Postgres + Auth + Storage), the v1 eligibility engine, the cron sender, the `pin-photos` bucket, the v1 photo pipeline policy (~2048px resize, per-pin/per-user caps).
- **DB row types hand-mirrored** in Swift (no `supabase gen types` for Swift).
- **Migrations are Simon-gated** (`supabase db push`), never agent-applied — a v1 posture that carries.
- **Live-schema facts confirmed (2026-07-09):** `pins.memory_date` is **nullable**; `photos.taken_at` is **nullable** (per-photo EXIF); `pins.exif_taken_at = MIN(photos.taken_at)` is maintained by the `SECURITY DEFINER` trigger `sync_pin_exif_taken_at` (empty `search_path`; `pin_id` immutable in v1); the daily cap is `profiles.last_notified_at`, written only by the service role in the cron sender. RLS is owner-scoped on every table; the `pin-photos` bucket path is `{user_id}/{pin_id}/{photo_id}`.

### Cross-Cutting Concerns Identified

Sharpened by a solo pre-mortem (F1–F6) and an architectural round table (Winston, Amelia, Murat, John):

- **The axiom — two writers, two clocks, one enforcement point.** The live web PWA and the iOS app both read and write the shared Supabase DB with no coordinated deploy, and App Review timing is non-deterministic. Because a service seam (API gateway) can't sit in front of the directly-connected web client, **Postgres is the API gateway**: every cross-client invariant lives as a constraint, an RLS policy, or a `SECURITY DEFINER` function, and migrations *are* the API contract. Every other concern below falls out of this.
- **Multi-visit migration — the #1 risk (P×I ≈ 20).** Additive schema only; `pins.memory_date` stays a real **writable** column. The bridge to a `visits` table must be **one-directional with a single source of truth** (not a bidirectional trigger — a loop/deadlock hazard). Enforce a single lock order (acquire the pin row first) to avoid a web↔iOS deadlock the web client can't retry; document last-writer-wins. Named unclosed detail: **deleting the primary visit** (promote-successor; `memory_date` may go NULL since it is nullable). `photos.visit_id` is added nullable; web-inserted photos (visit_id NULL) route to the primary visit; the existing pin-level exif trigger stays untouched, a new per-visit aggregate runs beside it. New tables get RLS mirroring `pins` (F6).
- **Migration safety = an executable schema contract, not a coordinated deploy.** Capture the exact query/column surface each client depends on (`web-consumer` + `ios-consumer` contracts) and gate every migration on both verifying green against a prod-shape (schema + PII-scrubbed, distribution-preserving) clone. Rehearse the backward-compatible forward-fix; migrations follow **expand → activate → contract** with a server-side capability flag so a shipped-but-buggy iOS build can be told to fall back.
- **Re-live firing decision is per-place-per-user, once, above the channels.** The candidate pool is per-visit, but a place gets **one anniversary voice per day**, selecting the *best* visit — widen the funnel, not the faucet. The 1/day ceiling should get *more* selective as the candidate pool grows, and the place (not only the user) needs a frequency cap. A heavy backfiller's contentful (EXIF-dated) import can still flood via tier-2 — consider a recency/ramp floor. The daily cap must be enforced **before channel fan-out** on a single selection with an atomic serialization point; mute must propagate across channels instantly; mute-rate must be measurable across both channels (the counter-metric).
- **Identity continuity.** One account across web + iOS across all sign-in methods; explicit Supabase `linkIdentity` on a signed-in session, **not email-match** (Apple Hide-My-Email relay addresses defeat email-matching and fork silently). UX steering to the original method reduces exposure but is not the guard.
- **APNs delivery durability.** Signed-URL TTL exceeds the APNs retry window; a notification-sized JPEG (≤1MB, ≥300px) is prepared server-side; text-only fallback tested.
- **Photo lifecycle across two clients (blind spot the pre-mortem missed).** The new per-visit delete path needs **server-side, DB-triggered, idempotent object reaping** (client-side cleanup won't agree across two deploy trains; orphaned objects whose signed URLs still resolve can leak into a push). And iOS brings HEIC + richer/timezone-sensitive EXIF than web ever wrote to the shared `photos.taken_at` — **normalize photo date/format server-side on ingest** to a canonical representation, or the same column carries two meanings and memories land on the wrong day (a direct hit on the retention thesis).
- **Privacy & App Review.** On-device photo logic, EXIF strip-vs-declare (open), truthful privacy labels, account deletion + Apple token revocation.
- **Accessibility & zh-TW voice** as build-wide floors (voice guide locked; copy Simon-arbitrated).

### Decisions Queued for the Decision Steps

The PRD marks two ⛔ architecture-phase blockers; the round table reframed both and surfaced more. Each resolves in a later step with explicit trade-offs:

1. **Multi-visit data model + web read/write compat** (⛔) — one-directional bridge shape, primary-visit representation, lock order, primary-visit-delete rule, per-visit exif re-derivation.
2. **Geocoding provider** (⛔, FR4) — Apple `MKLocalSearch`/`CLGeocoder` vs OSM Nominatim/Photon, with a TW-address quality spike; display-terms nuance against a MapLibre map.
3. **Re-live engine per-visit + dual-channel firing** — candidate pool vs. per-place-per-day selection rule, atomic cap before fan-out, cross-channel mute propagation and measurement.
4. **Identity model** — `linkIdentity` flow, returning-web-user reconciliation, Hide-My-Email handling, account-deletion token revocation.
5. **Migration/release safety mechanism** — executable consumer schema contracts + prod-shape clone gate + expand/contract sequencing + capability flag.
6. **Photo lifecycle** — server-side object reaping on visit delete; canonical server-side photo-date/format normalization; EXIF strip-vs-declare.

## Starter Template Evaluation

### Primary Technology Domain

Native iOS application — Swift / SwiftUI, iOS 17+ (stack decided upstream; PRD addendum "Stack decision"). Not a web/full-stack scaffold: the backend is the reused v1 Supabase project, so this evaluation covers only the **client foundation**.

### Starter Options Considered

- **Stock Xcode iOS App template (SwiftUI lifecycle) — selected.** Apple's own project template. No third-party generator in the native-iOS ecosystem is worth its coupling; a mega-starter would violate the boring-tech + simplicity posture and bury the very platform primitives (PhotoKit, APNs, Sign in with Apple) that v2 exists to use first-class.
- **Community "SwiftUI clean-architecture" boilerplates (opinionated MVVM/TCA templates) — rejected.** They impose an architecture pattern before those decisions are made, and add maintenance surface for a solo maintainer learning Swift.
- **MapLibreSwiftUI DSL vs. raw `UIViewRepresentable`** over `maplibre-gl-native-distribution` — a genuine sub-decision, deferred to the map decision step. DSL buys declarative ergonomics; raw buys full binding coverage and one fewer dependency layer. Flagged, not yet chosen.

### Selected Starter: Stock Xcode SwiftUI App + deliberate SPM set

**Rationale:** maximum control over native subsystems, minimum dependency surface, and no imposed architecture — decisions are made explicitly in this document, not inherited from a template.

**Verified current versions (2026-07-09, web-checked):**
- `supabase-swift` **v2.51.0** (2026-07-08); v2.50.0 raised the floor to Swift 6.1+ / iOS 16+, under our iOS 17+ target.
- `maplibre-gl-native-distribution` **6.x** via SPM; native PMTiles landed in iOS 6.10.0, with an ambient cache for PMTiles sources in the current 6.x line — confirms the addendum's "PMTiles confirmed."

**Initialization (the first implementation story):**
- New Xcode project → **iOS App**, SwiftUI interface, Swift language, deployment target **iOS 17.0**.
- SPM dependencies: `supabase-swift` (from 2.51.0; Auth, PostgREST, Storage, Realtime as needed); `maplibre-gl-native-distribution` (from 6.x, native PMTiles); MapLibreSwiftUI DSL *pending the map decision step*.
- Targets: **Notification Service Extension** (photo-rich APNs, FR14); a **Widget Extension** if epic planning votes FR18 in.

**Architectural decisions the starter makes (and defers):**
- **Language & runtime:** Swift 6.x, SwiftUI app lifecycle, iOS 17+.
- **Dependency management:** Swift Package Manager only (no CocoaPods/Carthage).
- **Styling / design system:** none imposed — the parchment token system from `DESIGN.md` is built as native SwiftUI (colors, type scale, components); deferred to implementation.
- **State management, data-access layering, navigation:** not decided by the starter — resolved in the decision steps (a `supabase-swift` data layer mirroring v1's `data/*` boundary is the likely shape).
- **Testing:** XCTest / Swift Testing for the app; DB-side contract tests (pgTAP) live with the Supabase repo, not the app.

**Note:** Project initialization via the steps above should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):** multi-visit data model (Shape A), identity-continuity/`linkIdentity` + merge model, the migration/release safety mechanism, the per-place-per-day re-live firing rule.
**Important (shape architecture):** geocoding provider (spike-gated), APNs + NSE push path, EXIF-strip, iOS state/data-layer shape.
**Deferred:** MapLibreSwiftUI-DSL vs. raw `UIViewRepresentable` (map-build detail), widget (FR18, epic-planning), graduated re-live curation (post-v2), dark mode (post-v2).

### Data Architecture

- **Multi-visit model — Shape A (decided).** New `visits(id, pin_id, user_id, visit_date, note, exif_taken_at, created_at)` holds **additional visits only**; the `pins` row *is* the primary visit. `pins.memory_date`/`note` stay web-writable with **zero translation** (no bridge trigger). `photos.visit_id` added **nullable**; web-inserted photos (NULL) belong to the primary. New tables get owner-scoped RLS mirroring `pins`. iOS reads a pin's timeline as `UNION(pin-as-primary, visits)` sorted by date.
- **Per-visit EXIF.** The existing pin-level `sync_pin_exif_taken_at` trigger stays untouched (primary). A parallel aggregate maintains `visits.exif_taken_at = MIN(photos.taken_at WHERE visit_id = v.id)` for additional visits. Two independent aggregates, no coupling.
- **Primary-visit delete (server-side atomic RPC).** Deleting the primary while additional visits exist **promotes** the most-recent additional visit up into the pin row (copy date/note/exif, delete its `visits` row, re-point its photos). This runs as a single `SECURITY DEFINER` Postgres RPC (one transaction), **not** client-side multi-writes — iOS doing promote-then-delete separately will half-fail offline and orphan data (Amelia + Winston, 2026-07-12). Deleting the sole visit sets `pins.memory_date = NULL` (nullable, confirmed live). Concurrency semantic: **last-writer-wins** on same-field edits, documented.
- **Migration sequence (Simon-gated, one `db push` each, contract-gated between):** (1) additive `visits` + `photos.visit_id` nullable + RLS; (2) per-visit exif trigger. No primary-row backfill and no bridge trigger under Shape A. Never tighten a web-touched column.

### Authentication & Security

- **Supabase Auth reused** — same accounts as web (FR25). Sign in with **Apple + Google + email magic-link**.
- **Identity continuity via explicit `linkIdentity`** on a signed-in session, **not email-match** — Hide-My-Email relay addresses defeat email-matching and would fork silently. The stable identity is the **Apple `sub`, not the email**; recovery never depends on the relay address.
- **Merge/reconciliation path (architecture-owned, not just UX steering).** `linkIdentity` can't fire on a fresh install (no prior session to link to), so the model must own a reconciliation path for the returning-user fork: when a newly-created account looks like an orphan (e.g. Apple-first with an empty map), offer "sign in with your original method to merge." Covers both the fresh-install fork and the two-accounts-already-exist case (v1's mooted cross-account merge, resurfaced on iOS). Decision owes an explicit stance at build: prevent (block the second account) vs. reconcile (merge after the fact).
- **Supabase identity-linking config is a named decision** — auto-link-on-verified-email on/off governs the same-email magic-link case; must be set deliberately (Apple relay breaks the verified-email assumption).
- **Link-collision handling** (identity already attached to another account) surfaces as a calm reroute ("that account is already your other Mapsake — sign in with it"), never a raw error.
- **Account deletion (FR30 / App Review 5.1.1(v))** revokes the Apple token even with multiple linked identities, drops all identities, and **cascades to web session invalidation** (the same map disappears from web too, per the PRD).
- **RLS owner-scoped on every table** including new ones; service-role client only in cron/service paths, never in user requests (v1 posture).

### API & Communication Patterns

- **`supabase-swift` talks PostgREST + Storage + Auth directly** — no API gateway. **Postgres is the enforcement point**; cross-client invariants live as constraints, RLS, and `SECURITY DEFINER` functions. Migrations *are* the API contract.
- **Migration/release safety (decided):** checked-in **executable consumer schema contracts** (`web-consumer`, `ios-consumer`) gate every migration against a **prod-shape clone** (schema + PII-scrubbed, distribution-preserving). Releases follow **expand → activate → contract**, with a **server-side capability flag** so a shipped-but-buggy iOS build can be told to fall back (App Review timing is non-deterministic).
- **Min-supported-version force-upgrade lever (decided, amends the above).** The live iOS consumer is a *distribution of shipped App Store builds*, not a git ref, so the contract must cover the **union of all field versions with live traffic**, and schema can only be retired once the versions that needed it drop below a support floor. A soft **force-upgrade / min-supported-version** mechanism is therefore a correctness requirement (not a product nicety): without it the field is unbounded and nothing can ever be contracted. A **field-support manifest** (min-supported + latest-released, from App Store Connect/analytics) drives an **anti-staleness gate** — a destructive migration goes red if the `ios-consumer` contract is behind either edge. **Additive-only for anything iOS reads; removals only after the field ages out behind the force-upgrade floor.**
- **Dual-channel push:** the eligibility engine makes **one per-user-per-day selection above the channels**, then fans out to **all** the user's surfaces (web-push + APNs). The daily cap (`profiles.last_notified_at`) is enforced **atomically before fan-out** (single serialization point, not per-channel read-modify-write). Same memory on every device, fire-and-forget per channel, no cross-device retraction (APNs/web-push give no reliable read receipts; suppressing risks the user missing it entirely). Mute is per-place and propagates across both channels instantly; mute-rate is measured across both (the counter-metric).

### Re-live Engine (per-visit)

- **Candidate pool is per-visit; the firing decision is per-place-per-day.** A place gets one anniversary voice per day; the engine selects the **best visit**. Widen the funnel, not the faucet.
- **Selection contract (concrete):**
  - **Same-place multi-anniversary day → journey-framed notification.** When more than one of a place's visits is anniversary-eligible the same day, the copy acknowledges the plural (「回憶你的京都旅程」-register, TBD against the voice guide, Simon-arbitrated) and deep-links to the **pin opened with its visit history visible**; the **oldest** anniversary provides the lead photo (the tap-earner). Round-number years (5/10) can headline.
  - **Capture-recency floor:** a visit can't fire re-live within ~30 days of its capture — kills the mass-backfill flood at the source (a memory added yesterday whose EXIF reads "2 years ago today" must not fire tomorrow).
  - **Per-place cooldown:** ~30 days after a place fires before it can fire again, however many of its visits are eligible — the most-visited pin must not become the most-muted.
  - **Photo-first weighting:** a photoless anniversary loses to a lower-tier candidate that has a photo (the photo earns the tap, FR14).
  - **Rediscovery tier respects the per-place cooldown** under multi-visit (quiet-day rediscovery picks across visits but won't re-surface the same heavily-visited place).
- **APNs rich push:** signed-URL TTL **exceeds the retry window**; a server-prepared notification JPEG (≤1MB, ≥300px); text-only fallback. Delivery honors `profiles.notif_time` via an hourly cron matching each user's hour (UTC+8 default).

### Frontend (iOS) Architecture

- **SwiftUI, iOS 17+**, `@Observable` (Observation framework) for state — native, no third-party state lib.
- **Data-access layer over `supabase-swift`** mirroring v1's `data/*` boundary (typed reads/writes, RLS-scoped). iOS read path must tolerate a **bare pin with zero additional visits** and a web-created pin.
- **Map:** `maplibre-gl-native-distribution` 6.x with native PMTiles; **MapLibreSwiftUI DSL as the default**, falling back to a `UIViewRepresentable` for anything the DSL doesn't expose (custom symbol layers for the visited hatch + geographic cluster pins). Final map-layer call at build.
- **Navigation:** three-tab shell + a single forward-moving modal capture stack; sheet-over-map grammar (detents TBD at build).
- **Geocoding:** provider **decided by a TW/JP quality spike** (Apple `MKLocalSearch`/`CLGeocoder` vs OSM Nominatim/Photon); winner ships, loser documented as fallback; if Apple wins, the MapLibre-display ToS risk is logged as an accepted pragmatic call. Placement always correctable via the draggable fine-tune pin.
- **Photos:** PhotoKit on-device date-matched suggestions; contextual authorization (full/limited honored); **GPS EXIF stripped at upload**, capture-date retained; v1 pipeline policy (~2048px, caps). Client resize + strip before upload.
- **Offline read** of previously-viewed map/pins/memories/photos; capture and sync require connectivity, said calmly.

### Infrastructure & Deployment

- **Backend reused, sender relocated:** Supabase (Postgres + Auth + Storage) + the existing Vercel-hosted web app, reused. The daily re-live **sender moves to a Supabase Edge Function** (next to the data it queries; one backend deploy target, decoupled from web releases) doing the single selection → atomic cap → fan-out to **web-push + APNs** (token-based `.p8` JWT). Device tokens live in a new owner-RLS table carrying an **`apns_environment`** column (sandbox vs production tokens are not interchangeable); iOS owns the token write path via `MapsakeData`.
- **Separate dev Supabase project (decided).** Debug iOS builds and the destructive primary-visit-delete RPC must never touch production data. The Supabase free tier allows 2 active projects, so a dedicated **dev project** fits at no cost (it pauses when idle; unpause on demand). URL + anon key injected per `xcconfig` configuration, never hardcoded. The shipped anon key is extractable, so **RLS is the real guard** across the two-writer model, `visits`, and the RPC.
- **Photo-object reaping moves server-side** — DB-triggered, idempotent, covering the new per-visit delete path (client-side cleanup won't agree across two deploy trains; orphaned objects with live signed URLs could leak into a push).
- **APNs** via a Notification Service Extension for photo-rich push; APNs auth key + topic config.
- **Monitoring:** Sentry (crash-free ≥99.5%, SC5); no analytics SDK (NFR3).
- **App Store pipeline:** Sign in with Apple, in-app deletion, truthful privacy labels (simplified by EXIF-strip).

### Decision Impact Analysis

**Implementation sequence:** (1) Xcode project + SPM + targets; (2) additive migration + RLS + per-visit exif (contract-gated); (3) auth + `linkIdentity` + merge/reconciliation + returning-user steering; (4) read-only map + PMTiles + derived visited fill; (5) capture flow (search-spike → fine-tune → date → photos+strip → save); (6) multi-visit pin sheet; (7) per-visit engine + selection contract + atomic cap + APNs/NSE; (8) browse + offline; (9) settings + deletion; (10) widget (if voted in).

**Cross-component dependencies:** the migration gates everything backend-touching; identity gates account continuity; the atomic cap gates dual-channel correctness; the geocoding spike gates the capture front door; server-side reaping + EXIF-strip gate the privacy labels.

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

Two codebases: the new Swift/SwiftUI app (naming, structure, state, async, i18n, a11y) and the shared Supabase SQL (must match v1). Guiding principle from the round table: **the only enforceable rule is a red build** — every convention below is backed by a mechanism, not doc prose.

### Naming Patterns

- **Swift** (Swift API Design Guidelines): types `UpperCamelCase`, members `lowerCamelCase`, one primary type per file `TypeName.swift`.
- **Database** (match v1): `snake_case` plural tables/columns; `idx_<table>_<cols>`; RLS policies `<table>_owner_<action>`; functions/triggers `snake_case`, `SECURITY DEFINER` + `set search_path = ''`, fully-qualified; migrations `<UTCtimestamp>_<description>.sql`.
- **Swift ↔ DB:** hand-mirrored structs, **explicit `CodingKeys`** (never global `convertFromSnakeCase` — can't reliably invert acronyms like `exif_taken_at` on write). **Separate read/write structs:** `Pin` (read) vs `PinInsert`/`PinUpdate` (writes omit `id`/`created_at`).

### Structure Patterns

- **One local SPM package, three modules split by dependency direction:**
  - `MapsakeModels` — row structs, pure value types, zero deps. The *only* definition; every target imports it.
  - `MapsakeData` — Supabase client wrapper, session, signed-URL fetch. App + NSE import it.
  - `MapsakeDesign` — parchment tokens, `N年前` caption formatting. App + Widget; **NSE does not import it** (a decorated push attaches an image, it doesn't render the design system).
  - The re-live **selection decision is a pure function** (in `MapsakeModels` or a thin module), shared across App/NSE/Widget; the SwiftUI selection *view* stays App-only.
  - Not shared-membership files (rot), not a dynamic framework (dylib-load tax inside the NSE's 30s/memory budget).
  - `MapsakeModels` and `MapsakeData` set **`APPLICATION_EXTENSION_API_ONLY = YES`** (extension-safe: no UIKit, no main-app singletons) since the NSE and Widget link them.
  - `MapsakeDesign` **depends on `MapsakeModels`** so shared model-aware SwiftUI components (e.g. `PinRow`) have a home instead of scattering into features.
- **App feature-first**, mirroring v1's `features/<domain>/`: `Features/<Domain>/{Views, Models}` for `Map, Capture, Pins, Relive, Browse, Settings, Auth, Photos, Notifications`. `Core/` = router, offline cache, app-session glue.
- Tests co-located per target; DB tests (pgTAP) + the consumer-contract suite live with the Supabase repo.

### Format & Async Patterns

- **Dates:** date-only columns (`visit_date`, `memory_date`) decode into a **`CalendarDate` value type** (y/m/d), converted to `Date` only at render with an explicit calendar. Never a bare `Date` — UTC-midnight decoding shows the wrong day west of UTC. Timestamps stay ISO8601.
- **async/await throughout.** Strict concurrency **architecture day one, compiler flag staged** `minimal → targeted → complete` (flip to complete at end of epic 1). The network Data client is a `final class … : Sendable` (or `static` async namespace) returning **only value types**; the **offline cache is an `actor`** (real mutable state). `@unchecked Sendable` requires a justifying comment or review fails.
- **Shape-A read = one merge, one type.** A single `MapsakeData` function returns `[TimelineEntry]` (carries a `source: .primary/.additional` tag; `id` is source-tagged, never a raw UUID). Deterministic sort: `visitDate desc, then created_at, then id` (date-only ties are common). No screen sees `pins` vs `visits`.
- **Screen state enum:** `idle / loading / loaded([T], isRefreshing: Bool) / failed(Error)`; writes: `saving / saved / saveFailed(retryable: Bool)` (offline-save-failure is a normal path, NFR4).

### Communication & State Patterns

- **`@Observable` `@MainActor` view models**, one per screen; shared services via SwiftUI `Environment`. Deep links route through one `Core` router (re-live opens the targeted visit). No global event bus; value-type state replacement, no shared in-place mutation.
- **NSE session discipline:** App + NSE share a **Keychain access group + App Group**. The NSE treats the session **read-only — uses a valid access token or falls back to the plain push, never refreshes inside the 30s window**. `MapsakeData` exposes a "valid-token-or-nil, don't refresh" path for the extension. Extension-side decode is **tolerant** (optional-heavy, no fatal `try`) since SPM can't enforce that structs match the schema the web writer can change.
- **Push-payload contract (cron/Edge Function ↔ NSE).** The `aps` dict + custom keys (media URL, pin id, targeted visit, card type) is a hard producer/consumer contract with **no database to enforce it** — and it carries the headline re-live feature. Model it explicitly: a `push-payload` schema (a TS type in the sender mirrored by a Swift `Codable` in `MapsakeModels`) with **fixture tests on both ends** (the sender emits canonical fixtures; the NSE decodes those same fixtures in a unit test). A field-name mismatch must fail a test, not silently drop a notification.
- **Push copy via `loc-key` / `loc-args`.** The sender ships a key + data (`"relive.card.body"`, `[placeName, year]`); the words resolve against the iOS bundle's zh-TW catalog under the same voice governance as all app copy. The sender owns *when* and *with what data*; the client owns the *words*. (Server-generated `push-copy.ts` is retired for APNs bodies.)

### Process & Enforcement Patterns (every rule = a red build)

- **Data boundary (greppable):** only `MapsakeData` may `import Supabase`. That import in a `Views/` or `Models/` file fails review.
- **Voice / i18n:** every string lives in the `.xcstrings` zh-TW catalog; **no string literal reaches a view** (typed keys only, e.g. `L.saved`; a lint rule forbids literals in `Text`/`Label`/`.accessibilityLabel`/alerts). New strings ship `state: needs_review` + a `CANDIDATE:` comment naming the voice-guide term; **blessing is a diff** (`needs_review → translated`, strip prefix). A **CI grep fails the release build** on any surviving `needs_review`/`CANDIDATE:`. The arbitrated vocabulary (`記錄 / 選擇地點 / 上傳 / 重溫 / 回憶 / 已儲存 / 地點 / 去過的地點`) is binding.
- **Accessibility (NFR8):** interactive views go through a `.mapsakeAccessible(label:trait:)` modifier that **requires** label + trait as arguments; the label draws from the **same blessed catalog key** as the visible text (never a parallel hardcoded string). An XCUITest asserts every accessible element has a non-empty label + real trait. The save moment + re-live glow route through **one `.mapsakeMotion(…)` gate** reading `accessibilityReduceMotion`; a Reduce-Motion-on UI test proves they don't animate.
- **Error handling:** typed errors at the `Data` boundary; Sentry captures the technical error; the user sees only the calm, blessed message (never raw error text).
- **Testing:** **Swift Testing** (`@Test`/`#expect`), not XCTest. The Data layer is tested against a `protocol` seam with fakes (view-model tests never hit the network). Non-negotiable unit tests: the three merge bugs (id collision, tie-break stability, empty-visits pin). **Pinned JSON decode fixtures** per row struct catch snake_case/CodingKeys drift the day a column changes. DB triggers/RLS via **pgTAP**; the **consumer-contract suite gates every migration**.

### Anti-Patterns

Hardcoded UI strings; a view importing `Supabase`; a new table without RLS; `convertFromSnakeCase`; a bare `Date` for a date-only column; booleans-for-state; raw error text shown to the user; client-side multi-write for primary-visit promotion (use the RPC); refreshing the auth token inside the NSE; a computed/generated column on a web-written field; a VoiceOver label that bypasses the blessed catalog; a debug build pointed at the prod Supabase project; a push payload field renamed on one side only.

## Project Structure & Boundaries

Two repos (topology decision "Path 2, vendored": the iOS consumer contract is authored in `mapsake-ios` and copied into `travel-map` by reviewed PR — no submodule/pin machinery for a solo owner; the diff lands in the migration PR).

### iOS App Repository (`mapsake-ios`, new)

```
mapsake-ios/
├── README.md
├── .swiftlint.yml                     # no string literal in Text/Label/.accessibilityLabel;
│                                       # `import Supabase` allowed only under MapsakeData
├── .github/workflows/ci.yml           # macOS runner: build+sign, SwiftLint, Swift Testing unit,
│                                       # XCUITest (a11y + Reduce-Motion), xcstrings candidate gate,
│                                       # I3 contract-self-consistency, TestFlight lane; on RC → open
│                                       # the vendored-contract-update PR in travel-map
├── Mapsake.xcodeproj
├── Config/                            # per-configuration xcconfig (dev vs prod Supabase URL+anon key)
│   ├── Debug.xcconfig  Release.xcconfig
│   └── Secrets.xcconfig               # gitignored; injected into MapsakeData at init
├── Mapsake/                           # ── App target
│   ├── MapsakeApp.swift               # @main, env wiring, injects Supabase config into MapsakeData
│   ├── Mapsake.entitlements           # App Group, aps-environment, associated domains, keychain group
│   ├── Info.plist                     # usage strings (photo/location), CFBundleDevelopmentRegion=zh-Hant
│   ├── PrivacyInfo.xcprivacy          # declares push-token + photo usage
│   ├── Core/
│   │   ├── Router.swift               # deep-link routing (re-live → targeted visit)
│   │   └── AppSession.swift           # auth session, server capability-flag / min-version check
│   ├── Features/                      # feature-first, mirrors v1 features/<domain>/
│   │   ├── Map/{Views,ViewModels}         # FR1–3
│   │   ├── Capture/{Views,ViewModels}     # FR4–12  (needs photo/location usage strings)
│   │   ├── Pins/{Views,ViewModels}        # FR6/29
│   │   ├── Relive/{Views,ViewModels}      # FR13–17
│   │   ├── Browse/{Views,ViewModels}      # FR19–22
│   │   ├── Settings/{Views,ViewModels}    # FR26/30
│   │   ├── Auth/{Views,ViewModels}        # FR23–25 (ASWebAuthenticationSession, linkIdentity, merge)
│   │   ├── Photos/{Views,ViewModels}      # FR8/22
│   │   └── Notifications/{Views,ViewModels} # FR24/17
│   └── Resources/
│       ├── Localizable.xcstrings      # zh-TW catalog — candidate gating; push-copy loc-keys live here
│       └── Assets.xcassets            # AppIcon, AccentColor, brand mark, tab glyphs
├── MapsakeNotificationService/        # ── NSE target (FR14)
│   ├── NotificationService.swift      # decode push-payload, read-only token, fetch+attach photo, fallback
│   └── *.entitlements                 # App Group, keychain group
├── MapsakeWidget/                     # ── Widget target (FR18, if voted in)
│   └── *.entitlements                 # App Group
├── Packages/MapsakeKit/               # ── local SPM package (static-linked)
│   ├── Package.swift                  # tools 6.0; iOS 17+; Supabase dep ONLY on MapsakeData;
│   │                                   # MapsakeModels+MapsakeData: APPLICATION_EXTENSION_API_ONLY
│   ├── Sources/
│   │   ├── MapsakeModels/             # Pin/Visit/Photo(read) · PinInsert/Update(write) · CalendarDate
│   │   │                               # · TimelineEntry(source) · timeline() merge · reliveSelection()
│   │   │                               # · PushPayload (Codable, mirrors sender's TS type)
│   │   ├── MapsakeData/               # Supabase wrapper, repo protocol seams, session, signed-URL,
│   │   │   └── contract/ios-consumer.contract.sql   # AUTHORED here (owns the queries); copied to travel-map
│   │   │                               # RPC callers · OfflineCache (actor, App Group container)
│   │   │                               # · valid-token-or-nil (NSE)
│   │   └── MapsakeDesign/             # tokens, N年前 formatting, .mapsakeAccessible, .mapsakeMotion
│   │                                   #   (depends on MapsakeModels for shared PinRow etc.)
│   └── Tests/
│       ├── MapsakeModelsTests/        # Swift Testing: merge bugs, selection contract, PushPayload decode
│       │   └── Fixtures/*.json        #   pinned Supabase JSON + canonical push-payload fixtures
│       ├── MapsakeDataTests/          # Swift Testing: repo behavior against MapsakeTestSupport fakes
│       └── (MapsakeTestSupport)       # non-test library target: repo fakes shared by unit + UI tests
└── MapsakeUITests/                    # ── XCUITest target IN the xcodeproj (App-hosted; XCTest, not
                                        #    Swift Testing): a11y label/trait sweep, Reduce-Motion gate
```

Note: `MapsakeUITests` and `MapsakeTestSupport` are hosted where they can build — XCUITest needs an app host (Xcode target, XCTest), and the fakes are a shared library both test kinds import.

### Supabase Backend (existing `travel-map` repo — additions)

```
travel-map/
├── supabase/
│   ├── migrations/                                  # Simon-gated, expand→activate→contract
│   │   ├── <ts>_add_visits_and_photo_visit_id.sql   # additive visits + photos.visit_id null + RLS
│   │   ├── <ts>_visit_exif_aggregate.sql            # per-visit MIN; pin-level trigger untouched
│   │   ├── <ts>_promote_primary_visit_rpc.sql       # SECURITY DEFINER atomic promote+delete+repoint
│   │   ├── <ts>_reap_photo_objects.sql              # DB-triggered idempotent Storage reaping
│   │   ├── <ts>_apns_device_tokens.sql              # tokens + apns_environment + owner RLS
│   │   └── <ts>_relive_per_visit_engine.sql         # per-place-per-day selection, cooldown, recency floor
│   ├── functions/relive-sender/                     # Supabase Edge Function: selection→cap→fan-out
│   │                                                 #   (web-push + APNs .p8 JWT); loc-key payloads
│   └── tests/
│       ├── pgtap/                                   # triggers, RLS, promote RPC idempotency, per-place cap
│       └── contracts/
│           ├── web-consumer.contract.sql            # authored here
│           └── ios-consumer.contract.sql            # VENDORED copy from mapsake-ios (reviewed PR)
├── scripts/                                          # + prod-shape clone builder, contract verifier runner,
│                                                     #   field-support manifest reader
└── app/…                                             # web app unchanged (maintenance-only)
```

### Architectural Boundaries

- **Data boundary:** `MapsakeData` is the sole `import Supabase` site (greppable, lint-enforced); repos are protocol seams tested via `MapsakeTestSupport` fakes.
- **Target boundary:** `MapsakeModels` is the single row-struct definition; both shared modules are extension-API-only. NSE = `MapsakeModels` + `MapsakeData`; Widget = `MapsakeModels` + `MapsakeDesign` (+ `MapsakeData` if it queries). App Group + Keychain group carry the read-only session to the NSE.
- **Backend boundary:** Postgres is the enforcement point; the Edge Function is the only push sender; the web client keeps its direct-PostgREST path unchanged.
- **Two cross-repo contracts:** the **schema contract** (vendored `ios-consumer.sql`, verified against the prod-shape clone) and the **push-payload contract** (TS type ↔ Swift `PushPayload`, fixture-tested both ends).

### CI Gates (where each lives, what it retires)

- **travel-map, per migration PR:** **G1** structural contract gate (apply migration to prod-shape clone; assert both consumer contracts) · **G2** pgTAP (triggers, RLS, promote-RPC idempotency + fan-out + exif-MIN) · **G3** anti-staleness gate (field-support manifest: contract ⊇ min-supported AND latest-released, else destructive migrations red) · **G4** expand/contract lint (destructive ops need a justified annotation).
- **mapsake-ios, per PR / RC:** **I1** unit (merge, decode) with clone-distribution-derived fixtures · **I2** XCUITest (a11y, Reduce-Motion) · **I3** contract self-consistency (the binary's actual reads/writes match `ios-consumer.sql` — without this, Path-2 vendoring validates against fiction) · **I4** on RC: open the vendored-contract-update PR in travel-map.
- **`mapsake-contract-e2e` (third surface, triggered by both, blocks both):** **X1** clone + candidate migration + web + min-supported *and* latest iOS builds, concurrent dual-writer Shape-A round-trips, assert convergence + no corruption + promote-RPC idempotent under race. The only place the semantic dual-writer break is observable.

### Prod-Shape Clone Spec

Not "PII-scrubbed" hand-wave — a buildable spec: (1) **column-level scrub classification** (identity/auth hashed with a *consistent* function so FKs survive; free-text zh-TW captions replaced; **geo/EXIF preserved via clustering-preserving jitter, not zeroing** — the distribution *is* the product); (2) **Shape-A distributions preserved** (visits/pin fan-out, null density on migrated columns, soon-to-be-unique collision rate, `taken_at` ranges, rows already violating a new constraint); (3) **adversarial injection** (null-island, 50-visit pin, dangling photo→pin FK, unicode captions); (4) **full clone or tail-oversampling** (sampling hides the tail that breaks migrations); (5) **freshness gate** (a migration passing against a stale clone is a lie); (6) **storage scope decision** (are `pin-photos` objects in scope, or Postgres only).

### Requirements → Structure Mapping

| Epic / area | iOS location | Backend location |
|---|---|---|
| Map & visited fill (FR1–3) | `Features/Map` | derived; PMTiles pipeline (`scripts/`) |
| Capture + multi-visit (FR4–12) | `Features/Capture`, `Features/Photos` | `visits` migration, promote RPC, exif aggregate |
| Re-live (FR13–18) | `Features/Relive`, NSE, Widget | `relive_per_visit_engine`, Edge Function, apns tokens |
| Browse (FR19–22) | `Features/Browse` | — |
| Account (FR23–25, 30) | `Features/Auth`, `Features/Settings` | Supabase Auth + `linkIdentity` config |
| Settings/care (FR26–28) | `Features/Settings`, `Localizable.xcstrings` | export (existing) |

**Cross-cutting:** offline (`MapsakeData/OfflineCache`), routing (`Core/Router`), voice+a11y gates (`MapsakeDesign` + xcstrings + CI), photo reaping + EXIF-strip (server trigger + client upload), AASA deep-link file (served from `mapsake.simon198.com`).

## Architecture Validation Results

### Coherence Validation ✅

- **Decision compatibility:** the stack is internally consistent — `supabase-swift` 2.51 (Swift 6.1/iOS 16+) sits under the iOS 17+ floor; `maplibre-native` 6.x carries the v1 PMTiles pipeline unchanged; Shape A + `pins.memory_date`-stays-writable + expand/contract + the vendored contract all reinforce the one axiom (two writers, two clocks, Postgres as enforcement point). No contradictions after the delete-RPC correction.
- **Pattern consistency:** patterns serve the decisions — the greppable `import Supabase` boundary enforces the Data layer; `CalendarDate` protects the date-driven re-live thesis; the red-build mechanisms (candidate-string gate, required-a11y-args, motion gate, contract verifier) make the NFR8/FR28 posture enforceable rather than aspirational.
- **Structure alignment:** the two-repo tree + SPM three-module split + CI gate map physically support every boundary; extension-API-only + App Group make the NSE/Widget targets buildable against the shared modules.

### Requirements Coverage Validation

- **Functional (31/31 mapped):** FR1–17, 19–31 have concrete architectural homes (see the Requirements→Structure table). **FR18 (widget) is deferred by design** (stretch; target stubbed, epic-planning decides).
- **Non-functional (8/8):** NFR2 (APNs delivery), NFR3 (privacy/EXIF-strip), NFR4 (durable writes), NFR5 (iOS 17+), NFR6 (backend compat), NFR7 (App Store), NFR8 (a11y) fully addressed. **NFR1 (fluidity) addressed in principle** (MapLibre-native, `@Observable`, 60fps target); concrete proof depends on the deferred map-layer build call (DSL vs raw).

### Implementation Readiness Validation ✅

Decisions documented with verified versions; patterns comprehensive with enforcement mechanisms; structure complete and buildable; boundaries greppable and testable.

### Gap Analysis

- **Critical (block implementation): none.** Both PRD ⛔ blockers (multi-visit compat, geocoding) have a resolution or a defined resolution mechanism; the delete-RPC hole is closed.
- **Important (resolve before a specific story, not before starting):** (1) geocoding provider — decided *by spike*, run before the FR4 capture-search story; (2) map layer DSL-vs-raw — deferred to the FR1–3 map build, gates NFR1 proof; (3) re-live "best visit" scoring — contract concrete, exact weights are epic/impl detail; (4) zh-TW candidate strings — await Simon's blessing by design (CI-gated).
- **Nice-to-have (post-v2):** widget UX, graduated re-live curation, dark mode.

### Architecture Completeness Checklist

**Requirements Analysis:** [x] context analyzed · [x] scale/complexity assessed · [x] constraints identified · [x] cross-cutting concerns mapped
**Architectural Decisions:** [x] critical decisions documented with versions · [x] stack fully specified · [x] integration patterns defined · [x] performance considerations addressed (NFR1 proof deferred to map build)
**Implementation Patterns:** [x] naming · [x] structure · [x] communication · [x] process
**Project Structure:** [x] directory structure · [x] boundaries · [x] integration points · [x] requirements mapping

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION** — all 16 checklist items met, no critical gaps; the four important gaps are story-scoped with defined resolution paths.
**Confidence: High.**

**Key strengths:** the two-writer axiom is coherently propagated through every layer; the migration-safety mechanism (contracts + prod-shape clone + G3 anti-staleness + `mapsake-contract-e2e` + force-upgrade lever) is unusually rigorous for a solo v2; the push-payload contract closes the headline feature's silent-failure gap; voice and accessibility are enforced by red builds, not doc prose.

**Areas for future enhancement:** widget, graduated re-live curation, dark mode, English locale, iPad layout — all post-v2.

### Implementation Handoff

**First implementation priority:** Story 1 — Xcode project + SPM package (`MapsakeModels`/`MapsakeData`/`MapsakeDesign`) + the three targets + App Group + `Package.swift` + the dev Supabase project. Then the additive `visits` migration behind the contract gate.

**AI-agent guidelines:** follow the decisions and patterns exactly; run each dev-story through the enforcement gates; respect the two-writer axiom (never break the live web client's read/write path); resolve the geocoding spike before the capture-search story.
