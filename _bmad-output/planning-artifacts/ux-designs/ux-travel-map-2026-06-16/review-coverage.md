# UX Spine Coverage / Rubric Review — Mapsake

**Reviewed:** DESIGN.md, EXPERIENCE.md against .decision-log.md (canonical) and prd.md (FR/NFR coverage)
**Date:** 2026-06-17
**Context held:** zh-TW primary / English fast-follow; v1 LIGHT-ONLY (Lamplight dark = phase 2); web-first PWA keepsake.

**Overall:** The spines are genuinely strong on the *core loop* surfaces (map, memory panel/sheet, re-live, onboarding, notifications, empty states, i18n, type, color). They are internally consistent with each other and faithful to the decision log, and all token cross-references resolve. The real gaps are at the **edges the PRD requires but the loop doesn't dramatize**: account/auth, data export, sync/offline states, and photo-upload UX. These are FRs/NFRs with a real UX surface that currently have no home.

---

## Severity counts

- **BLOCKER:** 3
- **SHOULD-FIX:** 5
- **NICE-TO-HAVE:** 4

---

## 1. COVERAGE

### BLOCKER — FR4 (data export) has no UX home
**Location:** EXPERIENCE.md → IA table (line 30, Settings row) lists "Account/auth, notifications…, theme, language, per-memory mutes" — export is absent. No State Pattern or flow either.
**Why it matters:** FR4 is explicitly framed in the PRD as "the trust guarantee: the memories are theirs to take" — a load-bearing promise of a private keepsake, not a nice-to-have. There is currently zero UX surface for it (entry point, what gets exported, in-progress/done state).
**Fix:** Add "Export my data" to the Settings IA row, and add a State Pattern row for export (request → preparing → ready/download). One paragraph is enough; it doesn't need a full flow, but it needs a home.

### BLOCKER — FR1/FR2 account & auth screens are named but never specified
**Location:** EXPERIENCE.md → IA Settings row says "Account/auth"; PRD §7 flags auth method as OPEN (deferred to architecture). UJ-1 in EXPERIENCE.md opens at "New user lands; onboarding asks the default-view question" — it silently skips sign-up.
**Why it matters:** FR1 (sign up / sign in) is a v1 functional requirement and the literal first thing UJ-1 in the PRD says ("Simon signs up"). Even if the *auth method* is deferred to architecture, the *UX stance* (where sign-in sits relative to onboarding; is the map usable signed-out; sign-in screen register/tone) is a UX decision and is missing. The spine currently has no screen, no order, and no tone guidance for the first thing every user hits.
**Fix:** Add an Auth/sign-in surface to the IA table and a single line to UJ-1 step 0 ("sign up / sign in → then default-view question"). Note explicitly that auth *method* is deferred to architecture but the *placement and tone* are owned here. Flag whether onboarding precedes or follows account creation.

### BLOCKER — Photo batch-upload UX is asserted but unspecified (FR9, NFR6, UJ-3)
**Location:** EXPERIENCE.md UJ-3 step 3 ("eager batch photo upload") and Key Flows intro; Component Patterns "Add-detail affordances" row only covers the quiet "+ Add photos" link.
**Why it matters:** UJ-3 is one of the three named journeys and is explicitly the *frictionless, prominent* depth path. "Batch photo upload" is named but has no specified UX: no multi-select, no upload progress, no per-photo failure/retry, no thumbnail/ordering treatment, no large-camera-roll behavior. NFR6 (durable storage at adequate resolution) and NFR4 (photos load fast enough to keep the re-live moment unbroken) both have UX surfaces (upload progress, image loading/placeholder states) that are entirely absent from State Patterns.
**Fix:** Add a "Photo upload" State Pattern (selecting → uploading w/ progress → done; per-photo error + retry; the "hot camera roll / many photos at once" case from UJ-3). Add a photo *loading/placeholder* state for the re-live view (NFR4). Keep it light, but it must exist — it's a named-journey climax.

