---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: 'complete'
readiness: 'READY'
project_name: 'Mapsake v2 (native iOS)'
date: '2026-07-13'
documentsAssessed:
  - prds/prd-travel-map-2026-07-02/prd.md
  - prds/prd-travel-map-2026-07-02/addendum.md
  - architecture-travel-map-2026-07-09/architecture.md
  - epics-travel-map-2026-07-13/epics.md
  - ux-designs/ux-travel-map-2026-07-02/DESIGN.md
  - ux-designs/ux-travel-map-2026-07-02/EXPERIENCE.md
  - ux-designs/ux-travel-map-2026-07-02/mockups/voice-guide.md
documentsExcluded:
  - prds/prd-travel-map-2026-06-16 (v1 web, superseded)
  - architecture.md (v1 web, superseded)
  - epics.md (v1 web, superseded)
  - ux-designs/ux-travel-map-2026-06-16 (v1 web, superseded)
---

# Implementation Readiness Assessment Report

**Date:** 2026-07-13
**Project:** Mapsake v2 (native iOS)

## Document Inventory

Assessing the **v2 (native iOS)** document set. The v1 (web) documents are excluded as superseded (retained as the record for the live web app at mapsake.simon198.com).

| Type | Document (assessed) | Status |
|---|---|---|
| PRD | `prds/prd-travel-map-2026-07-02/prd.md` (+ addendum) | final |
| Architecture | `architecture-travel-map-2026-07-09/architecture.md` | complete |
| Epics & Stories | `epics-travel-map-2026-07-13/epics.md` (6 epics, 33 stories) | complete |
| UX | `ux-travel-map-2026-07-02/` DESIGN.md + EXPERIENCE.md + mockups/voice-guide.md | final |

No whole-vs-sharded duplicates. All required documents present.

## PRD Analysis

### Functional Requirements (31)

- **Group A — Map:** FR1 native PMTiles parchment map at Google-Maps fluidity · FR2 geographic clustering with counts · FR3 read-only map, derived visited fill (memories ∪ legacy marks), region-marking removed on iOS.
- **Group B — Capture:** FR4 place/address search front door · FR5 long-press + draggable fine-tune with reverse-geocoded preview · FR6 multi-visit pins (shared-backend change, web reads+writes) · FR7 optional visit dates · FR8 date-led photo suggestions (contextual full/limited auth, on-device) · FR9 per-visit notes · FR10 save moment · FR11 capture loop / backfill · FR12 session recap · FR29 edit and remove.
- **Group C — Re-live:** FR13 per-visit eligibility engine + contentless down-weight · FR14 native APNs photo-rich push (NSE) · FR15 deep-link to that visit · FR16 "N more from this day" cohort · FR17 one notification-control surface · FR18 on-this-day widget (now IN for v2.0 per Simon 2026-07-13).
- **Group D — Browse:** FR19 first-class browse nav · FR20 geographic organization · FR21 search serves browse · FR22 photo viewer with pinch-zoom · FR31 offline read.
- **Group E — Account:** FR23 signed-in-first (Apple/Google/email) + identity continuity · FR24 first-run flow · FR25 same Supabase accounts as web · FR30 in-app account deletion + Apple token revocation.
- **Group F — Care:** FR26 designed settings + account surface + default view · FR27 export · FR28 zh-TW native voice (voice-guide process, Simon-arbitrated).

**Total FRs: 31.**

### Non-Functional Requirements (8)

NFR1 Fluidity (60fps map/photo, <100ms capture) · NFR2 APNs delivery (≥99% accepted, photo + text fallback) · NFR3 Privacy (contextual photo auth, on-device suggestions, Sentry-only) · NFR4 Durability (ack-before-saved) · NFR5 iOS 17+ · NFR6 Backend compatibility (no web breakage, reads AND writes) · NFR7 App Store readiness · NFR8 Accessibility (VoiceOver, Dynamic Type incl. zh-TW, Reduce Motion, AA, ≥44pt, visited never color-alone).

**Total NFRs: 8.**

### Additional Requirements & Constraints (from PRD + addendum)

- **Stack decided:** native Swift/SwiftUI, iOS 17+, `supabase-swift`, `maplibre-native` (PMTiles), APNs via NSE.
- **Backend reused:** same Supabase project as the live web client; every backend change must keep the web client reading AND writing (NFR6).
- **⛔ Architecture-phase blockers (both resolved):** multi-visit data model + web write-compat; geocoding provider (Apple vs OSM).
- **Open PRD questions:** empty-memory placement granularity (resolved → approximate region pin), graduated re-live curation (post-v2), EXIF strip-vs-declare (resolved → strip), cross-channel push cap (verified per-user).
- **Assumptions:** web maintenance-only during v2; English post-v2; monetization deferred (free at launch); iPad/Android out.

### PRD Completeness Assessment

