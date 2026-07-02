# Reconciliation — discovery-notes.md vs prd.md + addendum.md

Date: 2026-07-02. Source of record: `discovery-notes.md` (brain dump 1 + confirmed journeys UJ-1/2/3). Outputs audited: `prd.md`, `addendum.md`.

**Verdict: PASS with fixes.** Every concrete ask in the source lands as an actual requirement (not just narrative). The qualitative spine (two speeds, lock language, save moment, satisfied ending) survives well. Five reconciliation items found — none critical; two mediums are tension/provenance issues worth fixing before the PRD leaves draft.

---

## 1. Concrete asks — presence as requirements (the explicit checklist)

| Source ask | Where in output | Requirement or narrative? | Status |
|---|---|---|---|
| Choice after each place: add next OR return to map | FR11; UJ-1 step 5 | Requirement (FR11) | PRESENT |
| Session recap at session end, the payoff beat | FR12 (with "payoff beat" wording kept); UJ-1 step 6 | Requirement (FR12) | PRESENT |
| Date-suggested photos, never forced, on-device, private | FR8 ("manual selection always available"), NFR3 (on-device compute), UJ-1 step 3 ("Suggestion, never forced") | Requirement (FR8 + NFR3) | PRESENT |
| Geographic browse hierarchy continent → country → region → place | FR20 (verbatim hierarchy; explicitly replaces flat list; no-trip-entity note kept) | Requirement (FR20) | PRESENT |
| Browse as first-class, obvious navigation (not the mystery button) | FR19 ("never hidden behind an unlabeled control") | Requirement (FR19) | PRESENT |
| Search promoted to v2 CORE, front door of capture | FR4 (notes the promotion from deferred Story 3-2) | Requirement (FR4) | PRESENT |
| Search serves browse too (jump to visited place) | FR21 | Requirement (FR21) | PRESENT |
| Multi-visit pins (pin → visits, each date + photos) | FR6; FR13 (anniversary per visit); addendum data-model section; NFR6 (web compat) | Requirement | PRESENT |
| Photo-rich native notification (Apple Photos Memories mechanic) | FR14, NFR2, addendum notification specifics | Requirement | PRESENT |
| Notification lands on THAT DATE's visit, not pin's whole history | FR15 | Requirement | PRESENT (but see Gap 2 on "its notes") |
| Save-success animation ("locked something in") + iOS haptic pairing | FR10 (animation + haptic) | Requirement (FR10) | PRESENT |
| Settings as designed screens, not stacked functions | FR26 | Requirement (FR26) | PRESENT for settings; see Gap 5 for the account surface |
| Google Maps as the map-mechanics bar | FR1 ("meeting the bar set by Google Maps on iOS"), NFR1 (60fps) | Requirement | PRESENT |
| Apple Photos as the gallery bar | FR22 | Requirement | PRESENT |
| Pure-iOS redesign, phone as primary surface | Vision / Why v2; whole PRD framing; addendum stack decision | Framing (appropriate level) | PRESENT |
| Notification settings coherence (v1 contradiction) | FR17 | Requirement | PRESENT (goes beyond source — source only implied it; fine) |

No concrete ask was dropped.

## 2. Qualitative intent — the things FR structure tends to lose

