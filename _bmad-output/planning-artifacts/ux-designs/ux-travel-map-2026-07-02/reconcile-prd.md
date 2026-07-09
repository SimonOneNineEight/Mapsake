# Reconcile: PRD v2 ↔ UX Spines (DESIGN.md + EXPERIENCE.md)

Date: 2026-07-08 · Run: ux-travel-map-2026-07-02 · Reconciler: input-reconciliation subagent

**Source:** `../../prds/prd-travel-map-2026-07-02/prd.md` (final v2 PRD) — UX-owned FRs: FR1-5, FR8-12, FR14-24, FR26, FR28, FR29, FR31; NFR1/3/8; §6 UX-owned open questions.
**Outputs checked:** `DESIGN.md`, `EXPERIENCE.md` (both `status: draft`, updated 2026-07-08). Cross-checked against `.decision-log.md`.

**Verdict: STRONG coverage with two substantive gaps.** Every UX-owned FR except the note-entry moment (FR9/FR24) and the folded-in backfill resolution (FR11) has its behavior specified in EXPERIENCE.md — including the easy-to-forget FR29 (edit/delete, present but surfaces unframed) and FR31 (offline read, fully specified). Of the PRD's four UX-owned open questions, two are resolved (one not yet folded into the spines), two are carried forward in the decision log only. Finalize housekeeping (mockups/ promotion, open-items section) remains.

---

## 1. FR-by-FR coverage

Legend: ✅ specified · ⚠️ partial / caveat · ❌ gap. "Where" cites EXPERIENCE.md (E) / DESIGN.md (D) sections.

