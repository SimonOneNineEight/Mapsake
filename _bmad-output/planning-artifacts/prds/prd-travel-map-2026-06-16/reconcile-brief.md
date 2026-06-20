# Input Reconciliation: Brief → PRD

Comparing the product brief (source of truth for intent) against the PRD draft and addendum. This report surfaces only **gaps** — what the brief said, explicitly or in spirit, that the PRD dropped or weakened. It does not rewrite the PRD.

Overall: the PRD is structurally faithful on the *functional* layer. The four positioning bets, the success criteria, and the scope items are nearly all carried forward as requirements. The losses are almost entirely **qualitative** — the emotional core, the voice, and the anti-performative stance were flattened into clean requirement language. A reader of the PRD alone would build the right features and miss the soul.

---

## 1. The emotional core / "quiet place you return to for yourself" was flattened

The brief's thesis is not a feature; it is a *feeling*. Key phrases that carry it:

- "The product's real job isn't logging — it's bringing you back." (PRD keeps this line — good.)
- "you find yourself wandering your own map again" / "happily wander my own map"
- "a quiet, personal record for themselves"
- "the place you've kept your trips for a decade, that still feels good to open"
- "the antidote to performing your travels, the place you keep them for yourself"

What the PRD did: it preserved the *mechanics* of the loop (FR18–FR21, UJ-2) and even kept the "bringing the user back" sentence. But the **Vision section of the brief has no home in the PRD at all.** There is no vision statement, no "still feels good to open in a decade," no "antidote to performing your travels." The single most emotionally load-bearing sentence in the brief — *"The line it never crosses: it stays a quiet, personal place, the antidote to performing your travels, the place you keep them for yourself"* — is absent. This is the durable north star that should constrain every future feature decision, and it was dropped entirely.

**Gap:** No Vision section. The long-horizon emotional promise ("kept for a decade, still feels good to open") and the explicit never-cross line are gone.

## 2. The anti-social / anti-performative positioning was weakened from a *stance* to a *scope exclusion*

In the brief, "private over social" is the **first and defining bet**, framed positively and emotionally: "No leaderboards, no compare-with-friends, no public feed. The quiet place you return to for yourself." The brief also names the deeper motive: the user is "not trying to broadcast (they already posted on Instagram)" and the product is "the antidote to performing your travels."

In the PRD, this survives only as:
- NFR2 "Privacy by design" (a security/visibility requirement), and
- A scope exclusion bullet "Social features … Private by design."

That converts a *point of view* into a *checkbox*. The "antidote to performing your travels" / "already posted on Instagram" framing — the *why* behind the privacy stance — is gone. The PRD never states the user is deliberately opting *out* of the performance economy; it only states data isn't shared. A future PM reading the PRD could rationalize "lightweight sharing" as harmless because the anti-performative *reasoning* was never recorded.

**Gap:** The anti-performative motive (the emotional/strategic reason for privacy) is missing. Privacy reads as a technical default, not a deliberate identity.

## 3. The brief's voice/tone was lost (mostly acceptable, but one substantive loss)

The brief is written warmly and specifically ("from the couch, weeks later, with a camera roll and a few fond memories"; "drops your Osaka photo in Tokyo"). The PRD is appropriately more clinical — that is normal and fine for a requirements doc. Two specifics worth noting:

- The PRD *did* keep the "Osaka photo in Tokyo" intent abstractly (FR9 "the place they explicitly selected") but dropped the vivid example and the brief's bet-language "no mystery auto-tagging." The **"manual and intentional over auto-magic"** bet (bet #3) is the most weakened of the four — see §4.
- Largely a non-issue elsewhere; flagging only so the team knows the warmth lives in the brief and should be the reference for any user-facing copy.

## 4. Positioning bets — coverage check

All four bets are *present* but unevenly. Bet #3 is materially weakened.

| Bet (brief) | PRD coverage | Verdict |
|---|---|---|
| 1. Private over social | NFR2 + scope exclusion | Present but reduced to mechanics (see §2) |
| 2. Remembering over tracking | Overview, UJ, scope ("out by design, not by timeline") | **Intact** — strongest carry-forward |
| 3. Manual & intentional over auto-magic | FR9 ("explicitly selected") only | **Weakened** — see below |
| 4. Trustworthy & durable | FR1–4, NFR1, NFR6, counter-metric | **Intact** — well carried |

**Bet #3 weakening (the notable one):** The brief frames this as a deliberate *philosophy* — "You choose a place and add to it deliberately — full control, no mystery auto-tagging." The PRD encodes only the narrow consequence (photos attach to the explicitly-selected place). It never states the *principle* that the product rejects auto-magic / auto-tagging as a stance. This matters because the addendum's parked list includes EXIF date pre-fill and photo clustering — features that flirt with auto-magic. Without the stated principle in the PRD, there's no guardrail explaining *why* those must stay manual-first ("never auto-place on the map" appears in the addendum but the governing principle does not appear anywhere prominent).

**Gap:** The "manual & intentional, no auto-magic" *principle* is not stated as a principle anywhere in the PRD — only its narrowest mechanical consequence.

Also note: the brief's honest framing of the **moat** — "the honest moat here is not technology — it's point of view and execution. Doing the simple thing well, for the user everyone else is ignoring" — has no place in the PRD. This is strategic positioning, not a feature, but it's the sentence that justifies the whole "do less, do it well" approach. Its absence means the PRD doesn't record *why* simplicity/execution is the strategy.