| Source signal | Fate in output | Assessment |
|---|---|---|
| **Two speeds** ("fast in, slow back") | Vision: "Two speeds, one promise: fast to lock in, slow to savor." Fast side backed by NFR1 (<100ms capture interactions) and UJ-1 "each place takes seconds." Slow side backed by UJ-2 narrative + Out-of-scope (no streaks/gamification) + counter-metric. | KEPT, and upgraded into the product's tagline. |
| **"Lock" mental model** (Simon said "lock" twice; source: "worth honoring in the design language, not just reading as 'log'") | Vision ("locks into your map", "fast to lock in"), UJ-1 step 4, FR10 quote ("you locked something in"). | MOSTLY KEPT — see Gap 4: it lives in English narrative but is not routed into the FR28 語感 voice guide, which is where "honor in the design language" actually has to happen for a zh-TW-first product. |
| **Save-animation feel** ("felt feedback that you successfully locked something") | FR10: "short, felt animation (+ haptic)". "Felt" survived as a word in the requirement. | KEPT. |
| **"Close the app with satisfaction" ending** (no streaks, no guilt, no feed; the satisfaction IS the retention) | UJ-2 narrative near-verbatim ("closes the app satisfied... The satisfaction is the retention"); Out-of-scope bans social + gamification; counter-metric (mute rate < 20%) operationalizes "never spammy". | KEPT. Only "no guilt" was dropped as a word; the substance is covered. No FR forbids end-of-re-live engagement prompts, but Out-of-scope + counter-metric guard it adequately. |
| **Recap pairs with the animation — "the trip settling into the map"** | UJ-1 step 6: "the trip visibly settled into his map." | KEPT (narrative level is right — it's a feel note for UX phase). |
| **Settings-as-designed-screens** | FR26 for settings proper. | KEPT for settings; account surface partially implicit — Gap 5. |
| **Apple Photos Memories as the emotional gold standard for notification → landing** | UJ-2, FR14 ("the photo is the tap-earner (Apple Photos Memories mechanic)"), SC2 (Simon receives it himself — the source's "validates with his own behavior"). | KEPT, including the personal-validation angle via SC2. |
| **"A 10-place trip isn't data entry"** | UJ-1 closing line + SC1 verbatim spirit ("a pleasure, not data entry"). | KEPT and made a success criterion. |
| **Return to map "to see the pins placed so far"** (session progress visible) | FR11/UJ-1 say "return to the map" / "glance back" without the progress nuance. | KEPT in substance; the "pins placed so far" motivation is a nice UX-phase detail worth carrying (trivial). |

## 3. Gaps and distortions (all findings, ordered by severity)

### Gap 1 (MEDIUM) — Tap-semantics resolved in the PRD against the source's explicit deferral, with an unsourced scope decision attached
Source (brain dump Q2 item 2): "Need a clean tap-semantics model (tap vs long-press; pin vs region) — **decide in UX phase, not PRD**." The PRD instead resolves it in-document: FR3 makes the map read-only, FR5 makes long-press the sole write gesture, and Open Questions marks tap semantics "RESOLVED". Two sub-issues:
- **Provenance:** FR5 says "(confirmed)" but the source of record contains no such confirmation. If Simon confirmed this after the discovery notes were written, the confirmation should be appended to discovery-notes.md (or cited); otherwise the PRD is self-certifying a decision the source reserved for UX phase.
- **Beyond-source scope:** FR3 additionally **removes region marking as a user action on iOS** (visited fill fully derived; legacy web marks read-only) and FR11 replaces region-tap backfill with empty memories. The source only flagged the overloaded-tap *problem*; removal of the feature is a product decision with no trace in this source. It may well be right (and may trace to another conversation), but it must not look like it came from discovery when it didn't.
- **Distortion note:** Simon's stated first instinct was "**tap** a spot on the map → place a pin there directly." FR3 makes tap never-write; the instinct is honored via long-press instead (FR5 openly says so). Defensible given the read-only resolution, but it is a conversion of the stated gesture, decided at PRD level.

**Fix:** record the tap-semantics/region-removal confirmation in discovery-notes.md (or link its source), or demote FR3/FR5's "RESOLVED/confirmed" back to a ⛔ UX-phase open question.

### Gap 2 (MEDIUM) — FR9's per-place-notes assumption contradicts the CONFIRMED UJ-2 wording
Source UJ-2 (CONFIRMED): tap lands on "THAT DATE's visit — **its notes** + photos, not the pin's whole history." That wording implies notes attach to the visit. FR9 assumes the opposite ("`[ASSUMPTION]` Notes remain per-place (not per-visit)"), and PRD UJ-2 says "its note" while meaning the place note. Concretely: a user with three Kyoto visits gets an anniversary landing whose note mixes all visits — exactly the "whole history" the confirmed journey excludes. The PRD *does* flag per-visit notes as an open question for UX phase, so this is not silent — but it is framed as a neutral maybe rather than as a tension with a confirmed journey.

**Fix:** reword the FR9 assumption/open question to acknowledge that confirmed UJ-2 leans per-visit ("its notes"), or get Simon's explicit call now (it touches the same data-model migration as FR6, so deciding late is costly).

### Gap 3 (MEDIUM) — Source declares the v1-gripes intake incomplete; the PRD treats it as closed
Source Q2 header: "v1 design gripes (Q2, **partial — Simon says more to come**)"; Q5: "Q1/Q2 remain open for additions." The PRD (status: draft) contains no marker that the design-gripes input stream is still open. If Simon delivers gripes #4+ after finalize, there is no hook reminding anyone that the PRD was written against a partial list.

**Fix:** add one line to Open Questions (or the changelog): "v1 design-gripe intake (discovery Q2) declared partial by Simon — sweep for additions before PRD leaves draft."

### Gap 4 (LOW) — The "lock" mental model isn't routed into the FR28 voice guide
Source: "his mental model of capture may genuinely be *locking a keepsake in*, worth honoring **in the design language**, not just reading as 'log'." The PRD honors it in English narrative (Vision, UJ-1, FR10's quoted line), but the product's design language is zh-TW-first and FR28's 語感 voice guide — the artifact where design language actually gets written — doesn't list the lock/keepsake metaphor as an input. Risk: the metaphor lives in the English PRD and evaporates in the shipped zh-TW copy.

**Fix:** one clause in FR28 (or the addendum's design-workflow section): the voice guide must carry the lock/keepsake capture metaphor (and the 時光膠囊 framing already inherits it naturally).

Related nit: the source still carries "['lock' read as 'log' — pending Simon's confirm]"; the PRD adopted "lock" wholesale. Almost certainly right (he said it twice), but the pending-confirm marker was never closed in the source.

### Gap 5 (LOW) — "Settings **+ account** surfaces" as designed screens: account half is implicit
Source Q2 item 1 names two surfaces: the 設定 sheet AND the account/sign-in sheet ("no design at all, just functions one after another"), with the interpretation itself marked pending confirm. FR26 mandates settings as a designed screen and lists "account" as a settings *item*; UJ-4/FR24 designs the *first-run* sign-in. But the returning-user account surface (the v1 account/sign-in sheet Simon actually complained about) has no explicit designed-screen requirement of its own.

**Fix:** extend FR26 by a few words ("Settings **and the account surface** are designed screens...") and close the pending-confirm marker in the source.

## 4. Unsourced additions (not gaps — noted for traceability only)
These appear in the PRD/addendum with no basis in discovery-notes.md; they presumably trace to other inputs (research-comparables.md, prior conversations, v1 docs). Listing them so the finalize step can confirm their provenance rather than assume it: FR3 region-marking removal + FR11 empty-memory backfill (see Gap 1), FR18 widget stretch goal, FR23 signed-in-first / no anonymous mode, UJ-4 first-run journey, FR28 voice-guide process, NFR5 iOS 17+ floor, pricing/parked sections of the addendum. None contradicts the source (signed-in-first arguably *supports* the private-keepsake soul).

## 5. Confirmed fully present (no action)
Two-speeds principle; post-trip-ritual capture revision; search-as-front-door promotion; the full UJ-1 flow (search → fly → visit → date → date-suggested photos → save moment → choice → recap); multi-visit pins with per-visit anniversaries and shared-backend weight; Google Maps and Apple Photos quality bars; photo-rich APNs notification with the photo-earns-the-tap mechanic; land-on-that-date's-visit deep link; satisfied ending with no streaks/feed; map-first + search browse entries; geographic hierarchy; first-class collection navigation; no-trip-entity / geography-as-spine; mobile-web → native redesign rationale; Simon-hasn't-received-a-push-yet motivation (Why v2 + SC2).
