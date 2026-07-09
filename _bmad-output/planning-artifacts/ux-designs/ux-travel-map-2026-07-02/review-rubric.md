# Spine Pair Review — Mapsake v2 (native iOS)

Reviewed: `DESIGN.md` + `EXPERIENCE.md` (both updated 2026-07-08, status: draft), against `references/validate.md` rubric and `references/design-md-spec.md`. Sources walked: PRD (`prd-travel-map-2026-07-02/prd.md`), v1 spines, `.decision-log.md`. Stakes: consumer, personal + published.

## Overall verdict

A disciplined, near-ship contract: canonical shape on both spines, a token system where every cross-reference resolves, a recomputed contrast table that survives independent verification, and tight behavioral tables a downstream consumer can extract from directly. Two unfinished finalize steps keep it from being trustworthy as-is: the `mockups/` promotion never happened (the governing voice guide and the 14 approved prototype frames are cited at paths that do not exist), and the Simon-resolved approximate-pin decision — explicitly logged "to be folded in post-distillation" — is absent from both spines, which under spines-win-on-conflict silently overrides a committed decision. Close those two plus the flagged chip-contrast open item and this pair is a strong contract.

## 1. Flow coverage — strong

Extracted UJ-1 through UJ-4 from the PRD (its only journey set). All four have Key Flows in EXPERIENCE.md with named protagonists (Simon ×3, 雅婷), numbered steps, and an explicit **Climax** beat tied to a success criterion (SC1, SC2, FR19, SC4). UJ names match the PRD verbatim. Failure paths present on UJ-1 (save retry, NFR4) and UJ-4 (notification decline).

### Findings

- **low** UJ-2 and UJ-3 have no failure paths (EXPERIENCE.md §Key Flows). UJ-2's most plausible failure — the notification deep-links to a visit deleted or muted since send — is unhandled anywhere in the pair. *Fix:* one failure line on UJ-2 (or a State Patterns row: deep-link target gone → land on the map, calm note); UJ-3 arguably needs none beyond the offline row that already exists.

## 2. Token completeness — strong

Extracted every frontmatter token (14 colors, 14 typography roles, 5 radii, 9 spacing entries, 17 component token groups) and every `{path.to.token}` reference in both files (grep-exhaustive). **Every reference resolves**; no orphan paths. All color tokens carry hex (including 8-digit alpha hex for `hairline`/`grabber`). Platform conventions handled semantically per spec (Dynamic Type mapping note). Contrast targets stated for load-bearing combinations; I independently recomputed three rows (ink/parchment 10.84:1, terracotta/terracotta-soft 4.09:1, hero-as-text 3.88:1) — all match the table.

### Findings

- **medium** The selected-chip pair `terracotta` on `terracotta-soft` is 4.09:1 at 14px/500 — a known AA text failure, honestly flagged "do not ship as-is" (DESIGN.md §Colors contrast table), but with no resolution direction chosen and no tracked home (the pointer "see the run's open items" resolves to nothing — see §7). Affects date-shortcut chips and the re-live cohort chip. *Fix:* decide which side moves (darken selected-chip text or lighten the tint), update the frontmatter pair, re-verify ≥ 4.5:1 before `status: final`.
- **low** `components.tab-bar.border-top` hardcodes `#3A2E2214` instead of referencing a token; the value is only documented in a comment on `colors.hairline`, which a mechanical token consumer never sees (DESIGN.md frontmatter). *Fix:* add a `hairline-strong` token (or accept `{colors.hairline}` for both).

## 3. Component coverage — adequate

Extracted every component named anywhere in the pair. All 17 DESIGN.md component token groups have matching prose rows in §Components with real visual rules (anatomy, sizes, state appearance); EXPERIENCE.md §Component Patterns carries 18 behavioral rows with genuine rules, not one-worders. The two tables interlock cleanly (widget-level vs surface-level).

### Findings