**Gap:** The moat/strategy statement ("point of view and execution," "doing the simple thing well, for the user everyone else is ignoring") is dropped.

## 5. Success criteria — intact, with one nuance lost

Stage 1 and Stage 2 criteria are carried forward almost verbatim (PRD §2) — good. The PRD even improved on the brief by adding explicit counter-metrics.

One nuance softened: the brief's Stage-1 phrasing on notifications carries a sharp falsifiability — *"if they're muted, the core thesis is wrong, and better to learn that early."* The PRD keeps "opened, not muted" in the goal and recovers the falsifiability in the counter-metric ("If users turn notifications off, the core thesis is failing"). So this is **preserved**, just split across two sections. No real gap, noted for completeness.

The brief's framing that the personal bar is fundamentally *"does the loop work?"* and the immediate bar — *"I open it on a random Tuesday and happily wander my own map"* — is partially preserved (PRD §2 Stage 1) but the memorable "random Tuesday … happily wander my own map" phrasing is gone. Minor.

## 6. Scope — one silent shift + one addition to verify

### Silent shift: granularity narrowed from "country or region" to "admin-1" without flagging it as a decision

- **Brief:** "Mark a place visited (binary), at **country or region level**" and "world → country → **sub-region**." The brief is deliberately loose about what "region" means.
- **PRD/addendum:** hardened to **"admin-1"** specifically, with a data-driven per-country rule (US→states, Japan→prefectures, Taiwan→counties, UK→constituent countries).

This is a *reasonable and arguably good* refinement — but it is a **decision that was made downstream and presented as if it were always the scope.** The brief did not say "admin-1." A reader comparing the two should know that "region" was *interpreted* as admin-1, and that a consequence — **sub-city / city-level pins** (e.g. "the temple," "Los Angeles inside California") — was thereby pushed to the parked list. The brief's user story ("never added the temple from the last day") implies place-granularity finer than a prefecture; the PRD's UJ-2 keeps "the temple" as a *photo* added to the region, not as its own place. That's a defensible resolution, but it is a narrowing of what "per-place memories" could have meant, and it happened silently relative to the brief.

**Gap/flag:** "region" → "admin-1" is an unflagged scope hardening; city/sub-region pins moved to parked as a side effect. Verify this narrowing is intended and acceptable.

### Addition to verify: PWA install became a *required v1 feature* and a *load-bearing risk*

The brief's scope does **not** mention PWA install at all — it only says "web-first" and defers stack detail to the addendum. The PRD elevates **PWA install to FR17 (a hard onboarding requirement)** and makes it the #1 risk. This is correct and well-reasoned (web push on iPhone needs it), and it traces to the brief's retention-loop intent — but it is *new scope* relative to the brief's explicit "In v1" list. Flagging so the team confirms FR17 is accepted as in-scope v1 work, not scope creep. (The addendum justifies it thoroughly; this is a "make sure the brief's owner signed off" note, not a defect.)

### Other scope items — faithful

- Accounts/durability/sync/export: faithful (export FR4 is actually an *addition* the brief implied via "the memories are theirs" / durability — good carry-forward of spirit).
- Optional date never required: faithful (FR11).
- "Add details later" / bare entry is complete / nothing flagged unfinished: faithful (FR13) — and this is an emotional-design point the PRD kept well.
- Onboarding default-view choice: faithful (FR14–16).
- Parked/fast-follow list: faithful and *expanded* (addendum adds city-pins rationale). Good.
- Live GPS out "by design, not by timeline": faithful, even reuses the brief's exact phrasing. Good.

## 7. Smaller dropped specifics (lower priority)

- **The competitive "why now" / problem texture.** The brief's Problem section names specific failures (Been/Visited/Skratch lose data on logout; Polarsteps/FindPenguins force live tracking; Google Maps Timeline deleted histories in 2025). The PRD has **no Problem/competitive section at all.** The pain that justifies each bet is gone. A PRD reader knows *what* to build but not *what category failure each requirement is answering.* (NFR1's aside "the cardinal sin of the category" is the only surviving trace.)
- **"They log one trip, feel a flicker of satisfaction, and never return."** The brief's crisp statement of the retention-cliff problem — the thing the whole product is engineered against — is reduced to the metric "users return in week two." The *narrative* of why that's the make-or-break is gone.
- **"Built by someone who wants exactly this and can't find it."** Carried forward (PRD names Simon, "can't find it"). Good.

---

## Priority summary

1. **No Vision section / lost never-cross line** — "a quiet, personal place, the antidote to performing your travels, the place you keep them for yourself" and "kept for a decade, still feels good to open" are absent. This is the emotional north star. (§1)
2. **Anti-performative positioning reduced to a privacy checkbox** — the *why* (opting out of broadcasting/Instagram performance) is gone; privacy reads as a technical default, not an identity. (§2)
3. **Bet #3 ("manual & intentional, no auto-magic") weakened** — only its narrowest mechanical consequence (FR9) survives; the governing principle that guards against future auto-magic features is unstated. (§4)
4. **"region" silently hardened to "admin-1"** — a reasonable but unflagged scope decision that pushed city/sub-region pins to parked; verify intent. (§6)
5. **No Problem/competitive section** — the category failures that justify each bet (data loss, forced tracking, deleted histories) are gone, plus the moat statement ("point of view and execution"). (§4, §7)

Not gaps (confirmed intact): success criteria both stages, counter-metrics, durability bet, "remembering over tracking" bet, "add details later," optional date, GPS-out-by-design, parked list.
