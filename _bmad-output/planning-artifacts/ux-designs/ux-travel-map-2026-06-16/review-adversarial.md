# Adversarial Review — Mapsake UX Spines (DESIGN.md + EXPERIENCE.md)

Reviewer: skeptical general reviewer. Date: 2026-06-16.
Scope: DESIGN.md, EXPERIENCE.md, .decision-log.md. Context: zh-TW primary, English fast-follow, v1 LIGHT-ONLY (dark deferred), breadth-first product bet.

Each finding has a severity, a location, and a concrete fix. Counts at bottom.

---

## #1 — BLOCKER: The retention engine cannot start, because it depends on dates that the design actively discourages.

**Location:** `EXPERIENCE.md` § Notifications & Re-live Trigger (lines 96–104); § Key Flows UJ-1 step 3 + UJ-2 step 1; § Component Patterns "Date picker" (line 57); cross-ref `DESIGN.md` "+ add date" as low-emphasis (line 56). `.decision-log.md` "Onboarding / depth bet."

This is a hard dependency hole, not a nuance. Trace it:

1. The re-live loop (UJ-2) is the *only* described pull back into the app. There is no other re-engagement surface — by design (no nags, no feed, no streaks).
2. UJ-2 fires *only* on a genuine "on this day" anniversary (line 96: "Fires only on a genuine 'on this day' anniversary").
3. An anniversary requires a **date** on the memory.
4. But dates are optional, skipping is "first-class" (line 57), onboarding marks regions with **"no inline memory prompts"** (UJ-1 step 3), and the one closing line invites "photos and notes" — **date is not even mentioned in the onboarding payoff line** (UJ-1 step 5).
5. The dominant predicted state is the "bare visited mark (most common)" (State Patterns line 67), which has *no date*.

Therefore: the most common entry — a breadth-first backfilled region — can **never** trigger a notification. For the median new user who marks 40 countries in onboarding and adds nothing else, the notification engine has **zero eligible memories** and stays silent forever. The product's sole retention mechanism never starts. The user gets the one-time "filled map" dopamine hit and is never pulled back. This is the exact "marks 40 countries then never returns" failure, and the spines do not have an answer for it.

Compounding: even a user who adds a *photo and note* later (the hoped-for depth path) still won't trigger anything unless they also added a date — and the date affordance is explicitly the *lowest-emphasis* of the three offers ("low-emphasis '+ add date'", line 56). The design optimizes against the one field its retention loop requires.

**Why this is the top finding:** every other issue is a polish item. This one means the core loop described in the docs may not fire at all for the majority of users. It invalidates the implicit retention model.