- **high** The **approximate pin** is missing from both spines. `.decision-log.md` (2026-07-08 open-items triage) records it as RESOLVED by Simon — capture search on a region/country offers 「記錄這個地區」 → one pin at the region's center, styled APPROXIMATE (hollow/dashed marker variant), upgradeable by dragging — with the explicit note "to be folded in post-distillation since the distiller launched before this decision." It was never folded in: DESIGN.md `pin-marker` has no approximate variant; EXPERIENCE.md Search/Capture patterns never offer 「記錄這個地區」. Since the spines win on conflict, the pair silently suppresses a committed decision, and downstream architecture will re-open the PRD §6 backfill-granularity question or build point-only capture. *Fix:* add the marker variant to DESIGN.md (frontmatter + §Components) and the 「記錄這個地區」 behavior to EXPERIENCE.md Search + Capture-loop rows.
- **medium** Pin sheet multi-visit anatomy is unspecified: "Multi-visit pins accumulate history (FR6); per-visit date/note/photos (FR9)" says *that* history accumulates, not *how* it renders — which visit lands first, whether visits list or page, how the user moves between them (EXPERIENCE.md §Component Patterns, Pin sheet). This is the core read surface; downstream must invent it. *Fix:* specify default visit (most recent?), the history affordance, and per-visit content layout.
- **low** The full-screen photo viewer has behavioral rules (Interaction Primitives: owns swipe + pinch, FR22) but no row in either component table — chrome, background tone, and dismissal gesture unstated. *Fix:* one row each.
- **low** Toast has a visual spec but no behavioral rules (duration, position, stacking). *Fix:* one line in Component Patterns or State Patterns.

## 4. State coverage — adequate

Walked all eight IA surfaces. Strong where it matters most: capture carries saving / save-failure / photo-upload / permission (full–limited–denied) / Reduce Motion rows; offline is app-wide and calm (FR31); muted places, contentless backfill, photo-less notifications, and export all have rows. The "absence is normal" principle is stated and applied.

### Findings

- **medium** Capture search has no no-results / geocoding-failure state — step 1 of the flagship flow (EXPERIENCE.md, Search row + State Patterns). What does the user see when 清水寺 misspelled returns nothing, or geocoding times out? *Fix:* a state row with candidate copy (invitation-register, next-step-first).
- **medium** Sign-in states are unspecified (First-run, FR23): the email magic-link path has no waiting/"check your mail" state or return-to-app behavior, and Apple/Google cancel-or-failure has no treatment. First-run is launch-critical and 雅婷's whole journey crosses it. *Fix:* state rows for magic-link waiting + provider cancel/failure.
- **medium** Zero-memory account states are covered only by the generic "invitation, not apology" principle: empty 地圖 (a bare world) and empty 去過的地點 have no specified treatment, and both are reachable — capture's 取消 exits the guided first memory. *Fix:* specify both (the empty browse tab is the natural place to re-invite capture).
- **low** Map tile cold-load has no state (v1 shipped a blank-map tile bug post-launch; one line on parchment-toned placeholder vs spinner would prevent a repeat).
- **low** Re-live deep-link to a deleted/absent visit — see §1 finding; counted once.

## 5. Visual reference coverage — broken

