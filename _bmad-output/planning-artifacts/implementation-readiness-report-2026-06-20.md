---
stepsCompleted: [1, 2, 3, 4, 5, 6]
status: complete
project_name: travel-map
date: 2026-06-20
inputDocuments:
  - prds/prd-travel-map-2026-06-16/prd.md
  - prds/prd-travel-map-2026-06-16/addendum.md
  - architecture.md
  - epics.md
  - ux-designs/ux-travel-map-2026-06-16/DESIGN.md
  - ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md
---

# Implementation Readiness Assessment Report

**Date:** 2026-06-20
**Project:** travel-map (Mapsake)

## Document Inventory

| Type | Document | Format |
|------|----------|--------|
| PRD | `prds/prd-travel-map-2026-06-16/prd.md` (+ `addendum.md`) | whole |
| Architecture | `architecture.md` (status: complete) | whole |
| Epics & Stories | `epics.md` (status: complete) | whole |
| UX Design | `ux-designs/ux-travel-map-2026-06-16/DESIGN.md` + `EXPERIENCE.md` (status: final) | whole |

**Duplicates:** none (no sharded/whole conflicts).
**Missing:** none (all four document types present).

## PRD Analysis

### Functional Requirements (24)
- FR1 — sign up / sign in to a personal account.
- FR2 — data persists durably; survives logout, reinstall, device change.
- FR3 — map and memories sync across devices.
- FR4 — export own data.
- FR5 — one continuous zoomable map (world→country→admin-1), shared data, no mode toggle.
- FR6 — mark visited (binary) at country + admin-1; visited also derives (rolls up) from a contained pin/visited child; no downward cascade.
- FR7 — visited renders filled (explicit or rolled-up); unvisited stays plain.
- FR8 — at login, land on chosen default view (world or focus country).
- FR9 — place a pin by tapping a spot + naming it (lands at tapped coords).
- FR10 — multiple named pins within the same admin-1 region.
- FR11 — attach photos to a pin.
- FR12 — write a note on a pin.
- FR13 — optional date on a pin (date picker); never required.
- FR14 — per-pin memory view (name, photos, note, date).
- FR15 — "add details later" everywhere; a bare mark (region or pin) is complete, never flagged incomplete.
- FR16 — onboarding first asks default view (world, or focus country → pick).
- FR17 — rapid tap-to-mark backfill adapting to the chosen view.
- FR18 — change default view later in settings.
- FR19 — onboarding prompts PWA install (incl. iPhone) for notifications.
- FR20 — detect "on this day" pins (recorded date matches current day in an earlier year).
- FR21 — deliver memory-text notification (place + how long ago); never an engagement nag.
- FR22 — tapping the notification lands on map + memory together (map zoomed to pin/region, pin highlighted, memory open).
- FR23 — from the landing, freely wander/re-live other pins.
- FR24 — search a place by name and place a pin snapped to its true coordinates (geocoding), alongside tap-to-place. **Pulled into v1 (2026-06-20).**

Total FRs: **24**

### Non-Functional Requirements (6)
- NFR1 — durability & reliability: no data loss under any normal operation (top quality bar).
- NFR2 — privacy by design: a user's map/memories visible only to them; no social exposure in v1.
- NFR3 — sync consistency: edits propagate without conflicting states that drop data.
- NFR4 — performance/fluidity: smooth map zoom/pan; fast memory + photo loads.
- NFR5 — web-first, mobile-ready: responsive web/PWA min; API-first backend; no web-only lock-in.
- NFR6 — photo durability: photos stored durably at adequate viewing resolution.

Total NFRs: **6**

### Additional Requirements / Constraints
- Out of v1 by design: live GPS tracking, social/sharing, native mobile app.
- Parked/fast-follow: GeoNames dataset-backed search (the v1 search may use a hosted geocoder), memory reel, wishlist, print map, year-in-review, fuzzy-time, EXIF pre-fill (note: EXIF capture date is used by the re-live eligibility model), photo clustering.
- Open/non-UX: name/domain/trademark verification (pre-launch).

### PRD Completeness Assessment
Complete and internally consistent for v1. The 2026-06-20 scope changes (A+ multi named pins; FR24 search into v1) are reflected in the FR list, scope section, and a dated change note. PRD `status` is still `draft` (cosmetic — content is final); worth flipping to a finalized status, non-blocking.

