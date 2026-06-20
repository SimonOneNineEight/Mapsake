# PRD Quality Review — Mapsake (travel-map)

## Overall verdict

This is a strong, right-sized PRD for what it is: a personal-first passion project with a clear thesis (the re-live loop, not the logging) and scope discipline that matches the stakes. The strategic spine is genuine and the FRs are mostly testable. What's at risk is concentrated in three places: a handful of FRs lean on adjectives or unstated mechanics that will trip story creation (export format, sync conflict behavior, notification cadence), one journey-implied capability is missing (editing/deleting a place or its photos), and the success metrics are deliberately unquantified — defensible for Stage 1, but they offer downstream nothing to instrument. None of these block the UX step; two of them (edit/delete, cadence) should be resolved before architecture.

## Decision-readiness — adequate

The PRD makes real decisions and mostly owns them. The web-first / PWA bet is stated as a decision with its cost named (the iPhone install dependency is called load-bearing and flagged as a top risk, §7 RISK + addendum). "Out of scope by design" for GPS/social/native is a decision, not a hedge, and §6 explains *why* GPS is out ("the opposite of this product") rather than just listing it. The Open Questions in §7 are genuinely open — auth method, photo storage envelope, notification cadence, map-data geopolitics — each routed to a named next step (architecture or UX), not answered rhetorically.

Where it's thinner: the personal-first-then-public trajectory is the central strategic gamble, and the PRD asserts the transition ("a deliberate path to opening up once it earns return visits") without naming what evidence would trigger it. That's the one decision a decision-maker (the builder) would most want surfaced. It's low-stakes here because the decision-maker *is* the builder, but a one-line trigger condition would sharpen it.

### Findings
- **low** Stage-1 → Stage-2 transition has no stated trigger (§1, §2) — The PRD bets on "open up once it earns return visits" but never says what return-visit signal flips the switch. *Fix:* add one line to §2 Stage 1, e.g. "Graduation signal: the builder returns unprompted across N weeks and the loop survives a multi-week gap."

## Substance over theater — strong

Very little furniture here. The Vision (§1) is product-specific and could not swap into another PRD in the category — "the product's real job is not logging — it is bringing the user back" is an earned thesis, not a platitude. There is exactly one protagonist (Simon) and the PRD says *why* (personal-first is intentional), avoiding persona theater entirely. The differentiation is implicit and concrete (the category gets the re-live loop wrong; data loss is "the cardinal sin of the category"), not a bolted-on novelty section. NFRs are mostly product-tied rather than boilerplate — NFR1 names the specific failure modes (logout, reinstall, device switch, app update) instead of saying "must be reliable."

The one soft spot is NFR4 (performance) and NFR6 (photo resolution), which lean on adjectives — covered under Done-ness below rather than here, since the problem is testability, not theater.

## Strategic coherence — strong

The PRD has a thesis and the features serve it. The arc is: durability earns trust (group A) → the map is the canvas (group B) → memories are the payload (group C) → onboarding seeds the map fast (group D) → the re-live loop is the point (group E). Group E is explicitly labeled "The reason the product exists," and the prioritization follows the thesis rather than ease — the retention loop is the hardest part and it's in v1, not deferred. The MVP scope kind is coherently an *experience* play (the re-live moment), and scope logic matches: parked items (reels, wishlist, trophy print, year-in-review) are all loop-adjacent enhancements, correctly deferred.

Counter-metrics (§2) are present and well-chosen — notification mute rate directly falsifies the core thesis, which is exactly what a counter-metric should do. This is better than most PRDs at this stage.

### Findings
- **low** Success metrics are unquantified (§2) — Stage 1 metrics ("voluntarily returns," "within a few weeks") are deliberately qualitative. Defensible for a solo builder who is the instrument, but they give downstream nothing to measure. *Fix:* acceptable as-is for Stage 1; for Stage 2, name even rough numbers (e.g. "week-2 return > X%") so the public bar is testable when it matters.