| FR | Requirement (gist) | Status | Where / notes |
|---|---|---|---|
| FR1 | Parchment map identity, PMTiles, native fluidity | ✅ | E:Foundation, E:Read-only map; D:Colors map layer ("carried from v1 / FR1"). Fluidity bar = NFR1, inherited not restated (per E header note) — acceptable. |
| FR2 | Geographic (not proximity) clustering; count pins; tap dives | ✅ | E:Cluster pins ("by geography, not proximity… 「12 個回憶」… tap → dive"); D:cluster-pin component (visual design the PRD deferred to UX — delivered). |
| FR3 | Read-only map; tap never writes; long-press only write; derived visited fill; no region marking on iOS | ✅ | E:Read-only map component + Interaction Primitives ("Tap = read, always"). Complete, including memories ∪ legacy-marks derivation, read-only on iOS. |
| FR4 | Search as capture front door; names (zh-TW-first) or pasted addresses; map flies | ✅ | E:Search pill + Search components (helper 地點名稱或地址都可以; 「你去過 N 次」 rows). |
| FR5 | Long-press "add memory here"; draggable fine-tune pin + reverse-geocoded preview | ✅ | E:Fine-tune pin (44pt draggable, plain-text address — "never the word for the mechanism", honoring Simon's 反查地址 jargon ban) + long-press primitive. |
| FR8 | Date-led photo suggestions; contextual permission; full/limited honored; on-device; nothing auto-attached; manual always; v1 upload caps | ✅ | E:Photo step + E:State Patterns "Permission states" (full / limited + manage-selection / denied → manual, no nagging). Caps phrased per voice guide. Thorough. |
| FR9 | Notes are per-visit | ⚠️ | Notes specified everywhere they are *displayed* (E:Pin sheet, E:Re-live sheet) and *edited* (E:Edit/remove) — but **no note-entry step exists in the capture flow** (search → fine-tune → date → photos → save). See Finding 1. |
| FR10 | Save moment: animation + haptic; Reduce Motion | ✅ | E:Save moment (settle + ripple + haptic, exact timings) + Reduce Motion fallback in three places (component, State Patterns, Accessibility). Save shown only after acknowledged write (NFR4). Exemplary. |
| FR11 | Capture loop; backfill = rapid name-only memories; empty memory colors region | ⚠️ | E:Capture loop + E:State "Contentless backfill memory" cover the loop and coloring. **But the §6 granularity resolution (approximate region-center pin, 「記錄這個地區」, hollow/dashed marker) is in the decision log only — not folded into E components or D pin-marker.** See Finding 2. |
| FR12 | Session recap; session-end trigger (PRD assumption: inferred) | ✅ | E:Session recap via explicit 完成這次記錄 — resolves PRD Assumption #2 toward **explicit** (decision-log triage: "RESOLVED de facto"). Recap content (place · date · photo count, no 第 N 次) specified. Feed resolution back to PRD assumptions index. |
| FR14 | APNs photo-rich notification; photo earns the tap | ✅ | E:IA Lock-screen row + UJ-2; text-only fallback (NFR2) in State Patterns; D:notification thumb radii. |
| FR15 | Deep-link to that date's visit; fly + glow + open right visit | ✅ | E:Re-live landing/sheet + glow primitive (timings, Reduce Motion static halo); UJ-2 flow. |
| FR16 | "N more from this day" cohort | ✅ | E:Re-live sheet cohort chip 「這天還有 N 個回憶 →」. Tap-behavior beyond the chip inherits v1 ("carries over") — acceptable; note for architecture. |
| FR17 | One coherent notification-control surface (enable, global off, mute, delivery time) | ✅ | E:Notification controls (one surface: toggle + delivery time + 靜音的地點) + mute placement in re-live ⋯ overflow + Muted place state row. Graduated curation → §3 below. |
| FR18 | "On this day" widget (stretch; epic planning decides) | ❌ | **Zero mentions in either spine.** No design, no carried open item. If epic planning says IN, there is no UX for it. See Finding 6. |
| FR19 | Collection behind first-class, labeled navigation | ✅ | E:IA three-tab bar; v1 hidden-button named as the anti-pattern. |
| FR20 | Geographic hierarchy continent → country → region → place | ✅ | E:Geographic browse (section labels → country rows → region rows with place previews → dive to map). |
| FR21 | Search serves browse; visited place jumps to it | ✅ | E:Search component ("Search doubles as browse") + in-collection search field + UJ-3. |
| FR22 | Photo viewing at Apple Photos bar; pinch-to-zoom | ✅ | E:Interaction Primitives — full-screen viewer owns swipe + pinch-to-zoom so gestures never collide with sheet/map. Viewer chrome not visually specced in D (native inheritance covers it) — minor. |
| FR23 | Signed-in-first; Apple + Google + email; returning-web steering; identity continuity | ⚠️ | E:Sign-in component (order, reassurance line, steering copy). Continuity mechanics correctly left to architecture. **Email magic-link flow (enter email → check-inbox wait state) has no framed screens** — minor, folded into Finding 6. |
| FR24 | First run: intro → sign-in → guided first memory → recap → contextual notification ask | ⚠️ | E:First-run IA + UJ-4 + Notification pre-prompt (mini preview with the user's own place — a design win beyond the PRD floor). **But FR24 says the guided first memory is "a real memory with note + photos" — the note is missing here too** (E:UJ-4 lists "a place she loves, a date, a few photos"). Same root cause as FR9. See Finding 1. |
| FR26 | Designed settings + account surface: account, notifications, default view, muted places, export, **language**; opens to saved default view | ⚠️ | E:Settings component + IA (cold open to saved default view, world default). All enumerated items present **except the language row** — defensible since v2 is zh-TW-only (English post-v2, Assumption 4), but the omission vs the PRD's explicit list is unrecorded. Also: the interaction for *changing* 預設畫面 is not specified. Folded into Finding 6. |
| FR28 | zh-TW-first native voice; 語感 guide before screens; Simon reviews all copy | ✅ | E:Voice and Tone (guide LOCKED 2026-07-08, vocabulary binding, process contract: candidates until blessed). D:Do's/Don'ts encode the register. Process requirement fully honored per decision log (guide preceded screens). |
| FR29 | Edit/remove: pin name; visit date/note; photos; delete visit; delete pin; calm confirmations | ⚠️ | **Present — not forgotten** (the prototype never showed it, but E:Edit/remove specifies the full v1-parity behavior set + confirmation posture + …此動作無法復原 copy pattern). **However: "Surfaces not yet framed — see open items"** — entry points (where edit lives on the pin sheet, delete-visit vs delete-pin flows) are undesigned, and the referenced open-items section does not exist in either spine. See Finding 3. |
| FR31 | Offline read: previously viewed map/pins/memories/photos browsable; capture needs connection, said calmly | ✅ | **Present — not forgotten.** E:State Patterns "Offline" row specifies the read-only posture, scope (previously viewed content), and the quiet write-affordance treatment ("never a hard wall or a silent failure"). Mid-capture connection loss covered by the Save failure state (entry retained, calm retry). |

### NFRs (UX-relevant)

| NFR | Status | Notes |
|---|---|---|
| NFR1 (fluidity) | ✅ | Inherited per E header; UX honors it structurally (native SwiftUI defaults, sheet grammar, gesture ownership). Engineering bar, not a spine gap. |
| NFR3 (privacy) | ✅ | Contextual photo permission at first attach; full/limited honored; on-device suggestions; no auto-attach — all in E:Photo step + Permission states. Consistent with PRD. |
| NFR8 (accessibility) | ⚠️ | E:Accessibility Floor covers VoiceOver (incl. canonical browse path), Dynamic Type + zh-TW/CJK floors, Reduce Motion (save + glow + fly-to), 44pt targets (incl. padded cluster pins), visited never color-alone (hatch + small-region fallback). D recomputes the full AA contrast table — **one pair fails: terracotta on terracotta-soft (selected chip, 14px/500) at 4.09:1, flagged "do not ship as-is", resolution undecided.** See Finding 5. |

---

## 2. Cross-document consistency checks

- **FR/UJ traceability:** EXPERIENCE.md cites FR numbers inline throughout; UJ-1..4 flows map 1:1 to the PRD journeys with the PRD's protagonists and success criteria (SC1/SC2/SC4) named at the climaxes. Clean.
- **Vocabulary:** the binding vocabulary (記錄 · 選擇地點 · 上傳 · 重溫 · 回憶 · 第 N 次 · 已儲存 · 地點 · 去過的地點) is applied consistently across both spines. The 地方→地點 sweep from the decision log is reflected. PRD FR28's "capture verb concept (封存-family)" was arbitrated to plain 記錄 by Simon — a deliberate, logged supersession, not a drift.
- **Spine boundary discipline:** DESIGN = visual, EXPERIENCE = behavior, with token cross-references (`{colors.glow}`, `{components.tab-bar}`) resolving correctly against D's frontmatter. No contradictions found between the two spines.
- **PRD anti-patterns:** the banned list (feeds, streaks, percentages, scarcity, nags) appears verbatim in E:Interaction Primitives and D:Do's/Don'ts, plus the elevated no-frame-jolt principle. Consistent with PRD §6 Out.
- **Broken references:** both spines' frontmatter `sources:` and body text cite `mockups/capture-flow-prototype.html` and `mockups/voice-guide.md` — **`mockups/` does not exist**; the artifacts live in `.working/`. The decision log lists "promote keepers to mockups/" as a remaining finalize step. See Finding 4.

---

## 3. PRD §6 UX-owned open questions — disposition

| Open question (PRD §6) | Owner | Disposition | In the spines? |
|---|---|---|---|
| Empty-memory placement granularity (FR11) | UX + architecture | **RESOLVED** (Simon, open-items triage): approximate pin — 「記錄這個地區」 places one region-center pin, APPROXIMATE hollow/dashed marker variant, colors region, upgradeable by drag. | **NO — not folded in.** Decision log explicitly says "to be folded in post-distillation since the distiller launched before this decision." Missing from E:Component Patterns and D:pin-marker. → Finding 2. |
| Session-recap trigger (FR12 assumption: inferred vs explicit) | UX | **RESOLVED de facto:** explicit 完成這次記錄 button (approved prototype). | **YES** — E:Session recap / Capture loop. Feed back to PRD Assumptions Index #2. |
| Graduated re-live curation beyond binary mute (FR17) | UX | **CARRIED FORWARD:** v2 ships place-mute in the re-live ⋯ overflow; graduated "show this less" = post-v2 refinement, "carried to architecture/epics as a noted deferral." | **Decision log only.** E shows the ⋯ mute home but neither spine records the deferral. → Finding 6. |
| Late-arriving v1 gripes sweep ("intake not finished") | UX | **STILL OPEN:** log (2026-07-08): "Gripes sweep: still open… Simon hasn't declared the list complete." One gripe (login-zoom → no-frame-jolt principle) was captured and elevated. | Partially — the captured gripe is in both spines; the sweep itself was never closed and the spines are being finalized anyway. → Finding 6. |
| (⛔ Multi-visit data model; EXIF strip; widget in/out) | Architecture / epic planning | Not UX-owned — correctly untouched by the spines, **except FR18 widget which has no UX carry-forward at all** (→ Finding 6). | — |

---

## 4. Findings

**Finding 1 (HIGH) — Note entry is missing from the capture flow (FR9, FR24, UJ-4).**
FR9 makes notes per-visit; FR24 defines the guided first memory as "a real memory with **note** + photos"; UJ-2's payoff is Simon reading "his own line back." Yet the specified capture ritual — search → fine-tune → date → photos → save (E:Component Patterns, E:UJ-1, and all 14 prototype frames) — has **no step or affordance for writing a note**. Notes exist only as displayed content (pin sheet, re-live sheet) and as an editable field (FR29). Either (a) a note affordance is added to the capture flow (e.g., an optional field on the photo step or a quiet post-save "加一句話" moment — must respect the one-skip-per-screen rule), or (b) note-writing is deliberately deferred to the pin-sheet edit surface and the spine + FR24's "with note" expectation says so explicitly. Right now it is silently unresolved, and it degrades the re-live payoff (a capsule with no words).

**Finding 2 (HIGH) — The resolved backfill-granularity decision is not folded into the spines (FR11, §6).**
Simon resolved the PRD's open question (approximate region-center pin, 「記錄這個地區」 capture entry, hollow/dashed APPROXIMATE marker variant, drag-to-upgrade), and the decision log flags the fold-in as pending. Neither EXPERIENCE.md (no capture-flow branch for region-level search results, no component row) nor DESIGN.md (no pin-marker approximate variant) contains it. Since the spines declare "spines win on conflict," a downstream reader would conclude the question is still open — or worse, design point-precision backfill. Fold in before `status: final`.

**Finding 3 (MEDIUM) — FR29 edit/delete surfaces unframed, and the "see open items" pointer dangles.**
The behavior set is fully specified (good — this was the easy-to-forget FR), but the entry points are not: where edit lives on the pin sheet, the delete-visit vs delete-pin flows, and the confirmation sheets are "not yet framed." Both spines reference "open items" (E:Edit/remove; D:contrast note "see the run's open items") but **no open-items section exists in either document** — the inventory lives only in `.decision-log.md`. Add an explicit Open Items section (or appendix) to the spines listing: FR29 surfaces, sheet detent set, selected-chip contrast, Latin wordmark face, export screens, approximate-pin frames.

**Finding 4 (MEDIUM) — Broken artifact references: `mockups/` doesn't exist.**
Both spines' `sources:` frontmatter and body text point at `mockups/voice-guide.md` (called "the microcopy contract" and "LOCKED") and `mockups/capture-flow-prototype.html` (the behavioral reference, "Simon-approved"); both files are still in `.working/`. The promotion step is on the finalize checklist but hasn't run. Until it does, the two most load-bearing references in the handoff resolve to nothing.

**Finding 5 (MEDIUM) — One AA contrast failure open (NFR8): selected-chip text at 4.09:1.**
DESIGN.md's recomputed table honestly flags terracotta-on-terracotta-soft (14px/500 selected chips — date shortcuts, cohort chip) as below the 4.5:1 text floor, "do not ship as-is." Which side moves (darker text vs lighter tint) is undecided. Tracked, but it must not survive into `status: final` unresolved — it contradicts the spine's own AA guarantee.

**Finding 6 (LOW) — Small unrecorded drops and log-only carry-forwards.**
(a) **FR18 widget:** zero spine mentions; if epic planning votes IN, no UX exists — add a one-line carried item. (b) **FR26 "language" settings row:** dropped from the settings spec without recorded rationale (defensible for zh-TW-only v2, but say so). (c) **Graduated curation deferral** and (d) **the still-open v1 gripes sweep** live only in the decision log — surface both in the spines' open-items section so architecture/epics inherit them without reading the log. (e) **Email magic-link flow** (FR23): entry/wait screens unframed. (f) FR12's resolution should flow back to the PRD Assumptions Index (#2 → decided: explicit).

---

## 5. Recommended actions before `status: final`

1. Decide and spec the note-entry moment (Finding 1) — needs Simon (voice guide governs any new copy).
2. Fold the approximate-pin resolution into E:Component Patterns (+ capture-flow branch) and D:pin-marker variant (Finding 2).
3. Add an Open Items section to both spines covering Findings 3–6 inventory; fix the two dangling "see open items" pointers.
4. Promote `.working/voice-guide.md` and `.working/capture-flow-prototype.html` to `mockups/` (Finding 4).
5. Resolve the selected-chip contrast pair (Finding 5) — one token change, then re-verify the D table.
6. Ask Simon to declare the gripes sweep closed (or capture stragglers), and record the FR26 language-row rationale + FR18 widget carry-forward one-liners.

Coverage otherwise: **21 of 24 UX-owned FRs fully specified, 3 partial (FR9/FR24 note, FR11 fold-in, FR29 surfaces), 1 absent (FR18 — stretch, decision not UX's).** The spines are faithful to the PRD's soul: read-only map, plain-spoken zh-TW, calm states, the save moment as the emotional carrier, and the banned-mechanics list intact.
