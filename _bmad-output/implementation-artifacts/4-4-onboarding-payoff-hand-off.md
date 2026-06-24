---
baseline_commit: 2b5dd56
---

# Story 4.4: Onboarding payoff hand-off

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a new user,
I want to end onboarding inside my filled map,
so that the payoff is the map itself.

## Acceptance Criteria

1. **One gentle, skippable hand-off line at the end of backfill.** When the user finishes the backfill marking rhythm (Story 4.3's 完成), onboarding shows ONE calm, skippable line inviting them to add depth later — 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 (≈ "Use ＋ 新增回憶 to add pins, photos and memories"; points at the deliberate pin affordance, per the review decision). It is the *end-of-backfill* moment, not shown during marking. It must be skippable (a single quiet dismiss button, blocks nothing) and the freshly colored map stays visible behind it — the map is the payoff. [epics 4.4 AC1; EXPERIENCE UJ-1 step 5 line 169; Onboarding row line 32]
2. **Finish → drop into the filled map; nothing flagged incomplete.** Dismissing the hand-off closes onboarding into the freshly colored map. The bare visited marks are treated as COMPLETE — no progress meter, no "N places" count, no "incomplete"/"complete your profile" badge or nag anywhere in the hand-off or the dropped-in map. [epics 4.4 AC2; EXPERIENCE UJ-1 step 6 + note line 172; Banned-on-purpose line 71]
3. **No regression.** Story 4.3's backfill step (prompt + 完成), 4.1 question, 4.2 saved-view landing, tap-to-mark (1.5), the roll-up (3.9), and drop/open/unmark pins all still work. A returning user (stored default view) sees neither backfill nor the hand-off line. The 4.3 e2e (完成 hides the backfill prompt) still passes. [Epic 1-4 behavior]

## Tasks / Subtasks

- [x] **Task 0 — Scope boundary (4.4 vs 4.3)**
  - [x] 4.3 already built the backfill step (non-blocking prompt 「輕觸你去過的地方來上色」 + 完成) and `finishBackfill` closing onboarding. 4.4 INSERTS the gentle hand-off line as the *end-of-backfill* moment: 完成 now advances to a new `handoff` step (instead of closing), and dismissing the hand-off closes into the map. No new marking mechanics; no MapCanvas change. The account/"keep your map" prompt that sits after the payoff is Epic 2 (deferred) — 4.4 ends at the map, NOT at an account nudge. [EXPERIENCE line 22, 34: auth placement is "after the onboarding payoff", deferred to Epic 2]
- [x] **Task 1 — Add the "handoff" onboarding step (AC: 1, 2)** [features/onboarding/components/onboarding.tsx]
  - [x] Extend the step union to `"question" | "pick" | "backfill" | "handoff"`. Render `handoff` as a CALM, skippable card that does NOT hide the filled map: a non-blocking container (`pointer-events-none`) with a single `pointer-events-auto` card holding the one gentle line 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 + ONE quiet dismiss button (「開始探索」). NO progress meter / count / "incomplete" badge / nag (EXPERIENCE banned list, line 71). Add an `onDismiss: () => void` prop for the dismiss button. Single explicit dismiss only (no dismiss-on-map-tap).
  - [x] Keep it light and keepsake-toned: no full-screen dim that would hide the map (the question step's `bg-[...]/70` backdrop is for the blocking question only — the hand-off must let the payoff map show through). Position it so it does not cover the bottom-right ＋ 新增回憶 button (mirror the backfill layer's clearance).
- [x] **Task 2 — Wire the flow: backfill → handoff → map (AC: 1, 3)** [features/memories/components/map-memory-shell.tsx]
  - [x] Change `finishBackfill` so backfill's 完成 advances to the hand-off: `setOnboarding("handoff")` (was `setOnboarding(null)`). Add `finishHandoff = () => setOnboarding(null)` and pass `onDismiss={finishHandoff}` to `<Onboarding>`. `pickCountry` stays false during `handoff` (no marking-mode change). The 4.2 `initialView`/landing is unaffected.
  - [x] A returning user (stored view) still skips onboarding entirely (the mount gate `if (readDefaultView() === null) setOnboarding("question")` is unchanged) — no backfill, no hand-off.
- [x] **Task 3 — "Nothing flagged incomplete" audit (AC: 2)** [no new code expected beyond Task 1/2]
  - [x] Confirm the hand-off and the dropped-in map show NO progress meter, place count, "incomplete" badge, or "complete your profile" nag. Bare marks render via the existing roll-up (3.9) as complete trophies. If any such signal exists, remove it (it shouldn't — none is built today).
- [x] **Task 4 — Tests (AC: 1, 2, 3)** [e2e/onboarding.spec.ts]
  - [x] e2e (hand-off appears + dismiss drops into map): fresh context → answer 「看整個世界」 → backfill prompt 「輕觸你去過的地方來上色」 visible → click 「完成」 → the backfill prompt is hidden AND the gentle hand-off line 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 is visible → the map canvas is still visible behind it (payoff) → click 「開始探索」 → the hand-off line is hidden and no onboarding overlay remains; the map is interactive. (Session-free — no marking assertion needed.)
  - [x] e2e (no hand-off for returning user): seed `mapsake.defaultView` → load → neither the backfill prompt nor the hand-off line ever appears.
  - [x] Confirm the existing 4.3 test ("完成 drops into the map" → backfill prompt hidden) still passes — 完成 now advances to `handoff`, so the backfill prompt is still hidden after it; only the *follow-on* assertion (now hand-off) is new.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green. `bypassOnboarding` (seeds `{kind:"world"}`) keeps the other specs out of onboarding entirely — confirm no regression.

## Dev Notes

### Scope boundary (4.4 vs 4.1/4.2/4.3 and Epic 2)
- **4.1:** the default-view question + apply the initial view.
- **4.2:** land on the saved view on later opens.
- **4.3:** the backfill STEP between the question and the drop-in (non-blocking 「輕觸你去過的地方來上色」 prompt + 完成), reusing tap-to-mark (1.5). 完成 currently closes onboarding.
- **4.4 (this):** insert ONE gentle, skippable hand-off line at the *end* of backfill (the 完成 → `handoff` → dismiss flow), then drop into the filled map with nothing flagged incomplete. The map is the payoff.
- **Epic 2 (deferred):** the account/"keep your map across devices" prompt that EXPERIENCE places "right after the onboarding payoff." 4.4 ends at the map; it does NOT add an account nudge (Epic 2 wires the claim — see the epic-sequencing decision).

### Current state of files being modified
- **`features/onboarding/components/onboarding.tsx`** — presentational; `step: "question" | "pick" | "backfill"`, props `onChooseWorld`/`onChooseFocus`/`onBack`/`onDone`. The `backfill` and `pick` steps are non-blocking top layers (`pointer-events-none` container, `pointer-events-auto` on the actionable control); only the `question` step uses a dimming backdrop (`bg-[rgb(var(--map-frame))]/70`). The hand-off follows the NON-blocking pattern so the filled map shows through. Add the `handoff` branch + `onDismiss`. [Source: features/onboarding/components/onboarding.tsx]
- **`features/memories/components/map-memory-shell.tsx`** — `onboarding` state `"question"|"pick"|"backfill"|null`; `finishWorld`/`finishFocus` write the choice then `setOnboarding("backfill")`; `finishBackfill = () => setOnboarding(null)` is passed as `onDone`. Change `finishBackfill` to `setOnboarding("handoff")`; add `finishHandoff = () => setOnboarding(null)` passed as `onDismiss`. `pickCountry={onboarding === "pick"}` already excludes `handoff`, so no marking-mode change. [Source: features/memories/components/map-memory-shell.tsx]
- **`features/map/components/MapCanvas.tsx`** — NO change. `pickCountry` is false during `handoff`; the tap handler is untouched. The ＋ 新增回憶 button sits bottom-right; the hand-off card must not cover it (it sits centered/low but clears the button, same as the backfill layer). [Source: features/map/components/MapCanvas.tsx]

### Why a distinct "handoff" step (not folded into backfill)
The epic AC and UJ-1 separate the line ("at the END of backfill", step 5) from the marking rhythm (step 3) and the drop-in climax (step 6). A distinct step models that end-moment cleanly and reuses the established onboarding step pattern. Keep it non-blocking and single-dismiss so it reads as a quiet hand-off, never a gate or a task. [Source: EXPERIENCE UJ-1 lines 163-172]

### The payoff is the map (critical tone)
EXPERIENCE is emphatic: "the bare visited mark is *complete*, not a compromise" (line 172) and the banned list forbids progress meters / "0 photos" / "incomplete" badges / "complete your profile" nags (line 71). The hand-off is an INVITATION ("you *can* add depth later"), never an instruction or a completion gauge. One line, one dismiss, then the map.

### Regression note (4.3 e2e)
The 4.3 test clicks 完成 and asserts the backfill prompt is hidden. After 4.4, 完成 advances to `handoff` — the backfill prompt is still removed (the `backfill` branch no longer renders), so that assertion still holds. 4.4 adds the hand-off assertion as a new follow-on. Do not weaken the 4.3 test.

### Testing standards
- e2e on the `__mapsakeMap` harness; this story is fully session-free (no marking assertion required) so it is NOT blocked by the anon sign-in rate-limit. Seed `mapsake.defaultView` for the returning-user case. The `bypassOnboarding` helper keeps the other specs out of onboarding.

### Project Structure Notes
- Touches only `features/onboarding` + the shell flow + the e2e spec. No MapCanvas change, no new files, no dependency, no migration. MapLibre stays confined to features/map.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-4.4 (lines 28-32)]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md UJ-1 lines 163-172 (step 5 gentle line, step 6 payoff, "bare mark is complete" note); Onboarding row line 32; Account placement lines 22 & 34 (after payoff, deferred to Epic 2); Banned-on-purpose line 71]
- [Source: features/onboarding/components/onboarding.tsx; features/memories/components/map-memory-shell.tsx; features/map/components/MapCanvas.tsx; e2e/onboarding.spec.ts]

