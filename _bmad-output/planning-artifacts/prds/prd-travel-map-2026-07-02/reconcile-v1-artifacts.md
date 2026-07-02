# Reconcile: v2 PRD vs v1 planning artifacts (parity audit)

Date: 2026-07-02
Output under test: `prds/prd-travel-map-2026-07-02/prd.md` + `addendum.md`
Sources (v1 ground truth):
- `prds/prd-travel-map-2026-06-16/prd.md` + `addendum.md` (FR1–FR24, NFR1–NFR6)
- `ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md`, `DESIGN.md`
- `epics.md` (shipped scope: Epics 1–6, AR1–AR13, UX-DR1–15 — v1 is LIVE, so the epics represent real shipped behavior, not aspiration)

Parity claim location: the claim "v1 feature parity + native push + UI/UX uplift" lives in the v2 `.decision-log.md` (scope posture, 2026-07-02). The PRD itself expresses it as repeated "carries over from v1" language (FR13, FR16, FR17, FR27, NFR4). This audit tests whether every v1 user-facing capability is (a) included, (b) superseded by an explicit decision in the PRD, or (c) consciously excluded in §6. Anything in none of those buckets is a **silent parity hole**.

---

## 1. Parity matrix — v1 PRD FRs

| v1 FR | v1 capability | v2 disposition | Status |
|---|---|---|---|
| FR1 | Sign up / sign in | FR23 (Apple + Google, signed-in-first), FR25 (same Supabase accounts) | **PARTIAL — see H-2**: method set silently shrinks (magic-link dropped) |
| FR2 | Durable persistence | NFR4 (durable-write posture carries over) | Included |
| FR3 | Cross-device sync | Implicit via FR25 + shared backend; not restated as a requirement | Included (weak — acceptable) |
| FR4 | Export my data | FR27 ("carries over"), FR26 settings row | Included |
| FR5 | Continuous zoomable map world→admin-1 | FR1 (v1 tile pipeline, PMTiles) | Included |
| FR6 | Mark visited (binary) country + admin-1, roll-up | FR3: **map is read-only; region marking removed** — visited fully derived from memories ∪ legacy web marks | Superseded — explicit ✅ |
| FR7 | Visited renders filled | FR1 ("region fills, visited roll-up") | Included |
| FR8 | Land on chosen default view at login | Only a "default view" row in FR26 settings; first-run/landing behavior never stated | **SILENT (low) — see L-6** |
| FR9 | Tap-to-place named pin | FR5: long-press is the sole write gesture | Superseded — explicit ✅ |
| FR10 | Multiple pins per admin-1 region | Implied by FR2 (per-region memory counts) + FR6 multi-visit model | Included (implicit, acceptable) |
| FR11 | Photos on a pin | FR8 (date-led picker, `pin-photos` storage) | Included/upgraded |
| FR12 | Note on a pin | FR9 (notes carry over; per-place assumption flagged) | Included |
| FR13 | Optional date | FR7 (dateless visits first-class) | Included |
| FR14 | Per-pin memory view | FR15 deep-link landing + Group D browse; implied throughout | Included (implicit, acceptable) |
| FR15 | "Add details later"; bare mark complete, never flagged | FR11 (name-only "empty" memories are valid and color the region) | Included |
| FR16 | Onboarding default-view question | FR24 first-run replaces onboarding wholesale (intro → sign-in → guided first memory) — but the default-view choice is not mentioned as removed; only the backfill replacement is explicit (FR11) | **SILENT (low) — see L-6** |
| FR17 | Rapid tap-to-mark backfill | FR11: backfill mode "replaces v1's region-tap backfill entirely" | Superseded — explicit ✅ |
| FR18 | Change default view in settings | FR26 (settings: default view) | Included |
| FR19 | PWA install nudge | N/A native; motivation stated in §1 Why v2 | Superseded — explicit ✅ |
| FR20 | On-this-day detection | FR13 (4-tier engine carries over, extended per-visit) | Included/upgraded |
| FR21 | Memory-delivery notification, never a nag | FR14 (photo-rich APNs) + voice principles | Included/upgraded |
| FR22 | Deep-link to map + memory together | FR15 | Included |
| FR23 | Free wandering from landing | UJ-2 narrative ("drifts to a nearby pin") + FR16 cohort | Included (journey-level, acceptable) |
| FR24 | Search-to-place (geocoding) | FR4 (upgraded: names + street addresses, zh-TW-first) | Included/upgraded |

## 2. Parity matrix — v1 NFRs

| v1 NFR | v2 disposition | Status |
|---|---|---|
| NFR1 durability | NFR4 | Included |
| NFR2 privacy by design | NFR3 + §6 social exclusion + positioning | Included |
| NFR3 sync consistency | Not restated; NFR6 backend-compat is adjacent | Weak but tolerable (single-phone primary surface) |
| NFR4 performance | NFR1 (60fps, <100ms) | Included/upgraded |
| NFR5 web-first mobile-ready | Superseded by the native pivot itself | Superseded — explicit ✅ |
| NFR6 photo durability | NFR4 + FR8 reuse of existing storage | Included |

