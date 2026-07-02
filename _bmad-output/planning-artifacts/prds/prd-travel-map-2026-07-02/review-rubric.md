# PRD Quality Review — Mapsake v2 (native iOS)

- **PRD:** `_bmad-output/planning-artifacts/prds/prd-travel-map-2026-07-02/prd.md` (+ `addendum.md`)
- **Rubric:** `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`
- **Stakes calibration:** personal + published, ~5–8 page rigor. Enterprise ceremony not expected; substance bar still applies. This is a chain-top PRD (open questions route to UX phase, architecture phase, epic planning), so downstream usability weighs more than it would for a standalone document.

## Overall verdict

This is a genuinely good PRD for its stakes: it has a real thesis (the notification is the product's heartbeat, and v2 exists because iOS web push broke that heartbeat), decisions stated as decisions with rejected alternatives and accepted costs, an honest Out list, and open questions that are actually open and individually routed to the phase that owns them. The FR set is contiguous, grouped, and traceable back to the four journeys without strain. What's at risk is downstream extraction: there is no glossary and the core noun "memory" drifts between pin-level and visit-level meaning (FR13 defines a contentless memory as having "no note" while FR9 makes notes per-place) — exactly the ambiguity the ⛔ multi-visit data-model work will trip over — and the 11 inline `[ASSUMPTION]` tags have no index. Two success criteria also lack a stated measurement path under the PRD's own no-analytics constraint.

## Decision-readiness — strong

The PRD makes calls and shows its work. FR3 ("**The map is read-only.** … Region marking as a user action is **removed on iOS**") is a decision, not a consideration, and it names the v1 problem it resolves. FR23 commits to signed-in-first with no anonymous mode. The addendum's stack section is a model of the form: "Costs accepted with eyes open: Android later = a second build; Simon reviews code in a language he's learning… DB row types hand-mirrored," plus explicitly rejected alternatives (React Native with its strongest counter-case stated, Capacitor). The Open Questions are real — nobody has answered "empty-memory placement granularity" in the next sentence — and the one resolved item is kept with strikethrough and its resolution, which preserves decision history.

One structural note: the PRD uses zero `[NOTE FOR PM]` callouts. At these stakes, with the founder as the PM and an Open Questions section doing that job, this is acceptable — the tensions that exist (widget stretch goal, geocoding ToS pragmatic-risk call) are surfaced through `[ASSUMPTION]` tags and the addendum instead. No findings.

## Substance over theater — strong

No persona theater: one protagonist (Simon) carries three journeys, and UJ-4's first-time user exists to exercise a real flow (first run), not to pad the document. The Vision is not swappable — "fast to lock in, slow to savor," "a memory comes back to find you" describe this product and would not survive transplant into a Polarsteps PRD. Positioning names actual comparables and a specific unclaimed intersection ("private-by-default + daily memory resurfacing + place-centric multi-visit history… none is zh-TW-first") backed by a research file. NFRs are mostly product-specific (60fps on iPhone 12-class, minimal picker surface, no analytics SDK, guideline 5.1.1(v)) rather than boilerplate. The two adjective-shaped spots (NFR2 "reliable," FR1 "bar set by Google Maps") are logged under Done-ness clarity where they bite.

## Strategic coherence — strong

The thesis is stated and the document obeys it. "Why v2" gives a falsifiable origin story (web push subscribe failed on the founder's own iPhone) and the success criteria close the loop: SC2 is literally "the moment v1 never delivered him." The counter-metric (< 20% opt-out/mute — "if people silence it, the soul is failing") guards the thesis rather than measuring activity; there is no DAU/MAU theater anywhere. Feature groups follow the loop the thesis needs (capture ritual → capsule opens → browse), and the Out list is thesis-driven ("Social features… against the product's soul"). Scope kind is a coherent experience/retention MVP. No findings.

## Done-ness clarity — adequate

Most FRs carry a testable consequence: FR2 specifies the clustering rule (aggregate pin per region/country carrying the memory count, tap dives in); FR11 nails the backfill semantics ("an empty memory still colors its region visited"); FR15 gives a verifiable landing (map flies, pin glows, right visit opens); FR24 sequences first-run precisely; NFR1/NFR4/NFR7 give bounds or binary checks. Deliberately deferred definitions (FR12 session-end inference, FR13 down-weighting rules) are flagged and routed, which is the honest way to be unfinished.

### Findings
- **low** FR1 fluidity bar is comparative, not testable (§3 Group A) — "at native map-app fluidity… meeting the bar set by Google Maps on iOS" cannot be verified; a reviewer and an implementer can disagree forever about whether the bar is met. NFR1 (60fps, <100ms) backstops most of it. *Fix:* let NFR1 be the acceptance bar and demote the Google Maps phrase to intent, or add the missing measurable (e.g., pin-tap-to-open latency).
- **low** NFR2 "reliable end-to-end" has no bound (§4) — the only NFR with an adjective where a threshold should be. Delivery is the product's heartbeat, so this one deserves a number more than any other. *Fix:* state a floor (e.g., ≥ 99% of scheduled sends delivered within the delivery-time window; photo attachment renders in ≥ 95% of deliveries, text fallback otherwise).

## Scope honesty — strong

The Out list is explicit, specific, and reasoned — including de-scoping done in the open (cross-account merge "mooted on iOS by signed-in-first; stays a web-only backlog item"; web client "maintenance only" tagged as an assumption). Eleven inline `[ASSUMPTION]` tags sit on genuine inferences (iOS 17+ floor, Sentry acceptability, per-place notes, English post-v2) rather than decoration. FR18's "IN as a stretch goal" is scope hedging, but it is explicit, tagged, and routed to epic planning with a decision deadline — that is hedging done honestly. Open-items density (6 open questions + 11 assumptions) is proportionate to a v2 PRD heading into architecture at these stakes.

### Findings
- **medium** No Assumptions Index (document tail) — the rubric's roundtrip check fails trivially: 11 inline `[ASSUMPTION]` tags (§1 Relationship to v1; FR9, FR12, FR18, FR22, FR28; NFR3, NFR5; §6 monetization; §7 subtitle, §7 location) and no index at the end. On a chain-top PRD, downstream phases need one place to sweep for unconfirmed inferences. *Fix:* add an "Assumptions Index" section listing all 11 with their locations; five minutes of work.

## Downstream usability — thin

This dimension carries extra weight here because the PRD explicitly feeds UX, architecture, and epic planning (§6 routes work to all three). IDs are clean: FR1–FR28 contiguous and unique, NFR1–NFR7, SC1–SC5 + counter-metric, UJ-1–UJ-4; every cross-reference resolves (FR3↔FR5, FR26→FR17, UJ-4→FR28, open questions → FR6/NFR6/FR11/FR13/FR18/FR9). Sections pull out cleanly. But the vocabulary layer under those IDs is unstable, and there is no glossary to stabilize it.

The core noun **"memory"** drifts between two levels of the data model. FR6 establishes the model: a pin (place) holds many visits, each with date and photos. Then FR13 defines "contentless backfill memories" as having "(no date, no photos, no note)" — but FR9 says notes are **per-place**, so "no note" is a pin-level attribute inside what reads as a visit-level definition. FR11's "empty memories" and FR10's "each saved memory" read as visits; §1's "log one real memory" and FR24's "guided first memory" read as pin+visit units. This is not pedantry: the ⛔ multi-visit migration (the addendum calls it "the single riskiest backend change in v2") and the FR13 re-live weighting rules will both be specified by someone extracting these exact nouns.

### Findings
- **medium** No Glossary; "memory" ambiguous across pin/visit levels (§3 FR6/FR9/FR11/FR13) — the contentless-memory definition in FR13 mixes visit-level (date, photos) and pin-level (note) attributes, and "memory" is used for both a visit and a pin-with-visit across the document. *Fix:* add a five-term glossary (place/pin, visit, memory, region mark, re-live) that fixes "memory" to one level, and restate FR13's contentless definition in those terms.
- **low** UJ-4 protagonist unnamed (§2) — "A friend in Taipei… She" carries the journey but has no name, unlike Simon in UJ-1–UJ-3. Minor at these stakes, but naming her makes the journey referenceable downstream ("the Mei-Ling flow"). *Fix:* give her a name.

## Shape fit — strong

The shape matches the product: consumer app with meaningful UX → journeys are load-bearing and present; solo founder at personal + published stakes → success criteria are quality bars ("Simon logs a real trip… and rates the ritual 'a pleasure, not data entry'"), not growth targets, which the PRD says explicitly in §5. Brownfield discipline is observed: v1 carryovers are named as carryovers (eligibility engine tiers, `pin-photos` storage, export, notes) and existing-code references (`push-copy.ts`, `profiles.notif_time`, `exif_taken_at` with its 2026-06-28 date) are concentrated in the addendum where they belong. The addendum split is the document's best structural feature — implementation depth (stack, geocoding ToS, migration candidates, APNs payload constraints) is quarantined out of the requirements, keeping FRs capability-shaped. The few leaks are small: FR8's `pin-photos` bucket name and FR14's "(Notification Service Extension)" are implementation nouns inside FRs, defensible as brownfield anchors on a platform-specified product.

### Findings
- **low** NFR5 presupposes the stack the addendum says architecture will ratify (§4 vs addendum §"Stack decision") — NFR5 justifies the iOS 17+ floor via "(SwiftUI maturity; NavigationStack-era APIs)" while the addendum frames Swift/SwiftUI as "for architecture to ratify." Harmless in practice (the decision is clearly made), but the two framings disagree about where the decision lives. *Fix:* either justify NFR5 platform-neutrally ("covers the practical installed base") or drop "ratify" language in the addendum.

## Success-measurement note (cross-dimension)

- **medium** SC5 and the counter-metric have no stated measurement path under the PRD's own privacy constraint (§5 vs NFR3) — NFR3 commits to "no analytics SDK in v2," yet SC5 needs crash-free *session* rate (requires Sentry session tracking, not just crash reporting, which NFR3's assumption covers only loosely) and the counter-metric needs "% of active users" with "active user" undefined and no client telemetry to define it. Mute/global-off are server-stored, so the numerator is measurable; the denominator is not. *Fix:* define "active user" server-side (e.g., any authenticated API activity in trailing 30 days) and state that SC5 relies on Sentry session tracking, extending the NFR3 assumption to cover it.

## Requested-check summary

- **FR numbering/stability:** FR1–FR28 contiguous, unique, grouped A–F; all cross-references resolve. Clean.
- **Capabilities-not-implementation:** good discipline overall; implementation depth correctly quarantined in the addendum; minor leaks (FR8 bucket name, FR14 NSE, NFR5 SwiftUI rationale) noted above.
- **NFR separation:** clean section, product-specific thresholds except NFR2 (no bound); FR1 duplicates a fluidity bar that NFR1 owns.
- **Success metrics + counter-metric:** present, thesis-aligned, stakes-calibrated; measurement path gap for SC5/counter-metric (medium above).
- **Scope in/out:** In is one line by reference to §3; Out is explicit with rationale per item. Clear.
- **Open-question routing:** every open question names its owning phase and its FRs; blockers marked ⛔; resolved item retained with resolution. Exemplary at this scale.
- **Journey→FR traceability:** UJ-1 → FR4/5/7/8/10/11/12; UJ-2 → FR13/14/15/16; UJ-3 → FR19/20/21; UJ-4 → FR23/24/28. Implicit (no matrix) but complete; appropriate for 5–8 page rigor.

## Mechanical notes

- No Glossary section; no Assumptions Index (both filed as findings above since this PRD is chain-top).
- "Memory" / "visit" / "pin" drift filed as a finding (downstream usability); "region marks" vs "region-marks" hyphenation varies (§3 FR3 vs §6) — cosmetic.
- ID continuity: FR1–28, NFR1–7, SC1–5, UJ-1–4 all contiguous, no duplicates; all inline cross-references (FR5, FR17, FR28, FR6/NFR6, FR11, FR13, FR18, FR9) resolve.
- UJ protagonists: UJ-1–3 named (Simon); UJ-4 unnamed (filed as low finding).
- `[NOTE FOR PM]` callouts: zero used; acceptable at these stakes with the founder as PM.
- Referenced companion files exist in the workspace: `research-comparables.md`, `addendum.md`, `discovery-notes.md`, `.decision-log.md`.
- Front-matter `status: draft` while §5 SC3 speaks of App Store launch — expected for a pre-build PRD; no action.

## Findings count

- Critical: 0 · High: 0 · Medium: 3 · Low: 5