### Resolved with Simon (2026-06-24)
1. **Hand-off shape:** RESOLVED — distinct, non-blocking `handoff` step (one gentle line + a single 「開始探索」 dismiss, map visible behind).
2. **Copy:** RESOLVED — initial choice 「點擊任何地方，加入圖釘、照片和回憶」, then revised at code review to 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 (points at the ＋ affordance rather than reading as a tap-to-add instruction). Dismiss button 「開始探索」.
3. **Dismiss affordance:** RESOLVED — single explicit button only; no dismiss-on-map-tap.

### Review Findings

- [x] [Review][Decision] Hand-off copy invites "add a pin" but a tap behind the non-blocking card marks a region [features/onboarding/components/onboarding.tsx:31] — RESOLVED (Simon): point the copy at the real affordance. Line changed 「點擊任何地方，加入圖釘、照片和回憶」 → 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 (the ＋ button reads "＋ 新增回憶", verified). The copy no longer reads as a tap-to-add instruction, so the pass-through (non-destructive region mark behind the card) no longer contradicts it. tsc clean; 4.4 e2e green with the new string.
- [x] [Review][Defer] Hand-off card has no dialog role / aria / Escape and uses bg-card/95 (contrast over busy map) [features/onboarding/components/onboarding.tsx:29-30] — deferred; same non-blocking pattern as the 4.1 pick hint and 4.3 backfill layer (all share `bg-card/95`, no role/Escape). Fold into Epic 6 6-2 accessibility floor pass.
- [x] [Review][Defer] Centered hand-off card could overlap the ＋ button on very short (landscape-phone) viewports [features/onboarding/components/onboarding.tsx:29] — deferred; the auditor judged no overlap in normal portrait/desktop use, and the user dismisses before reaching for ＋. Re-check during the 6-2/6-4 polish pass if a short-viewport case surfaces.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- All 3 ACs met. Added a `handoff` onboarding step: backfill's 完成 now advances to it (`finishBackfill → setOnboarding("handoff")`) instead of closing; the step renders a calm, non-blocking centered card (no dimming backdrop, so the filled map shows through — the payoff) with the one gentle line 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 (revised at code review from 「點擊任何地方…」 to point at the ＋ affordance) + a single 「開始探索」 dismiss → `finishHandoff → setOnboarding(null)`.
- No progress meter / count / "incomplete" badge anywhere — bare marks stay complete (AC2). The flow ends at the map; no account nudge (that's Epic 2 per the EXPERIENCE auth-placement note).
- No MapCanvas change, no new files, no dependency, no migration. `pickCountry` stays false during `handoff`. The card centers in the viewport so it clears the bottom-right ＋ 新增回憶 button and the bottom-center save indicator.
- Resolved with Simon: distinct non-blocking step (Q1); copy 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 + 「開始探索」 (Q2, revised at code review from 「點擊任何地方…」 to point at the ＋ affordance); single explicit dismiss, no map-tap dismiss (Q3).
- Validation: `tsc` clean · `pnpm lint` clean · `pnpm build` clean · onboarding spec **9/9** (2 new 4.4 tests + the unchanged 4.3 tests still green). Fully session-free, so not blocked by the anon rate-limit.

### File List

- **MOD** `features/onboarding/components/onboarding.tsx` — `handoff` step (non-blocking payoff card + 開始探索); `onDismiss` prop; step union + `handoff`
- **MOD** `features/memories/components/map-memory-shell.tsx` — `finishBackfill` advances to `handoff`; `finishHandoff` closes; `onDismiss` wired; `onboarding` type + `handoff`
- **MOD** `e2e/onboarding.spec.ts` — 4.4 hand-off (完成 → line → 開始探索 → map) + returning-user-no-handoff tests

### Change Log

- 2026-06-24 — Story 4.4 implemented (onboarding payoff hand-off). Backfill's 完成 advances to a non-blocking hand-off card with one gentle line + 開始探索; dismissing drops into the freshly colored map with nothing flagged incomplete. No MapCanvas change, no dep/migration. Status → review.
- 2026-06-24 — Code review: 1 decision resolved (hand-off line reworded 「點擊任何地方…」 → 「用 ＋ 新增回憶 加入圖釘、照片和回憶」 to point at the ＋ affordance), 2 deferred to Epic 6 (a11y, short-viewport overlap). tsc/lint/build/e2e green. Status → done.