## 3. Parity matrix — shipped v1 surface beyond the v1 PRD (epics.md / UX spines)

v1 is live; these shipped behaviors are part of the parity baseline whether or not the v1 PRD numbered them.

| v1 shipped capability (source) | v2 disposition | Status |
|---|---|---|
| **Edit / remove memories**: edit note/date, remove a photo, delete a pin, unmark a region, gentle confirm for real content (Story 3.8; EXPERIENCE "Edit / remove" pattern) | **Nothing.** No v2 FR allows editing or deleting any user content. FR set is append-only (search→place→date→photos→save). §6 does not exclude it. NFR7 covers *account* deletion only. | **SILENT HOLE — HIGH (H-1)** |
| Email **magic-link** sign-in; explicit "neither method is the sole path — no single-OAuth lock-in" AC (Stories 2.1/2.2, AR6) | FR23 = Apple + Google only. Not flagged as a removal; §6 silent. FR25 simultaneously promises "a user who used the web app signs into the same map on iOS." | **SILENT HOLE — HIGH (H-2)** |
| **Offline read-only shell**: installed PWA views cached app shell + base map + loaded memories, calm "viewing only" banner (Story 4.6, AR5/AR8, EXPERIENCE Offline state) | §6 excludes **"offline capture"** only. No FR addresses offline *viewing*, tile caching, or airplane-mode behavior of the native app. | **SILENT HOLE — MEDIUM (M-3)** |
| **Accessibility floor**: AA contrast, always-on texture (visited never color-alone), reduced-motion fade, list as SR/keyboard path, ≥44px targets, CJK ~200% scaling (UX-DR11, Story 6.2, EXPERIENCE Accessibility Floor) | Zero accessibility requirements in v2 PRD or addendum. All have first-class iOS equivalents (VoiceOver, Dynamic Type, Reduce Motion, Differentiate Without Color). | **SILENT HOLE — MEDIUM (M-4)** |
| **Photo pipeline policy**: client resize to WebP ~2048px/q80, EXIF capture at upload, caps ~2GB/user, ~30/pin (AR7) | FR8 says only "photos upload to the existing `pin-photos` storage." No caps, no resize/format policy for native uploads (§6 excludes HEIC *edge cases* only). Multi-visit (FR6) multiplies per-place photo volume; shared bucket with the live web client makes pipeline divergence a compat risk. | **SILENT HOLE — LOW/MEDIUM (M-5)** |
| Places visited list / SR browse path (Story 4.7, UX-DR13) | FR19/FR20/FR21 — upgraded to first-class geographic browse | Included/upgraded ✅ |
| Per-place mute (Story 5.6) | FR17, FR26 (muted places) | Included ✅ |
| Delivery-time preference (Story 5.6; store-only `notif_time` in v1) | FR17 + addendum (v2 should honor it, hourly cron) | Included/upgraded ✅ |
| Global notification off; 1/day ceiling; oldest-wins tiebreak; "N more from this day" | FR17, FR13, FR16 | Included ✅ |
| Full-screen photo viewer/swipe (Story 3.7) | FR22 (+ pinch-zoom now in) | Included/upgraded ✅ |
| Save/sync status, saved-only-after-ack (Story 2.5) | NFR4 + FR10 save moment | Included ✅ |
| Anonymous/local-first mode + claim (Stories 1.4, 2.3) | FR23: "No anonymous mode on iOS" — explicit; web stays the anonymous front door (§1) | Superseded — explicit ✅ |
| Cross-account merge (Story 2.8) | §6: "mooted on iOS by signed-in-first; stays a web-only backlog item" | Excluded — explicit ✅ |
| zh-TW-first, externalized strings, native voice pass (UX-DR12, Story 6.1) | FR28 (strengthened: 語感 voice guide + Simon review) | Included/upgraded ✅ |
| Settings surface (Story 6.3) | FR26 (designed screen; all v1 rows present: account, notifications, default view, muted places, export, language) | Included ✅ |
| Sentry / ops (AR12) | NFR3 assumption (Sentry acceptable); NFR7 App Review | Included ✅ |
| Parchment/terracotta identity, dark deferred (DESIGN.md) | Addendum: EXPERIENCE/DESIGN named as "the inheritance; the visual language evolves, the soul doesn't" | Included by reference ✅ |

## 4. Findings