The v2 PRD is final, coherent, and unusually complete for planning: numbered FRs/NFRs, an explicit scope (in/out), a resolved assumptions index, and named ⛔ blockers that the architecture phase has since closed. All 31 FRs are testable. No requirement gaps found at the PRD level.

## Epic Coverage Validation

### Coverage Matrix (PRD FR → Epic/Story)

| FR | Epic / Story | Status |
|---|---|---|
| FR1 | E1 · 1.5 (map render, PMTiles) | ✓ |
| FR2 | E1 · 1.6 (geographic clusters) | ✓ |
| FR3 | E1 · 1.6 (read-only, derived fill) | ✓ |
| FR4 | E2 · 2.2 (search) | ✓ |
| FR5 | E2 · 2.3 (long-press + fine-tune) | ✓ |
| FR6 | E1 · 1.4 (schema) → E2 · 2.1/2.3/2.7 (write + sheet) | ✓ |
| FR7 | E2 · 2.4 (optional date) | ✓ |
| FR8 | E2 · 2.5 (date-led photos, EXIF strip) | ✓ |
| FR9 | E2 · 2.5 (per-visit note) | ✓ |
| FR10 | E2 · 2.6 (save moment) | ✓ |
| FR11 | E2 · 2.6/2.8 (loop / backfill) | ✓ |
| FR12 | E2 · 2.6 (recap) | ✓ |
| FR13 | E3 · 3.2 (per-visit engine) | ✓ |
| FR14 | E3 · 3.3/3.4 (APNs sender + NSE) | ✓ |
| FR15 | E3 · 3.5 (deep-link landing) | ✓ |
| FR16 | E3 · 3.5 (cohort chip) | ✓ |
| FR17 | E3 · 3.6 (notification controls) | ✓ |
| FR18 | E6 · 6.2 (widget) | ✓ |
| FR19 | E4 · 4.1 (first-class browse) | ✓ |
| FR20 | E4 · 4.1 (geographic org) | ✓ |
| FR21 | E4 · 4.2 (search-jump) | ✓ |
| FR22 | E2 · 2.7 (photo viewer, pinch) | ✓ |
| FR23 | E5 · 5.1/5.2 (sign-in + continuity) | ✓ |
| FR24 | E6 · 6.1 (first-run) | ✓ |
| FR25 | E5 · 5.1/5.2 (same accounts) | ✓ |
| FR26 | E5 · 5.3 (settings + default view) | ✓ |
| FR27 | E5 · 5.4 (export) | ✓ |
| FR28 | E1 · 1.2 (machinery) → all → E6 · 6.3 (blessing) | ✓ |
| FR29 | E2 · 2.9 (edit & remove) | ✓ |
| FR30 | E5 · 5.5 (deletion + token revoke) | ✓ |
| FR31 | E4 · 4.3 (offline read) | ✓ |

### Missing Requirements

**None.** Every PRD FR traces to at least one story with acceptance criteria. No stories exist in the epics that lack a PRD basis (the migration-proof story 2.1 and the soul-spike 3.1 are de-risking enablers for FR6/NFR6 and FR13-14 respectively, not orphan scope).

### Coverage Statistics

- Total PRD FRs: **31**
- FRs covered in epics: **31**
- Coverage: **100%**
- NFR coverage: 8/8 (NFR1 E1/E2, NFR2 E3, NFR3 E2/E3, NFR4 E2, NFR5 E1, NFR6 E1/E2, NFR7 E6, NFR8 E1+all)
- UX-DR coverage: 14/14

## UX Alignment Assessment

### UX Document Status

**Found** — DESIGN.md + EXPERIENCE.md (both `status: final`) + a **locked** 語感 voice guide, all in `ux-travel-map-2026-07-02/`, plus a Simon-approved 14-frame prototype.

### UX ↔ PRD Alignment

Strong. The spines are written *against* the PRD — they inherit FR/NFR numbers and journeys (UJ-1–4) rather than restating them. UX-originated decisions (per-visit note field on the photo step, the approximate region-backfill pin, the explicit `完成這次記錄` recap trigger, ink-text selected chips for AA, tap-to-move fine-tune) were all folded back into the PRD/epics. No UX requirement contradicts the PRD.

### UX ↔ Architecture Alignment

Strong. The architecture provisions every UX need: the parchment tokens → `MapsakeDesign`; MapLibre-native for the map; the single `.mapsakeMotion` gate for the save + re-live glow; sheet-over-map grammar; offline read via the `OfflineCache` actor; the a11y machinery (`.mapsakeAccessible`, VoiceOver orders) and the voice/candidate-string system. NFR1 fluidity is architecturally addressed (native map + `@Observable`), with concrete proof gated on the deferred map-layer call.

### Alignment Issues