## Done-ness clarity — adequate

Most FRs carry a testable consequence. FR1–FR3, FR5–FR13, FR18 are clear and verifiable. FR13's "a bare visited mark is a complete entry and is never flagged as incomplete" is an unusually good, directly-testable requirement. But several FRs and NFRs will block or slow story creation:

- **FR4 (export)** says a user "can export their own data" with no format, scope, or shape. What's in the export — photos too, or just marks and notes? What format? This is the stated trust guarantee, so it deserves a bound.
- **FR20** specifies the re-live landing as "map + memory together" with three concrete sub-states (zoomed, highlighted, panel open) — good. But the deep-link behavior when the app is cold/unauthenticated isn't stated (tap notification → must log in first → then land?).
- **NFR4** is pure adjective: "smooth," "quickly enough to keep the re-live moment unbroken." No bound. The re-live moment is the product; "unbroken" needs a number or a perceptible target.
- **NFR6** "adequate viewing resolution" — adjective; no bound. Tied to the open photo-storage-envelope question, so partly deferred, but story creation can't size storage from "adequate."

The notification-cadence gap (FR18/FR19 detect and deliver, but "how often" is an open UX question) means an engineer reading FR19 alone cannot tell what "done" is for the firing logic — does every qualifying memory fire, or is there a digest/cap? This is correctly flagged as open in §7, but it sits on the critical path because the loop is the product.

### Findings
- **high** FR4 export is unbounded (§4.A) — No format, no statement of whether photos are included. It's the named trust guarantee. *Fix:* specify minimum viable export: e.g. "structured data (marks, notes, dates) plus original photos, in a self-describing format (JSON + photo files)." A bound, not necessarily the final format.
- **high** Notification firing volume undefined (§4.E, FR18/FR19) — "Detects on-this-day memories" and "delivers a notification" don't say one-per-memory vs. digest vs. cap; §7 flags it open but the loop can't be built without a v1 default. *Fix:* set a v1 default in the FR (e.g. "at most one notification per day; if multiple memories qualify, the digest names the most significant and links to the rest"), leave refinement to UX.
- **medium** NFR4 performance is adjective-only (§5) — "smooth," "unbroken" have no bound. *Fix:* give a perceptible target, e.g. "map interaction at 60fps on a mid-range phone; memory panel + first photo visible within ~1s of tapping a place."
- **medium** Cold-start deep-link behavior unspecified (§4.E, FR20) — Tapping a notification when logged out / app not running isn't addressed. *Fix:* add a clause: "if the user is signed out, tapping resumes to the re-live landing after auth."
- **low** NFR6 photo resolution is adjective ("adequate") (§5) — Partly deferred to the storage-envelope open question. *Fix:* fine to defer the number, but state the intent ("full-screen viewing on a phone without visible degradation") so architecture has a target.

## Scope honesty — strong

Omissions are explicit and load-bearing. §6 has three tiers — In, Explicitly out, Parked/fast-follow — and the "Explicitly out" items each carry a reason, not just a list. The clarification that "'make it public' = open the product to more users, NOT public/social sharing" (§6, repeated in addendum) pre-empts a real ambiguity that would otherwise bite later. Risks (§7) name the load-bearing PWA dependency honestly and record that email-as-carrier was considered and deferred — that's de-scoping done in the open.

Open-items density is appropriate: ~6 open/risk items against a personal-first build, all routed to a downstream step. That's healthy, not a blocker. The PRD does not use formal `[ASSUMPTION:]` / `[NOTE FOR PM]` tagging, but for solo-build stakes that ceremony isn't warranted, and the substance (named risks, routed opens) is present without it.

## Downstream usability — adequate

This PRD is chain-top (it explicitly hands off to bmad-ux then bmad-create-architecture, §8), so this dimension matters. FR/NFR IDs are contiguous and unique (FR1–FR21, NFR1–NFR6); UJ-1..3 are clean; cross-references resolve (the §6 scope blocks cite the right FR ranges). The addendum cleanly carries the technical detail (web push mechanism, admin-1 data sourcing, geopolitics) out of the narrative, which is exactly right for the architecture step.