### H-1 (high) — The v2 PRD is append-only: no edit or delete for any user content
v1 shipped full edit/remove (Story 3.8; EXPERIENCE "Edit / remove": edit note/date, remove a photo, delete a pin, unmark a region — with the gentle-confirm durability pattern). The v2 PRD contains not one FR for correcting or removing a memory, visit, photo, or note. This is not plausibly a conscious cut (a keepsake app where a typo'd place name or a mis-dated visit is permanent contradicts NFR4's spirit and Simon's own v1 usage), and it interacts with two v2-specific changes:
- **Multi-visit (FR6)** creates a new object (the visit) with no stated delete/edit semantics at all.
- **Read-only derivation of legacy web marks (FR3)** means a mistakenly-marked region from the web era can *never* be un-visited from iOS — the one residue of the read-only decision the PRD does not acknowledge. (The removal of region *marking* is explicit and fine; the removal of region *unmarking* with no substitute is silent.)
Fix: add a Group B or F FR for edit/delete of memories, visits, photos, and notes (and state the legacy-mark story — e.g. "manage on web" or a one-time iOS affordance), or list the omission in §6 deliberately.

### H-2 (high) — Email magic-link sign-in dropped silently; FR25's continuity promise is at risk
v1 shipped magic-link + Google, with an explicit acceptance criterion that neither be the sole path (Story 2.2, AR6). v2 FR23 offers Apple + Google only — nowhere marked as a removal, and §6 is silent. Meanwhile FR25 promises "a user who used the web app signs into the same map on iOS." For a web user whose only identity is a magic-link email (especially a non-Gmail address), there is no path into that account on iOS; Sign in with Apple's private-relay emails make accidental account *splits* likely instead. Losing access to an existing map is exactly the category's cardinal sin the v1 PRD organized itself around. Fix: either add email sign-in on iOS, specify Supabase identity-linking behavior that provably covers existing web accounts, or explicitly scope the continuity promise (and say so in §6).

### M-3 (medium) — Offline read is a silent hole
v1 shipped an offline read-only experience (Story 4.6: cached shell + base map + already-loaded memories, calm "viewing only — reconnect to add" banner; AR5 base-map cache). v2 §6 excludes "offline capture" only — which by omission implies offline *read* is in scope, yet no FR requires tile caching, photo caching, or any defined no-connectivity behavior. A native travel app opened on a plane with a blank map would be a felt regression from the PWA. Fix: one FR (or NFR) stating the offline-read bar (e.g. cached tiles + previously viewed memories render offline), or move offline read explicitly into §6 Out.

### M-4 (medium) — The accessibility floor vanished
v1 defined and shipped a concrete floor (UX-DR11/Story 6.2): AA contrast, visited-never-by-color-alone texture cue, reduced-motion fades, the list view as the SR/keyboard path, ≥44px targets, CJK text scaling ~200%. The v2 PRD and addendum contain no accessibility requirement at all, despite every item having a stronger native equivalent (VoiceOver, Dynamic Type, Reduce Motion, Differentiate Without Color) and App Review/HIG exposure. Fix: an NFR carrying the v1 floor onto iOS primitives; cheapest to state now, expensive to retrofit after the SwiftUI build.

### M-5 (low/medium) — Photo limits and upload policy unstated on a shared bucket
v1's shipped pipeline resizes client-side (WebP ~2048px/q80), captures EXIF at upload (feeding re-live tier 2), and caps ~2GB/user, ~30/pin (AR7). v2 FR8 reuses `pin-photos` but says nothing about caps, resize/format from the native picker, or EXIF capture parity — while multi-visit multiplies per-place volume and the bucket is shared with the live web client (NFR6). The v1 PRD at least carried this as a named open question; v2 carries nothing. Fix: one line in FR8 or the addendum ("native uploads conform to the v1 pipeline contract: resize target, EXIF capture, per-user/per-visit caps — numbers ratified in architecture").

### L-6 (low) — Default-view landing and the onboarding view question dropped without a word
v1 FR8/FR16: onboarding asks world-vs-focus-country and the app lands on the chosen view at login. v2 FR24's first-run has no view question, and no FR states what view the app opens to; "default view" survives only as a settings row (FR26). Probably intentional (guided-first-memory replaces the whole onboarding), but the landing behavior itself (v1 FR8) is now unspecified. Fix: a clause on FR24/FR26 ("app opens to the user's default view; first-run default = world" or similar).

## 5. Explicit supersessions verified (no finding — the claim's honest half)
- Region marking → read-only map (FR3, plus Open Questions "RESOLVED"). ✅
- Tap-to-place → long-press sole write gesture (FR5). ✅
- Anonymous mode → signed-in-first (FR23; web remains the anonymous front door, §1). ✅
- Region-tap backfill → empty-memory capture loop (FR11, "replaces … entirely"). ✅
- Cross-account merge → mooted, web-only backlog (§6). ✅
- PWA install/web push → native APNs (§1 Why v2, FR14). ✅
- Flat places list → geographic browse hierarchy (FR20). ✅
- Proximity clustering → geography clustering (FR2, explicitly "upgrade over v1"). ✅

## 6. Verdict

The parity claim is **mostly earned but not yet true as written**. Roughly 85–90% of v1's shipped capability is included, upgraded, or superseded by decisions the PRD states out loud — the supersession hygiene (read-only map, signed-in-first, backfill replacement) is genuinely good. But the PRD fails its own claim in four silent places, two of them serious: it defines an **append-only product** (no edit/delete of any content, H-1) and it **silently drops the email sign-in path** while promising account continuity (H-2). Offline read (M-3) and the accessibility floor (M-4) are v1 shipped behaviors with obvious iOS equivalents that the PRD neither carries nor excludes; photo policy (M-5) and default-view landing (L-6) round it out. All six are one-to-three-line PRD amendments — fix them in §3/§6 before the UX phase inherits the holes.