None blocking. Story-scoped UX open items (carried in both spines' Open Items, and acceptable to resolve at build): SwiftUI `presentationDetents` set, edit/remove entry-point framing (FR29 behavior is specified, screens are not), intro pages 2–3 content, the Latin wordmark face (post-launch asset pass).

### Warnings

- ⚠️ **The widget (FR18) now has no visual design.** It was a stretch goal the UX spines left unframed ("only needed if epic planning votes it IN"); Simon committed it to v2.0 on 2026-07-13. It lands last (Story 6.2, Epic 6), so it doesn't block anything, but **Story 6.2 will need a short UX touch-up** (widget layout + the `N 年前` caption treatment) before or at its build. Recorded, not a readiness blocker.

## Epic Quality Review

Reviewed all 6 epics / 33 stories against the create-epics-and-stories standards (user value, epic independence, no forward dependencies, story sizing, AC quality, just-in-time entity creation).

### 🔴 Critical Violations

**None.** No technical-milestone epics, no epic-level forward dependencies, no epic-sized unsplittable stories.

### 🟠 Major Issues

- **[FIXED during this review] Story 3.1 → 3.4 forward dependency.** The soul spike promised a photo-rich push, but photo-on-notification requires an NSE, whose production story was 3.4 — a forward dependency. **Remediation applied:** Story 3.1 now scopes a *minimal* photo-attach NSE (so it stands alone) and Story 3.4 was rewritten to *harden* that NSE (read-only token, size limits, fallback). No forward dependency remains.

### 🟡 Minor Concerns (acceptable, noted)

- **Enabler stories with no direct user value:** Stories 1.1–1.4 (scaffold, tokens/machinery, data boundary, DDL) and 2.1 (migration-proof write) are technical enablers. Acceptable under the greenfield-setup exception (a native app needs an initial-setup arc) and the deliberate de-risking strategy (2.1 proves the shared-DB migration before the UX). Recorded, not a defect.
- **`apns_device_tokens` table creation** was implicit; now explicitly assigned to Story 3.1 (the first story needing a device token) during this review.
- **Error-path ACs are thin on a few stories** (e.g. 2.2 search no-results, 5.1/5.2 sign-in cancel). Acceptable because `bmad-create-story` expands each story's full context + edge cases just-in-time; the UX spines already specify these states (UX-DR14). Flag for the per-story spec pass.
- **Epic 2 is large (9 stories).** Justified — a single cohesive domain (the capture ritual + its migration proof); splitting would create an artificial part-1/part-2 boundary. Pace it at sprint planning.

### Best-Practices Compliance

| Check | Result |
|---|---|
| Epics deliver user value (greenfield setup arc excepted) | ✓ |
| Epic independence (no Epic N → N+1) | ✓ |
| No within-epic forward dependencies | ✓ (after the 3.1/3.4 fix) |
| Stories single-session-sized | ✓ |
| Entities created just-in-time, not upfront | ✓ (DDL in 1.4, tokens in 3.1, reaping with 2.9) |
| Starter-template setup is Story 1.1 | ✓ |
| Given/When/Then ACs, testable | ✓ |
| FR traceability maintained | ✓ (100%) |

## Summary and Recommendations

### Overall Readiness Status

**READY.** The v2 planning set (PRD, UX, Architecture, Epics/Stories) is complete, internally aligned, and traceable end-to-end. 100% FR coverage, 8/8 NFRs, 14/14 UX-DRs. The one structural defect found (a story-level forward dependency) was fixed during the review. No open blockers.

### Critical Issues Requiring Immediate Action

**None.** Zero critical findings across document inventory, PRD analysis, coverage, UX alignment, and epic quality.

### Issues Addressed / Noted

- **[Fixed]** Story 3.1→3.4 forward dependency (soul spike's photo-rich push): 3.1 now scopes a minimal NSE; 3.4 hardens it.
- **[Noted, story-scoped]** The now-committed widget (FR18/Story 6.2) has no visual design — needs a short UX touch-up before that story builds (it's last, in Epic 6).
- **[Noted, acceptable]** Foundation/enabler stories (1.1–1.4, 2.1) have no direct user value — expected for a greenfield native app + the deliberate de-risking strategy.
- **[Deferred to per-story specs]** Thin error-path ACs on a few stories — `bmad-create-story` expands these just-in-time against UX-DR14.

### Recommended Next Steps

1. **Run `bmad-sprint-planning`** to sequence the 33 stories into a sprint plan.
2. **Resolve the two spikes at their gate points:** the geocoding provider (Apple vs OSM, before Story 2.2) and the MapLibre DSL-vs-raw call (at Story 1.5).
3. **Book a widget UX touch-up** before Story 6.2 (Epic 6).
4. **Begin the story cycle at Story 1.1** — `bmad-create-story` writes the detailed spec, then `bmad-dev-story` implements.

### Final Note

This assessment reviewed 6 epics / 33 stories and 4 planning documents across 6 validation passes. It found **1 major issue (fixed), 4 minor concerns (accepted/deferred), and 1 UX warning (story-scoped)** — no critical issues and no open blockers. **The plan is ready for implementation.** Assessor: PM readiness review, 2026-07-13.