## Epic Coverage Validation

### Coverage Matrix (FR → Epic / Story)
| FR | Epic / Story | Status |
|----|--------------|--------|
| FR1 | E2 · 2.1, 2.2 (magic-link + Google) | ✓ |
| FR2 | E1 · 1.3 (anon persistence) + E2 · 2.3, 2.5 | ✓ |
| FR3 | E2 · 2.4 (cross-device sync) | ✓ |
| FR4 | E2 · 2.6 (export) | ✓ |
| FR5 | E1 · 1.2, 1.6 (continuous map) | ✓ |
| FR6 | E1 · 1.4, 1.5 + E3 · 3.9 (mark + roll-up incl. pins) | ✓ |
| FR7 | E1 · 1.4, 1.5 (visited render) | ✓ |
| FR8 | E4 · 4.2 (land on chosen view) | ✓ |
| FR9 | E3 · 3.1 (tap-to-place pin) | ✓ |
| FR10 | E3 · 3.3 (multiple pins/region) | ✓ |
| FR11 | E3 · 3.6 (photos) | ✓ |
| FR12 | E3 · 3.5 (note) | ✓ |
| FR13 | E3 · 3.5 (optional date) | ✓ |
| FR14 | E3 · 3.4 (per-pin memory view) | ✓ |
| FR15 | E3 · 3.8 + E1 add-later behavior | ✓ |
| FR16 | E4 · 4.1 (default-view question) | ✓ |
| FR17 | E4 · 4.3 (backfill rhythm) | ✓ |
| FR18 | E4 · 4.2 (change default view) | ✓ |
| FR19 | E4 · 4.5 (PWA install nudge) | ✓ |
| FR20 | E5 · 5.2 (on-this-day + eligibility) | ✓ |
| FR21 | E5 · 5.3 (notification send) | ✓ |
| FR22 | E5 · 5.4 (deep-link landing) | ✓ |
| FR23 | E5 · 5.5 (free wandering) | ✓ |
| FR24 | E3 · 3.2 (search-to-place) | ✓ |