### SHOULD-FIX — Cross-device sync states have no UX (FR3, NFR3, NFR1)
**Location:** EXPERIENCE.md Foundation/State Patterns — sync is never mentioned. PRD FR3 (sync across devices), NFR3 (sync without conflicting states that could drop data), NFR1 (no loss on device switch).
**Why it matters:** "Nobody loses data" is a Stage-2 success metric and "any data-loss incident" is a counter-metric. Sync has UX-visible states: saving/saved indicator, offline-edit-then-reconcile, and (per NFR3) what the user sees if a conflict is detected. None are addressed. For a keepsake whose cardinal sin is data loss, the *trust signal* ("your changes are saved / synced") is a UX concern.
**Fix:** Add a State Pattern row for save/sync status (e.g. quiet "saved" affordance; offline → "saved on this device, will sync" tone) consistent with the "never nags" voice. Conflict-resolution detail can defer to architecture, but the user-facing reassurance posture should be stated.

### SHOULD-FIX — PWA offline shell behavior is unaddressed (NFR5, FR17)
**Location:** EXPERIENCE.md Foundation calls it a "Web-first PWA" with an install nudge, but there is no offline/connectivity state anywhere in State Patterns.
**Why it matters:** A PWA implies an offline shell. What does the user see with no connection — can they view already-loaded memories? Is the map usable offline? Is there an offline banner? The install nudge is covered, but the *installed PWA's* offline behavior (the reason to be a PWA) is not. This is a UX dimension of NFR5.
**Fix:** Add one State Pattern row for offline/connectivity (what's viewable offline, how degraded states read, tone). Even "v1: read-only view of cached memories, quiet offline indicator, edits queue" is enough to anchor it.

### SHOULD-FIX — FR16 (change default view in settings) not in the Settings IA
**Location:** EXPERIENCE.md IA table Settings row (line 30) enumerates settings but omits "default view." FR16 is a v1 FR.
**Why it matters:** Small but it's a named v1 requirement with an obvious settings home, and the IA row reads as exhaustive (it lists five things), so the omission looks like a miss rather than a deferral.
**Fix:** Add "default view (world / focus country)" to the Settings IA row.

---

## 2. INTERNAL CONSISTENCY

**Token cross-references: all resolve.** Every `{colors.*}`, `{rounded.*}`, `{typography.*}`, and `{components.*}` referenced in EXPERIENCE.md exists in DESIGN.md frontmatter. Spot-checked: `{colors.canvas-bg}`, `{colors.region-visited-fill}`, `{colors.accent}`, `{components.link-quiet}`, `{components.region-visited.texture}` — all present. No dangling tokens.

**Spine-vs-spine and spine-vs-decision-log: consistent.** The map+memory layout model, three snap points, notification cadence, empty-state principles, onboarding breadth-bet, CJK weight rule, and a11y texture cue all match the decision log faithfully. No contradictions found between the two spines.

### NICE-TO-HAVE — Map-label font-size value differs across docs
**Location:** DESIGN.md frontmatter `map-label.fontSize: 12px` and prose "~12px"; decision log says "~12–13px"; EXPERIENCE.md doesn't restate. Not a contradiction (spine is canonical and tighter), just noting the decision log's range narrowed to 12px — that's correct behavior, no action needed unless you want the log annotated.
**Fix:** None required; flagged only for traceability.

### NICE-TO-HAVE — Place/memory title size: 28–30px vs token `display: 30px` / `display-mobile: 24px`
**Location:** DESIGN.md prose "~28–30px (mobile ~24px)" vs frontmatter `display: 30px`. Consistent (prose is the indicative range, token is the pinned value). No action; noted for completeness.

---

## 3. SPINE-SHAPE COMPLETENESS

**DESIGN.md canonical sections — all present and substantive:** Brand & Style, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts. None thin or placeholder.

**EXPERIENCE.md canonical sections — all present and substantive:** Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows. (Plus two extra well-developed sections, Notifications & Re-live Trigger and Map & Localization.) None thin.

### SHOULD-FIX — State Patterns is the thin section relative to v1 scope
**Location:** EXPERIENCE.md → State Patterns (lines 61–72).
**Why it matters:** The section is well-written but covers only the *happy/quiet* states (blank map, bare mark, partial memory, multi-memory, muted, reduced-motion). It is missing every *system/error* state a shipping v1 has: photo-upload progress/failure, save/sync status, offline, auth errors, image load. These tie directly to the BLOCKER/SHOULD-FIX coverage gaps above. The "absence is normal" principle is beautifully handled; the "something went wrong / something is in progress" axis is absent.
**Fix:** Extend State Patterns with the upload, sync/save, and offline rows noted above — framed in the same quiet, non-scolding voice (errors that invite a retry, not errors that blame).

### NICE-TO-HAVE — Accessibility Floor doesn't name a target contrast ratio
**Location:** EXPERIENCE.md Accessibility Floor + DESIGN.md Colors "⚠ Open contrast item."
**Why it matters:** Both spines correctly *flag* the `region-border` contrast risk and defer numbers to Finalize, which is fine for a modest floor. But no WCAG target (AA / 4.5:1 text, 3:1 non-text) is stated anywhere, so "verify at Finalize" has no bar to verify against.
**Fix:** Add one line naming the intended floor (e.g. "text AA 4.5:1; meaningful non-text 3:1 where feasible") so the open item is checkable.

---

## 4. DANGLING / STALE (dark-mode = phase 2)

**No "ship dark mode" / dark-as-v1 statements found.** Checked thoroughly.

- DESIGN.md Colors keeps the full Lamplight palette in frontmatter and prose but frames it as the dark *mode* (no "v1 ships dark" claim). This matches the decision: "palette stays fully specified… ready to enable."
- EXPERIENCE.md IA Settings row lists "theme (Lamplight)" as a setting. **SHOULD-FIX (minor):** this reads as if a theme toggle ships in v1. Per the decision log, v1 is LIGHT-ONLY and Lamplight is phase 2 — a user-facing theme setting implies dark is shippable now.
  **Fix:** Either drop "theme (Lamplight)" from the v1 Settings row, or annotate it "(phase 2)" so the IA doesn't imply a v1 dark toggle.

### SHOULD-FIX — Neither spine states the v1 LIGHT-ONLY scope decision explicitly
**Location:** DESIGN.md Colors / EXPERIENCE.md Foundation.
**Why it matters:** The light-only-for-v1 / dark-deferred-to-phase-2 decision is canonical in the log but is *implicit* in the spines (the dark palette is simply present with no "v1 = light only" note). A downstream reader of DESIGN.md alone could reasonably assume both modes ship in v1 and build/test dark on every screen — exactly the scope the decision was made to avoid.
**Fix:** Add one line to DESIGN.md Colors (and/or EXPERIENCE.md Foundation): "v1 ships light-only; the Lamplight dark palette is fully specified and deferred to phase 2." This is the single highest-leverage stale-prevention edit.

---

## Summary of recommended edits (by priority)

1. **(BLOCKER)** Give FR4 export a UX home (Settings entry + export state).
2. **(BLOCKER)** Specify auth placement & tone in IA + UJ-1 step 0 (method stays deferred).
3. **(BLOCKER)** Specify photo batch-upload UX + image loading states (UJ-3 climax, NFR4/NFR6).
4. **(SHOULD-FIX)** Add sync/save and offline State Pattern rows (FR3, NFR1/NFR3, NFR5).
5. **(SHOULD-FIX)** Add FR16 default-view to Settings IA; clarify "theme (Lamplight)" as phase 2.
6. **(SHOULD-FIX)** State the v1 LIGHT-ONLY scope explicitly in DESIGN.md/EXPERIENCE.md.
7. **(NICE-TO-HAVE)** Name a contrast-ratio target for the a11y floor.