**Concrete fix — pick at least one, ideally both:**
- (a) **Capture an implicit date cheaply.** When a memory has no user-set date, fall back to a date signal the system already has: EXIF capture date of the first uploaded photo (UJ-3's hot camera roll gives this for free), or memory-creation date as a last resort. Document this as the notification-eligibility rule in § Notifications. State explicitly: "a memory is anniversary-eligible if it has a user date OR a photo with EXIF date."
- (b) **Add a second, dateless re-live trigger** so the engine isn't 100% anniversary-dependent: a low-frequency "rediscovery" surfacing (e.g. a random older dateless memory, max far below the daily ceiling, still curated, still mutable). This keeps the "memory resurfacing, never a nag" contract while removing the single point of failure. Note: the docs currently *ban* "invented occasions" (line 97) — so this needs an explicit decision that "an old memory of yours, resurfaced" is not an invented occasion; reconcile the wording.
- (c) At minimum, if you keep date-only triggering, **change the onboarding/depth bet's risk note** to flag this dependency, and re-evaluate whether date deserves equal-emphasis with photo/note on the fresh-trip path (UJ-3) so at least *those* memories are anniversary-eligible.

---

## SHOULD-FIX

### S1 — Tap-to-mark vs tap-to-open is ambiguous and the disambiguation is never specified.

**Location:** `EXPERIENCE.md` § Component Patterns "Map region" (line 52); § Interaction Primitives "Gestures & primitives" (line 87): *"Tap to mark a region visited; tap a visited region to open its memory."*

The rule given is state-dependent on the same gesture: tap an **unvisited** region → mark it visited; tap a **visited** region → open its memory. Unhandled cases:

- **How do you UNMARK a region?** If tap-visited always opens the memory, there is no gesture to toggle a region back to unvisited. A misclick during rapid backfill (very likely — the design *encourages* rapid tapping of small regions) creates a phantom visited region with no described way to undo it. Unmarking is entirely absent from the spines (see U2).
- **How do you add a memory vs just leave a bare mark?** Tapping unvisited *marks* it. Does it then also open the panel? UJ-1 says backfill has "no inline memory prompts" (step 3), implying the panel does NOT open during marking. But the IA table (line 27) says "Tap a region on the map" → opens Memory panel/sheet. These conflict: in onboarding tap=mark-silently; elsewhere tap=open-panel. The mode switch between "backfill marking" and "normal" is never defined — is it just "during onboarding" vs "after"? What about a user backfilling 20 *more* countries six months later, outside onboarding? They'd get a panel popping open on every tap, defeating rapid marking.

**Fix:** Specify the interaction model explicitly. Recommend: tap unvisited = mark visited AND it stays just marked (no panel) — a quiet confirmation (the fill animates in). Tap visited = open memory. Provide a distinct gesture/affordance for unmark (e.g. long-press → "Remove this place" in a small menu, or an "unmark" action inside the opened memory panel). Resolve the IA-table vs UJ-1 conflict: define whether "rapid marking mode" is a persistent behavior or onboarding-only, and how a returning user does bulk backfill without panel interruptions.

### S2 — Tablet / medium-width layout (≈768–1023px) is undefined.

**Location:** `EXPERIENCE.md` § Interaction Primitives: "Desktop (≥ ~1024px)" split; "Phone (portrait)" bottom sheet. `.decision-log.md` "Map + Memory layout model" same two breakpoints. `DESIGN.md` line 181 defers responsive behavior to EXPERIENCE.md.

Only two regimes are specified: ≥1024px (split panel) and "phone portrait" (bottom sheet). The entire band between them is a gap:
- **iPad portrait (768px), small laptops, large phones in landscape** — which model applies? A 1024px-wide tablet is "desktop," but a 768px portrait tablet is neither phone-portrait nor ≥1024.
- **Phone landscape** is explicitly never mentioned. A bottom sheet with three snap points at "half ~45–55%" is barely usable in landscape (≈375px tall) — the half-snap memory would be a ~180px letterbox slot, and "Full" immersion competes with the OS chrome. This is the exact edge case probed and it is unaddressed.

**Fix:** Define the breakpoint table explicitly. Recommend: split-panel ≥ ~840px (covers tablet portrait), bottom-sheet below that. Add an explicit rule for landscape phones (e.g. force split-panel-like side layout, or collapse to a two-snap sheet). State what happens in the 768–1023 dead zone rather than leaving it to build-time guessing.

### S3 — Keyboard-open while writing a note vs the 3-snap bottom sheet is unhandled.

**Location:** `EXPERIENCE.md` § Interaction Primitives (snap points lines 80–83); § Component Patterns "Add-detail affordances" / "+ Write a note" (line 56).

The fresh-trip flow (UJ-3) and the "+ Write a note" affordance both require text entry inside the bottom sheet. On a phone, the soft keyboard covers ~40–50% of the screen. Interaction with the three snap points is undefined:
- At Default (half) snap, the keyboard would completely cover the memory's text field.
- Does opening the note field auto-snap to Full? Does the sheet become non-draggable while the keyboard is up (otherwise a drag-gesture conflict: is the user scrolling the note or dragging the sheet)?
- iOS Safari PWA + keyboard + `100vh` is a notorious layout-breaker; the spine says nothing about viewport handling here.

**Fix:** Add a rule: focusing a text input forces the sheet to Full (or a dedicated compose state), disables snap-drag while editing, and pins the input above the keyboard. Note the iOS visualViewport handling as a build constraint.

### S4 — Tiny phones / minimum viewport not floored; three snap points may collapse.

**Location:** `EXPERIENCE.md` § Interaction Primitives; § Accessibility Floor "Adequate tap targets for small regions" (line 120).

Three snap points (half / 85% / full) assume enough vertical room to be distinguishable. On a 568pt-tall device (SE-class) the difference between "Expanded 85%" and "Full 100%" is ~85px — not a meaningful or reliably-targetable distinction, and the "sliver of glowing map" at 85% becomes a token strip. Combined with S3 (keyboard) and the a11y requirement for adequate tap targets, the small-screen story is unspecified.

**Fix:** Define a minimum supported viewport, and a degradation rule: below some height threshold, collapse to **two** snap points (half + full), dropping Expanded. Confirm the drag handle + "▾ back to map" remain reachable.

### S5 — Whole sections of DESIGN.md spec dark mode as if it ships in v1, contradicting the LIGHT-ONLY decision.

**Location:** `DESIGN.md` frontmatter `colors:` block lines 16–23 (8 dark tokens, no deferral marker); § Colors "Dark — 'Lamplight'" lines 143–151; line 198 "Re-living glow ... honors reduced-motion." `EXPERIENCE.md` § IA Settings row (line 30) lists "theme (Lamplight)" as a settings entry. `.decision-log.md` line 49 is the only place that records "v1 ships LIGHT-ONLY."

The LIGHT-ONLY decision lives only in the decision log. Both spines read as if dark mode is in scope:
- The Settings IA (EXPERIENCE.md line 30) lists a "theme (Lamplight)" control as a v1 surface — directly implying a user-facing dark toggle ships. This will get built.
- DESIGN.md devotes a full subsection + 8 tokens to dark with no "deferred / phase 2 / do-not-build" annotation. A builder reading the spine (which is declared the source of truth, "spine wins") has no signal that dark is out of v1 scope. DESIGN.md line 153 carefully marks color-presets as "fast-follow, not v1" — dark mode deserves the same explicit marker and conspicuously lacks it.

This is a scope-leak that will cause dark-mode work (and the doubled per-screen design/test cost the decision log was trying to avoid) to be built anyway.

**Fix:** Add an explicit "Dark — 'Lamplight' (DEFERRED to phase 2; not in v1. Tokens preserved for later; do not build a theme toggle in v1)" banner at the top of the DESIGN.md dark subsection and in the frontmatter comment. Remove or annotate "theme (Lamplight)" in the EXPERIENCE.md Settings IA row as phase-2.

### S6 — Photo handling (upload, viewing, swiping) is promised but never designed.

**Location:** `EXPERIENCE.md` UJ-3 step 3 "eager **batch** photo upload" (line 154); UJ-2 step 4 "looks at the photos ... drag up to Expanded or Full for immersion" (line 145); § Interaction Primitives Expanded snap "photos dominate" (line 81). `DESIGN.md` "Imagery follows its container's corner radius" (line 189) is the *only* visual mention.

Photos are central to both the capture flow (UJ-3) and the payoff of the re-live loop (UJ-2) — "looks at the photos" is the emotional climax. Yet there is no spec for:
- **Batch upload UI** — selection, progress, multi-file ordering, the picker on iOS PWA (which has known limitations).
- **Photo viewing/swiping** — at Full snap, how do you move between photos? Swipe? Grid? Is there a lightbox? Swipe-between-photos directly conflicts with the sheet's drag and the map's pinch gestures — an unspecified gesture collision.
- **Layout** — how N photos arrange in the card at each snap, aspect-ratio handling, portrait vs landscape mix.

A core emotional moment ("looks at the photos") has zero interaction or visual design behind it.

**Fix:** Add a "Photos" component pattern to EXPERIENCE.md (batch add behavior, viewer/swipe gestures and how they avoid colliding with sheet-drag and map-pinch) and a photo-layout note to DESIGN.md (grid/aspect rules at each snap, corner radius already covered). At minimum specify the viewer at Full snap.

### S7 — Delete / unmark / edit a memory is entirely absent.

**Location:** absent from both spines. Nearest: `EXPERIENCE.md` § State Patterns "Muted place/memory" (line 70) covers muting, not deletion.

There is no described way to: unmark a region (see S1), delete a memory, remove a single photo, or correct a mistaken mark. For a "private keepsake" where misclicks during rapid backfill are likely and emotional sensitivity is high (the docs explicitly cite "places tied to an ex or a hard time," line 101), the inability to delete/correct is a real gap — and arguably a data-dignity issue, not just convenience. Muting is offered as the kindness mechanism, but a user may genuinely want a memory *gone*, not muted-but-still-on-the-map.

**Fix:** Add an "Edit / remove" pattern: unmark a region, delete a memory (with the bare-mark vs full-memory distinction — deleting a rich memory should confirm), remove an individual photo. Decide and document whether unmark and delete-memory are the same action or separate.

### S8 — Auth UI is named as a v1 surface but never designed; PWA/iOS push has unstated auth dependencies.

**Location:** `EXPERIENCE.md` § IA Settings row "Account/auth" (line 30); `.decision-log.md` line 19 lists "auth-method UI" as an OPEN item — and it appears to have never been resolved (no "Account / Auth (LOCKED)" section exists in the log).

Auth is required for: cross-device sync (a keepsake you keep for years implies an account), and notifications (server needs to know whom to push to). It's listed in the IA as a settings surface but there is no flow for sign-up/sign-in, no first-run account decision, and the onboarding flow (UJ-1) drops a brand-new user straight into marking with **no account step described** — so where does their data live, and what happens when they reinstall the PWA or switch devices? Anonymous-local-first vs account-required is an unmade decision with big UX consequences (e.g. "you marked 40 countries on your phone, now they're gone because there was no account").

**Fix:** Make and document the auth model: local-first-then-link, or account-required-up-front. Specify where the account step sits relative to UJ-1 onboarding (the breadth-first bet argues for deferring auth until *after* the payoff — but then sync/push need a clear "save your map" prompt). Add the auth flow to EXPERIENCE.md and the relevant screens to DESIGN.md.

### S9 — Border contrast is flagged as an open risk but the only mitigation is "verify later" — and it carries the whole map in light mode.

**Location:** `DESIGN.md` § Colors line 138 (⚠ open contrast item); § Accessibility Floor line 122. Colors: unvisited `#F2E8D5` vs border `#C7B79A`.

In light-only v1, the `#C7B79A` border is the *sole* separator between adjacent unvisited regions AND between an unvisited region and the canvas (they're the same color). #C7B79A on #F2E8D5 is roughly a 1.3:1 luminance contrast — well below the 3:1 WCAG non-text-contrast guideline for meaningful graphical boundaries. Because dark mode (which had a distinct unvisited token to solve exactly this) is deferred, **light mode has to carry this alone in v1**, and the only plan is "verify at Finalize." If it fails verification, there's no fallback designed — and the whole "bare paper map" aesthetic rests on this border being both invisible-soft AND legible, which may be contradictory.

**Fix:** Don't leave this as an open TODO into build. Pre-decide a fallback now: e.g. a slightly darker border token reserved specifically for the unvisited/unvisited boundary, or a hairline texture on land. Run the contrast check before build, not "at Finalize," given it's now load-bearing with dark deferred.

### S10 — Export / data portability is absent for a "keep it for years" keepsake.

**Location:** absent from both spines; not in the IA table (EXPERIENCE.md lines 24–30). The review prompt flags export as a candidate.

A private keepsake people are meant to keep for years implies they'd want to get their data out (account closure, backup, peace of mind that it's "theirs"). The product positioning ("for yourself, on your terms," line 101) makes the *absence* of export slightly off-message. Not core to the launch loop, hence not a blocker — but worth an explicit decision rather than silent omission.

**Fix:** Make an explicit call: export in v1 or documented fast-follow. If deferred, note it in the decision log so it's a choice, not an oversight.

---

## NICE-TO-HAVE

### N1 — "N more from this day" landing pattern lacks any visual/interaction design.

**Location:** `EXPERIENCE.md` § State Patterns line 69; § Notifications line 98; UJ-2 step 5. The multi-memory case is named three times but never shown — how is the "N more" affordance presented on the landing, and tapping it does what (swap panel content? a small list? cycle the map fly-to)? Add a small pattern note.

### N2 — Reduced-motion is specified for fly-to/glow but not for the bottom-sheet snap animations or the onboarding fill animation.

**Location:** `EXPERIENCE.md` § Accessibility Floor line 119; `DESIGN.md` line 198. The map-fill-in (UJ-1 step 4) and sheet snap transitions are also motion; confirm they degrade gracefully under `prefers-reduced-motion` too.

### N3 — Install nudge timing unspecified relative to the breadth-first payoff.

**Location:** `EXPERIENCE.md` § Component Patterns "Install nudge" line 58. It's "prominent" and "load-bearing for iOS web push," but if it interrupts the rapid-marking onboarding it damages the breadth-first flow; if it comes too late, push (the retention loop's delivery mechanism — already at risk per #1) never gets enabled. Specify when the nudge fires (recommend: right after the onboarding payoff, tied to "save/keep your map").

### N4 — Notification deep-link assumes "(photos present)" but most eligible memories won't have photos.

**Location:** `EXPERIENCE.md` § Notifications line 103: "Deep-link to map + memory together (**photos present**)." Given the breadth-first bet, many anniversary-eligible memories will be note-only or bare. The parenthetical implies photos are expected; confirm the landing is still satisfying for a photo-less memory (it should be — bare-mark-is-complete — but the wording undercuts it). Minor wording reconciliation.

### N5 — zh-TW / English layout-swap is asserted but no worst-case is identified.

**Location:** `EXPERIENCE.md` § Foundation line 18; `.decision-log.md` i18n. "Layouts must handle both compact Chinese and wider English without breaking" — good principle, but no callout of the tightest spot (e.g. the bottom-sheet header with a long English place name + date + close affordance, or button labels like "稍後再補充" vs "Add details later"). Identify one or two worst-case strings to test against.

---

## Severity counts

- **BLOCKER:** 1  (the empty-loop / date-dependency hole)
- **SHOULD-FIX:** 10  (S1–S10)
- **NICE-TO-HAVE:** 5  (N1–N5)

Total findings: 16.