### Missing Requirements
None. Every PRD FR maps to at least one story. No story claims an FR absent from the PRD (the epics inventory mirrors the PRD's FR1–24, including FR24).

### Coverage Statistics
- Total PRD FRs: **24**
- FRs covered in epics: **24**
- Coverage: **100%**

## UX Alignment Assessment

### UX Document Status
**Found** — `DESIGN.md` (visual identity) + `EXPERIENCE.md` (behavior), both `status: final`.

### UX ↔ PRD Alignment
Aligned. The named journeys (UJ-1/2/3) are shared; the pin model, zh-TW-first, and light-only-v1 match across both. Both were updated together for the A+ multi pivot, so the core memory unit is consistent.

### UX ↔ Architecture Alignment
Strongly aligned: bottom sheet (Vaul Drawer), pin + cluster rendering (MapLibre), texture cue, AA-corrected tokens, zh-TW labels (Wikidata gazetteer), re-live deep-link landing, responsive rules (≥840 split / landscape / keyboard-compose), and local-first auth (anon session → magic-link/Google) all correspond between EXPERIENCE.md and `architecture.md`.

### Alignment Issues
- **[SHOULD-FIX] Offline behavior is stale in EXPERIENCE.md.** Two rows in EXPERIENCE.md State Patterns predate the architecture's sync simplification and now contradict it:
  - "Saving / sync" row: "offline edits read as 'saved on this device, will sync'"
  - "Offline (installed PWA)" row: "edits queue and sync on reconnect"
  These describe an **offline write queue**, but the Architecture decided **online-writes-only for v1** (offline = read-only cached shell + write-disabled banner; offline outbox deferred). The **Epics are already correct** (Story 4.6 = offline read-only + write banner) and the Architecture is correct; only EXPERIENCE.md's two rows lag.
  - **Impact:** low for build (epics + arch govern implementation), but the spine would mislead a developer reading it directly.
  - **Recommendation:** update those two EXPERIENCE.md rows to "viewing only offline; writes disabled with a calm banner; offline-write queue is a documented fast-follow."

### Warnings
None beyond the SHOULD-FIX above. UX is a first-class, complete input; architecture supports every UX requirement.

## Epic Quality Review

### Best-Practices Checklist (all epics)
- [x] Epics deliver user value (not technical milestones)
- [x] Each epic functions independently (forward-only dependencies: E1 → E2/E3 → E4 → E5 → E6)
- [x] Stories appropriately sized for a single dev session
- [x] No forward dependencies within any epic (each Story N.M builds only on earlier stories)
- [x] Database tables created when first needed (profiles/region_marks → 1.3; pins → 3.1; photos → 3.6; push_subscriptions → 5.1) — no big-bang schema
- [x] Acceptance criteria in Given/When/Then, testable
- [x] FR traceability maintained (100% per coverage matrix)
- [x] Greenfield starter story present (Story 1.1 = `with-supabase` init + CI/deploy early)

### 🔴 Critical Violations
None.

### 🟠 Major Issues
None.

### 🟡 Minor Concerns (non-blocking; address at `bmad-create-story` time)
1. **Story 1.2 sizing** — bundles the tile-build pipeline, the MapLibre render, *and* the phone-performance spike. Likely two dev sessions; consider splitting (tiles pipeline / render) when the story is prepared.
2. **Epic 6 altitude** — "Launch-ready" mixes cross-cutting completion passes (i18n, a11y, performance, ops). Acceptable by design (tokens + baseline a11y are threaded into earlier epics), but it's the least user-value-pure epic; keep its stories framed by user outcome (the app works in Chinese, for everyone).
3. **Qualitative ACs** — a few ACs are inherently fuzzy (e.g. Story 6.4 "stays smooth"). Tighten with concrete targets (frame budget, tile size, load thresholds) at story-prep time.

### Remediation
All minor concerns are deferrable to the `bmad-create-story` step (which re-derives each story with full context). None block sprint planning.

## Summary and Recommendations

### Overall Readiness Status
**READY** — proceed to Phase 4 (sprint planning / implementation).

PRD ↔ Epics ↔ Architecture ↔ UX are aligned: 100% FR coverage, no critical or major epic-quality violations, and the architecture supports every UX requirement. The mid-stream changes (A+ multi named pins; FR24 search into v1) were propagated consistently across the PRD, epics, and UX.

### Issues by severity
- **Critical:** 0
- **Major:** 0
- **Should-fix (1):** EXPERIENCE.md offline rows ("edits queue and sync on reconnect" / "saved on this device, will sync") contradict the architecture's online-writes-only v1. Epics + architecture are correct; only the spine lags.
- **Minor (3):** Story 1.2 sizing (split tiles/render); Epic 6 cross-cutting altitude; a few qualitative ACs to tighten.
- **Cosmetic (1):** PRD frontmatter still `status: draft` (content is final).

### Recommended Next Steps
1. **Reconcile EXPERIENCE.md** offline/saving rows to "viewing only offline; writes disabled with a calm banner; offline-write queue is a documented fast-follow." (Quick edit; removes the one real inconsistency.)
2. Proceed to **`bmad-sprint-planning`** to sequence the 39 stories for execution.
3. At each **`bmad-create-story`**, fold in the minor concerns (split Story 1.2, tighten qualitative ACs).
4. Optional: flip PRD `status` to a finalized value; update the WDS config `product_languages` to zh-TW (noted earlier).

### Final Note
This assessment found **1 should-fix, 3 minor, and 1 cosmetic** issue across coverage, UX alignment, and epic quality — and **zero blocking issues**. The plan is implementation-ready. You may fix the should-fix now or proceed as-is and address it when EXPERIENCE.md is next touched.

**Assessor:** Implementation Readiness workflow · **Date:** 2026-06-20

### Post-assessment resolution (2026-06-20)
- ✅ **Should-fix CLOSED:** EXPERIENCE.md "Saving / sync" and "Offline (installed PWA)" rows updated to the online-writes-only v1 model (read-only offline + write-disabled banner; durable-write "saved" after ack; offline-write queue = fast-follow). All four documents now consistent on offline behavior.
- Remaining: 3 minor (deferred to `bmad-create-story`) + 1 cosmetic (PRD status). Non-blocking.