Listed every file in `mockups/`, `wireframes/`, `imports/`: **`mockups/` and `wireframes/` do not exist in this workspace, and `imports/` is empty** (consistent with the log's "Imports: none"). Yet both spines cite `mockups/capture-flow-prototype.html` (frontmatter sources + inline at both headers and IA) and EXPERIENCE.md cites `mockups/voice-guide.md` as frontmatter source and inline. The actual files live in `.working/` — scratch space. Spines-win-on-conflict is stated (more than once). No orphan visual artifacts other than the un-promoted `.working/` contents themselves.

### Findings

- **high** Both load-bearing external references are broken paths. `mockups/voice-guide.md` is declared "the microcopy contract … the guide governs" (EXPERIENCE.md §Voice and Tone) and `mockups/capture-flow-prototype.html` is the composition/behavioral reference for 14 Simon-approved frames — neither resolves; the files sit at `.working/voice-guide.md` and `.working/capture-flow-prototype.html`. The decision log's finalize checklist ("promote keepers to mockups/") was never executed. A downstream consumer drafting FR28 copy cannot reach the governing contract. *Fix:* create `mockups/` and promote both files (plus any ds-card keepers); paths in the spines are then correct as written.
- **low** DESIGN.md's header cites "the 'Mapsake v2' Claude Design project cards" as a composition reference — unfetchable from the repo; the projectId lives only in the decision log. *Fix:* either name the projectId inline or demote the mention to provenance.

## 6. Bloat & overspecification — strong

Both spines are tight. Tables carry the load; DESIGN.md's editorial voice stays within its license; EXPERIENCE.md prose is functional. No persona/FR/scope restatement — inheritance is by reference ("Product scope, FR/NFR numbers, and the journeys are the PRD's — inherited, not restated"). The Voice section summarizes the locked guide and says so explicitly. Save-animation timing curves in Component Patterns are implementation-flavored but load-bearing for the ritual — earned.

### Findings

- **low** The "Indicative ramp" paragraph (DESIGN.md §Typography) restates every frontmatter size in prose. Harmless as a reading aid; cut or keep at will.

## 7. Inheritance discipline — adequate

`sources` frontmatter: PRD path resolves; both v1 spine paths resolve; **both `mockups/` paths do not** (counted in §5). UJ names verbatim from the PRD. Every FR/NFR/SC number cited in the spines (FR1–FR31 subset, NFR2/4/8, SC1/2/4) exists in the PRD. Glossary consistent across spines and PRD (pin / visit / memory / visited fill; the deliberate 地點-supersedes-地方 divergence is documented in both the spine and the voice-guide history). All EXPERIENCE.md token references resolve to DESIGN.md frontmatter by name.

### Findings

- **medium** Dangling "open items" pointers with no artifact behind them: DESIGN.md says "see the run's open items" twice (chip contrast; the Latin-wordmark question) and EXPERIENCE.md has "Exact SwiftUI detent set is an open item" and "Surfaces not yet framed — see open items" (FR29 edit/remove). No open-items list exists — the decision log's triage covers only three items (backfill granularity, recap trigger, graduated curation) and none of these four. *Fix:* add an Open Items block (log or spine) enumerating: chip contrast pair, Latin display face, sheet detent set, edit/remove surface framing.
- **low** Component-name drift: DESIGN "Cluster pin" vs EXPERIENCE "Cluster pins"; DESIGN's generic "Sheet" is specialized into "Pin sheet" / "Re-live sheet" without a mapping clause. *Fix:* singularize; one line noting both sheets instantiate `{components.sheet}`.

## 8. Shape fit — strong

DESIGN.md body sections in exactly canonical order, all eight present: Brand & Style → Colors → Typography → Layout & Spacing → Elevation & Depth → Shapes → Components → Do's and Don'ts. Frontmatter has required `name` plus `description`; extra keys (title/status/dates/sources) are harmless and workflow-required. EXPERIENCE.md carries all eight required defaults in order: Foundation, Information Architecture, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows. No dropped defaults; no invented sections. **Responsive** omission is defensible (iPhone-only ship; adaptive groundwork stated in Foundation). 

### Findings

- **low** **Inspiration** is arguably triggered — the log's inherited constraints name reference products (Google Maps map feel, Apple Photos + Memories, LINE (TW), Day One widget) and rejects (封存-register copy). The anchors do appear inline where they bind (LINE in Voice and Tone; the Apple Photos bar via FR22), so the omission is defensible; noted only because a dedicated section would centralize the rejects too.

## Mechanical notes

- **Broken cross-refs:** `mockups/capture-flow-prototype.html` and `mockups/voice-guide.md` (frontmatter + inline, both spines) → actual files at `.working/`. The single biggest mechanical failure; everything else resolves.
- **Frontmatter:** both YAML blocks parse; DESIGN.md satisfies the design-md-spec key set; `map-land-unvisited` is defined but never brace-referenced (documented as `= card`; harmless).
- **Contrast table:** independently recomputed 3 of 12 rows — all match to two decimals; the table can be trusted.
- **"Spines win on conflict"** stated three times (both headers + IA); spec asks for once. Harmless.
- **FR12 closure:** the PRD assumed inferred session-end and delegated to UX; the spine's explicit 完成這次記錄 is a recorded closure (log, open-items triage), not a contradiction.
- **`{path.to.token}` in EXPERIENCE.md's header** is meta-notation explaining the syntax, not a broken reference.
- No Mermaid in either spine — nothing to lint.

## Severity totals

- **critical:** 0
- **high:** 2 (broken mockups references; approximate-pin decision not folded in)
- **medium:** 6 (chip AA pair unresolved; pin-sheet multi-visit anatomy; search no-results; sign-in states; zero-memory empty states; dangling open-items pointers)
- **low:** 10
