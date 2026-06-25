---
baseline_commit: 5205ecf
---

# Story 5.5: Free wandering from the landing

Status: done

<!-- Note: One open UX decision is flagged below (the "N more from this day" interaction). Confirm
     with Simon before dev-story; the Task breakdown assumes the recommended option. -->

## Story

As a user,
I want to keep re-living from the landing,
so that one resurfaced memory becomes a few.

## Acceptance Criteria

1. **Free wandering: from the landing, tapping another pin re-lives it too.** The re-live landing leaves the map fully interactive — tapping any other pin opens its memory (and glows it) exactly like a normal tap, with no modal trap. (Largely already true: the memory panel/sheet is non-modal and tapping a pin sets `selectedPinId`. This AC mainly guarantees the deep-link landing does not lock the map and that a wander target also flies/glows as a re-live.) [epics 5.5 AC1; EXPERIENCE 136]
2. **"N more from this day" is offered when memories share the date.** When the landed memory has other (non-muted) memories on the same anniversary day, a quiet affordance surfaces the count and lets the user move through them — "這天還有 N 個回憶". [epics 5.5 AC2; EXPERIENCE 131]

### ⚠️ UX decision — RESOLVED with Simon (2026-06-25)

**Option A: a tappable chip that cycles.** A quiet chip on the memory card — "這天還有 N 個回憶 →" — advances to the NEXT same-day memory (fly + glow + open), cycling through the cohort. Confirmed scope defaults:
- "This day" = the **anniversary** (same month-day, the set the 5-2 engine matches), not the exact same `memory_date` year.
- The affordance is **landing-only** (shown for the re-live cohort), not on every memory that happens to share a date.
- AC1 "pin/**region**" → "wander" = tap other PINS; a region tap keeps its existing behavior (no new region-as-memory concept).

### Decisions baked in (confirmed above)

- **Reuse 5-4's landing machinery + 5-2's date logic.** The shell already owns `selectedPinId` + `flyToMemoryTarget` and opens/glows on a deep-link (5-4). "Same day" reuses 5-2's `effectiveDate`/anniversary logic via a new EXPORTED pure helper `memoriesSharingDay(candidates, targetId)` — no duplicated date math, unit-tested like the rest of the engine.
- **Scope = the landing's wander + same-day cohort ONLY.** OUT: changing normal (non-landing) memory browsing; any new region-as-memory concept; notification controls (5-6).

## Tasks / Subtasks  (assume Option A — REVISE if Simon picks B/C)

- [x] **Task 1 — Same-day cohort helper (AC: 2)** [features/notifications/lib/eligibility.ts (MOD), e2e/eligibility.spec.ts (MOD)]
  - [x] Export a pure `memoriesSharingDay(candidates: MemoryCandidate[], targetId: string): MemoryCandidate[]` — other non-muted candidates whose effective-date month-day equals the target's (reuse the existing private `effectiveDate` + a month-day compare; exclude the target itself and muted). Stable order (oldest effective date first, then id) so cycling is deterministic.
  - [x] Unit tests (rollup pattern): a same-anniversary sibling is included; a different-month sibling is excluded; a muted sibling is excluded; the target itself is excluded; no siblings → empty.
- [x] **Task 2 — Re-live cohort in the shell (AC: 1, 2)** [features/memories/components/map-memory-shell.tsx (MOD)]
  - [x] On a deep-link landing, after the pin resolves, compute the cohort `[landedPin, ...memoriesSharingDay(pins, landedPin.id)]` (mapping `Pin → MemoryCandidate`) and hold it in state. Expose an `advanceReliveCohort()` that moves `selectedPinId` to the next cohort member AND updates `flyToMemoryTarget` so the map flies/glows the new one. Clearing the memory (close) clears the cohort. Normal taps (non-landing) do NOT set a cohort.
  - [x] Rework `flyToMemoryTarget` to fly on each NEW target (the 5-4 once-guard only fired once) — compare against a last-flown ref in MapCanvas so a cohort advance re-flies, but a re-render with the same target does not. (MapCanvas MOD.)
- [x] **Task 3 — "N more from this day" affordance (AC: 2)** [features/memories/components/memory-container.tsx or memory-card.tsx (MOD)]
  - [x] When the open memory is part of a re-live cohort of size > 1, render a quiet chip ("這天還有 {n} 個回憶", terracotta-link styling) that calls `advanceReliveCohort()`. Hidden otherwise. zh-TW draft, native pass in 6-1.
- [x] **Task 4 — Tests + validation (AC: 1, 2)** [e2e/relive.spec.ts (MOD)]
  - [x] e2e: drop two pins with the SAME memory_date (different places), deep-link to one, assert the "N more from this day" chip shows "1", tapping it opens the other pin's memory. Free wandering: from a landing, tapping a third (different-day) pin opens it normally. tsc/lint/build clean; full e2e green.

## Dev Notes

### Wiring (reuse 5-4)
- `MapMemoryShell` owns `selectedPinId` + `flyToMemoryTarget` and the deep-link landing (Story 5-4). The cohort + advance live here. [map-memory-shell.tsx]
- `MemoryContainer`/`MemoryCard` render the open memory; the chip slots into the card footer (quiet terracotta link, like ＋寫筆記). [memory-card.tsx:72+, 101]
- Same-day math reuses 5-2's `effectiveDate` (memoryDate → exifTakenAt → createdAt) — export a helper rather than duplicate. [features/notifications/lib/eligibility.ts]
- `flyToMemoryTarget` currently flies ONCE (`flewToMemoryRef`, 5-4). For cohort cycling, change it to fly when the target CHANGES (track last-flown coords) so each advance re-flies + the decluster step still runs. [MapCanvas.tsx]