Two gaps reduce extractability. First, there is no Glossary, and the PRD uses several domain nouns that *almost* drift: "place," "region," "admin-1," "country," "mark," "memory," "default view" / "home view" / "focus country." Most are used consistently, but "place" is overloaded — it's the unit you attach photos to (FR9), and it spans both country-level and admin-1-level marks (FR6), so "place" sometimes means a country and sometimes a sub-region. UX and architecture will need to know whether a country-level mark is the same entity type as an admin-1 mark. Second, the journeys imply a capability the FRs never state (see below), which means story creation would have to invent it.

### Findings
- **medium** "Place" is overloaded; no Glossary (§3, §4) — "Place" = the photo/note-bearing unit, but it covers both country marks and admin-1 marks (FR6, FR9). Downstream can't tell if these are one entity type or two. *Fix:* add a one-line definition: is a country-level mark a "place" that can hold photos/notes, or can memories only attach at admin-1? The journeys only ever attach memories at admin-1 (Japan→prefecture, Vietnam→province), suggesting country marks are visited-only — state that explicitly.
- **low** No Glossary for near-drift terms (home view / default view / focus country) — Addendum reconciles "home view" vs "default view" but the PRD body uses "default view" only; minor. *Fix:* a 5-line glossary would lock these for downstream.

## Shape fit — strong

The shape matches the product. This is a consumer-experience product with meaningful UX, so UJs with a named protagonist are load-bearing — and that's exactly what §3 provides, with a single justified protagonist rather than invented personas. It is not over-formalized (no traceability matrix, no metrics framework, no four-persona spread — correctly absent for solo stakes) and not under-formalized (the experience-critical journeys are present and concrete). The PRD explicitly self-identifies its stakes ("personal-first," "deliberate path to opening up") and calibrates rigor accordingly. The addendum split is the right move for a chain-top PRD feeding architecture.

The only shape note: because this is consumer/experience-shaped, the missing edit/delete capability (below) matters more than it would for an internal tool — users *will* fix typos and remove bad photos, and the journeys already show Simon adding photos after the fact.

### Findings
- **high** Edit/delete of marks, photos, notes, and dates is implied by the journeys but absent from the FRs (§3 vs §4) — UJ-2 shows Simon adding a photo to an existing place after the fact (edit), and the whole "add details later" premise (FR13) implies a place is mutable, but no FR grants removing a photo, editing a note, un-marking a place, or changing/clearing a date. A consumer product without delete/edit is a gap story creation would have to invent. *Fix:* add FRs: "a user can edit or remove a note, photo, and date on a place" and "a user can un-mark a visited place." Even if minimal, state it.

## Mechanical notes

- **IDs:** FR1–FR21 and NFR1–NFR6 are contiguous and unique; UJ-1..3 clean. No gaps or duplicates found.
- **Cross-refs resolve:** §6 FR-range citations (FR1–FR4, FR5–FR8, FR9–FR13, FR14–FR17, FR18–FR21) match §4 grouping. §7/§8 references to the addendum are accurate; addendum FR17 reference is correct.
- **Glossary:** absent. Recommended (lightweight, ~5 terms) given chain-top handoff — see Downstream findings. Main risk term is "place."
- **Assumptions Index:** no `[ASSUMPTION:]` tagging used; acceptable for solo stakes. Risks/opens are instead captured narratively in §7 and routed to steps — adequate substitute at this rigor level.
- **UJ protagonists:** all three UJs carry Simon as named protagonist with inline context; no floating UJs.
- **Parked-items duplication:** §6 "Parked / fast-follow" and addendum "Parked / fast-follow" are near-identical lists. Intentional (PRD summary vs addendum detail) and consistent, but keep them in sync if either changes.
- **Name status:** "Mapsake" correctly marked proposed/pending verification in both header and §7 — no premature commitment.