### Scope guardrails
- NO new region-memory concept; NO change to normal memory browsing outside the landing cohort; NO notification controls (5-6). NO migration, no secrets, no new dep — CI-verifiable.

### References
- [Source: epics.md#Story-5.5 (lines 395-399); EXPERIENCE.md 131, 136; Stories 5-2 (effectiveDate/anniversary), 5-4 (landing: selectedPinId + flyToMemoryTarget + glow)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `relive.spec.ts`: 5/5 green (incl. the new cohort-cycle test: the chip shows and tapping it moves to another same-day memory). `eligibility.spec.ts`: 20 passed (incl. 4 new `memoriesSharingDay` cases). tsc/lint/build clean; full e2e 103 passed, 1 pre-existing skip, no flakes.

### Completion Notes List

- **Option A (cycling chip) per Simon.** `memoriesSharingDay` (pure, exported from the engine, reuses `effectiveDate`) builds the same-anniversary cohort; the shell holds `reliveCohort` + a `flyTarget`, opens/glows via the existing `selectedPinId`, and `advanceReliveCohort()` moves selection + re-flies to the next cohort member (cyclic). The chip ("這天還有 N 個回憶 →") renders in the memory card only when the open pin is in the cohort and there's a sibling.
- **`flyToMemoryTarget` reworked from once → fly-on-change** (a `lastFlownRef` key compare) so a cohort advance re-flies + re-declusters, while an unrelated re-render with the same target doesn't. 5-4's single-landing behavior is unchanged (first target still flies once).
- **Free wandering (AC1) needs no new code:** the memory panel is already non-modal and a normal pin tap sets `selectedPinId` → opens it; tapping a non-cohort pin drops out of the cohort (chip hides). Closing the memory clears the cohort, so normal browsing never shows the chip.
- **Scope held:** "this day" = anniversary (month-day, reusing the engine), landing-only, pins-only — all per Simon. No region-as-memory, no migration, no secrets, no new dep.

### File List

- `features/notifications/lib/eligibility.ts` (MOD — exported `memoriesSharingDay`)
- `features/memories/components/map-memory-shell.tsx` (MOD — cohort state, landing builds the cohort + flyTarget, advance, close clears)
- `features/map/components/MapCanvas.tsx` (MOD — `flyToMemoryTarget` flies on change, not once)
- `features/memories/components/memory-container.tsx` (MOD — forwards `reliveMore`/`onReliveNext`)
- `features/memories/components/memory-card.tsx` (MOD — the "N more from this day" chip)
- `e2e/eligibility.spec.ts` (MOD — `memoriesSharingDay` tests)
- `e2e/relive.spec.ts` (MOD — cohort-cycle e2e + generalized drop helper)

### Change Log

- 2026-06-25 — Story created (context engine; grounded in epics 5.5 + EXPERIENCE 131/136 + the 5-4 landing wiring + 5-2 date logic). One open UX decision flagged (the "N more from this day" interaction model) for Simon before dev. Scope: landing wander + same-day cohort, reusing existing machinery. No migration/secrets/dep.
- 2026-06-25 — UX decision resolved with Simon: Option A (cycling chip) + anniversary / landing-only / pins-only defaults.
- 2026-06-25 — Dev-story complete. `memoriesSharingDay` + cohort cycling in the shell + the chip; `flyToMemoryTarget` fly-on-change. tsc/lint/build clean; full e2e 103 passed (relive 5/5, eligibility 20/20). Status → review.
- 2026-06-25 — Adversarial review (3 dimensions × skeptic verify, MapLibre source checked): 0 false positives, 2 confirmed (medium) fixed. Re-validated tsc/lint/build/e2e green. Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Changes Requested → both addressed · 3 dimensions (cohort correctness, the fly-on-change regression vs 5-4, chip gating + wander). Cohort math came back clean. Two real bugs from the implementation, both fixed.

### Action Items
- [x] **[Med] Stale decluster listener → camera fight on rapid cohort advance.** The fly-on-change rework registered a per-target `moveend` decluster listener with no cleanup; a new `flyTo` aborts the in-flight one and fires `moveend` synchronously, invoking the PREVIOUS target's listener (closed over the old coords) → the camera could be yanked back to the stale pin. **Fixed:** the effect now returns a cleanup that `map.off`s the pending listener before the next fly, registers the listener AFTER `flyTo` (so the abort-moveend isn't mistaken for this fly settling), and the decluster bails if `lastFlownRef` no longer matches its key. (Reduced-motion `jumpTo` keeps register-before.)
- [x] **[Med] Chip gating leak → "N more" reappears during normal browsing.** The cohort was cleared only on close, so a normal pin tap (in-place swap) left it intact; wandering back onto a same-day sibling later re-showed the chip. **Fixed:** map + Places taps now go through an `openPin` wrapper that clears the cohort first; the deep-link landing and the chip-driven advance set selection directly, preserving the cohort. So the chip stays landing/cycle-only. (A dedicated e2e would need fragile marker-click simulation; covered by the one-line gating fix + the existing cohort-cycle test.)
