# Accessibility Review — Mapsake v2 spines (NFR8)

Reviewed: `DESIGN.md`, `EXPERIENCE.md`, spot-check of `.working/capture-flow-prototype.html` (14 frames).
Reviewer scope: VoiceOver semantics/reading order, Dynamic Type (zh-TW), Reduce Motion, AA contrast of actual token pairs, 44pt targets, non-color visited cue, keyboard/focus.
Date: 2026-07-08.

## Verdict

**Conditional pass — does not yet clear NFR8 as a hard requirement.** This is an unusually substantive accessibility floor for a spine: the contrast table is real math (all 12 pairs recomputed and confirmed), Reduce Motion fallbacks are specified per animation and implemented in the prototype, the visited state has an explicit non-color cue, and the one AA failure is self-flagged. But four concrete gaps block a hard-requirement sign-off: a verified AA text failure shipping in the approved frames, a drag-only interaction in the core capture step with no alternative, VoiceOver specified at element-label level with no per-screen reading order or focus management, and spec'd controls (the ⋯ overflow, chips) that fall below 44pt with no target rule covering them.

---

## 1. AA contrast — token pairs recomputed (WCAG relative-luminance formula)

Every pair in `DESIGN.md`'s table was independently recomputed. **All claimed values are accurate within rounding:**

| Pair | Claimed | Recomputed | Status |
|---|---|---|---|
| ink #3A2E22 / parchment #F2E8D5 | 10.84 | 10.84 | PASS |
| ink #3A2E22 / card #FBF4E4 | 12.02 | 12.02 | PASS |
| ink-soft #6B5B49 / parchment #F2E8D5 | 5.37 | 5.37 | PASS |
| ink-soft #6B5B49 / card #FBF4E4 | 5.96 | 5.95 | PASS |
| card / terracotta #9E4F2B (button label) | 5.31 | 5.31 | PASS |
| terracotta / parchment | 4.79 | 4.79 | PASS |
| terracotta / card | 5.31 | 5.31 | PASS |
| destructive #A33B2E / card | 5.95 | 5.95 | PASS |
| region-border #96835E / parchment (non-text) | 3.03 | 3.03 | PASS |
| terracotta-hero #B5663E / map-sea #EADFC8 (non-text) | 3.22 | 3.22 | PASS |
| terracotta-hero / card (text — banned) | 3.88 | 3.88 | correctly banned |
| **terracotta / terracotta-soft #E8D5C4 (selected chip, 14px/500)** | **4.09** | **4.09** | **FAIL vs 4.5** |

**Finding C1 (HIGH): the selected-chip pair really fails, and it is in the approved frames twice.** 4.09:1 at 14px/500 misses the 4.5:1 text floor. It appears on the date-step chips (「5 月 17 日 · 上個地點」) *and* the re-live cohort chip (「這天還有 N 個回憶 →」) — the latter is on the product's soul screen. The spine flags it honestly ("do not ship as-is") but leaves resolution undecided. For a hard NFR8, this must be resolved in the spine, not deferred to build. Cheapest fix: darken selected-chip text to ink (#3A2E22 on #E8D5C4 ≈ 8.5:1) or keep terracotta text and lighten the tint toward parchment; alternatively bump chip text to ≥18.66px/700 or 24px so the 3:1 large-text floor applies — but that fights the type ramp.

**Finding C2 (MEDIUM): component-boundary contrast (WCAG 1.4.11) is unexamined.** The table covers text and two map pairs only. Recomputed boundaries:
- field (parchment fill) on card sheet: **1.11:1**, no border, no shadow — the search field's extent is conveyed only by tone + placeholder;
- chip at rest (parchment) on card: **1.11:1**, no border/shadow;
- card on parchment (grouped cards, recap card): **1.11:1** — mitigated by the ink-tinted shadow (0 4px 16px), which is a legitimate identifying cue, so cards are acceptable;
- terracotta-soft selected chip on card: **1.30:1** — mitigated once the text contrast (C1) is fixed.
Cards pass on shadow; **fields and chips have neither shadow nor border** and should get an explicit ruling in the spine (hairline border, subtle inner shadow, or an argument for why identification-by-content suffices).

**Card-on-parchment separability (asked):** 1.11:1 by tone alone; the spine's answer is "tone + warm ink-tinted shadow," and grouped cards/sheets/pills all carry a spec'd shadow. That is adequate for AA (surfaces have no ratio requirement); the residual risk is fields/chips per C2.

**Glow #E8B48C:** vs map-sea ≈ 1.40:1 — fine, because the spine correctly treats it as non-text/decorative and the pin itself (hero fill, 3.22:1 vs sea) is the locator. The Reduce Motion static halo at ~40% opacity is even fainter but is supplementary, not the sole cue.

**Hatch-on-hero contrast is not in the table** — see §6.

## 2. VoiceOver — labels good, orchestration missing

What the spine *does* specify (better than boilerplate): pins announce place name + visit count; clusters announce 「N 個回憶」+ region; photo tiles announce selection state; the save moment announces 已儲存; and 去過的地點 is named the canonical screen-reader browse path for the map's content — a sound equivalent-path pattern.

**Finding V1 (HIGH): no per-screen reading order or focus management anywhere.** Concrete unanswered questions a SwiftUI dev will face:
- **Re-live deep-link (UJ-2):** map flies, pin glows, sheet opens. Where does VoiceOver focus land — the map, the pin, or the sheet's place name? Nothing says. The intended experience (land on 清水寺 → context line → photo strip → note → cohort chip → ⋯) needs an explicit order and an initial-focus rule, or VO users get dumped on the tab bar.
- **Capture stack:** each forward step (search → fine-tune → date → photos → save) needs a screen-change announcement / focus target. Only the save toast's announcement is specified.
- **Map surface:** are pins/clusters individual accessible elements on the map, and in what traversal order (geographic? recency?)? Or is the map a single element with the browse tab as the only path? Either is defensible; neither is stated. The search pill, long-press hint, cluster set, and tab bar need an order on the home screen.
- **Headings:** serif titles (你記錄了 N 個地點, 哪一天去的呢？, sheet place names) should carry header traits for rotor navigation — unstated.
- Sheet dismissal (VO escape/z-gesture) and the grabber's accessibility are inherited-native — acceptable to leave implicit.

**Finding V2 (HIGH): the capture flow's two signature gestures have no specified non-gesture alternative.**
- **Fine-tune drag:** 按住拖曳微調 is the only way to adjust pin placement. WCAG 2.2 AA 2.5.7 (Dragging Movements) requires a single-pointer alternative; VoiceOver and Switch Control users cannot free-drag a map pin. Confirming *without* adjusting works, but the adjustment function itself is drag-only. Fix in spine: VO adjustable actions on the pin (swipe up/down nudges N/S/E/W or steps through nearby candidate addresses), or state that search-result placement is authoritative and fine-tune is a non-essential refinement — but say it.
- **Long-press capture:** the "one deliberate map write" — the spine never states the VO path. In practice the search pill covers capture entirely, so the fix is one sentence: "the search pill is the accessible capture path; long-press is a sighted-pointer shortcut" (plus a VO custom action on the map if long-press capture must be reachable).
- **Photo viewer pinch-zoom (FR22):** no VO zoom alternative stated (native zoom gesture support, or accept viewer-as-is with a note).
- **Photo tile labels:** selection state is specified but not the label content — what does VO read for a suggestion tile (capture date/time? "照片，5 月 17 日 下午 3:12，未選取")? Unstated.

Prototype spot-check (informational — it's a mock): search inputs do carry `aria-label` (good instinct); photo tiles are bare `div`s, the ⋯ is a `span`, the toggle is a `span` — none focusable or labeled. Fine for a prototype, but it means no frame demonstrates the VO semantics, so the spine text is the only spec — which is why V1/V2 matter.

## 3. Dynamic Type — zh-TW at large sizes

Specified: roles map to iOS text styles and scale (zh-TW included); CJK line-height floor ≥1.4 holds at large sizes; "layouts reflow without truncating controls."

**Finding D1 (MEDIUM): the reflow claim is blanket; no per-surface rules.** Concrete unanswered cases at accessibility sizes (AX1–AX5, where body 17pt → 53pt):
- **Date chips:** do they wrap to multiple lines (the prototype uses flex-wrap — right idea, but the spine is silent) or horizontally scroll?
- **Tab bar:** fixed 84px height with 11px labels — do labels scale, does the bar grow, or is the Large Content Viewer (long-press HUD) the answer? iOS convention is LCV; the spine should say so.
- **Cluster pins:** 15px count + 11px 「個回憶」 inside a 40px bubble — does the bubble grow (colliding on the map) or is map chrome exempt from Dynamic Type? Needs a ruling; "map pins cap at L size, counts available via VO label" is a fine answer if stated.
- **Rows:** recap rows ("清水寺 · 5 月 17 日 · 3 張照片") and browse sub-lines ("清水寺 · 金閣寺 · 嵐山竹林 +4") are single-line inline strings — wrap, truncate, or reflow to stacked lines?
- **Buttons/fields:** full-width pills with fixed 16px padding presumably grow vertically — say it, and confirm two stacked buttons + content still fit without the primary scrolling off-screen on the photo step.
- **Photo strip 118pt tiles, toggle 46×28, save-moment composition:** scale or fixed?
- **Max supported size:** does the app support the full AX range or cap at a named style? Unstated.

What *is* right: the ≥1.4 CJK line-height floor at large sizes is exactly the zh-TW-specific rule most specs miss, the 17pt input floor is locked, and "no truncating controls" sets the correct intent — it just needs the per-surface column.

## 4. Reduce Motion — the strongest section

- **Save animation (FR10):** "no settle/ripple, toast + state change only" — specified in both spines and implemented in the prototype (`prefers-reduced-motion` kills `.save-pin`/`.ripple`, prototype line 86).
- **Re-live:** glow pulse → static soft halo (~40% opacity); fly-to → gentle fade-in — specified and prototyped (line 92). Same content always lands.

**Finding R1 (LOW): other motion isn't covered.** Cluster-tap "dive into the region," browse-row "map dives to it" (UJ-3), and sheet/stack transitions are all animated zooms/moves with no Reduce Motion ruling. One sentence extends the rule: "all map camera moves degrade to cross-fade under Reduce Motion."

## 5. Touch targets — the floor's enumeration has holes

Specified and good: cluster pins visual 40px padded to ≥44pt (in both the token and the floor); fine-tune pin 44pt; photo selection is the whole ~112pt tile; tab bar 84px; primary/ghost buttons ≈56pt; quiet buttons ≈44pt; list rows ≥46pt.

**Finding T1 (HIGH): controls outside the enumeration fall below 44pt with no rule catching them.**
- **The re-live ⋯ overflow** — a spec'd control (mute lives there, FR17/state table) — is unspecified in both spines and renders ≈30×38px in the approved frame (`span`, 22px glyph, 4px/8px padding, prototype line 292). Needs an explicit ≥44×44pt hit target.
- **Chips** (date shortcuts, cohort link): 8px/14px padding + 14px text ≈ **36pt tall**. Not in the floor's list.
- **Toggle:** 46×28 — 28pt tall; no rule that the whole row is tappable.
- **Places-tab search field** in the approved frame is shrunk to 11px/14px padding + **15px text** (prototype line 365) — below the spine's own 17pt input floor and ≈43pt tall. Spine wins on conflict, but the conflict should be called out so the frame isn't copied.
The fix is one line in the floor: "every interactive element ≥44×44pt hit area, including the sheet ⋯ overflow, chips, and toggles — visual size may be smaller."

## 6. Visited state — never color-alone

**Answered, and well:** visited = terracotta-hero fill **+ always-on screen-space, zoom-stable hatch texture**, with a small-pin fallback for regions under ~10px — stated in `DESIGN.md` (Colors, Components, Do/Don't) and the `EXPERIENCE.md` floor. The non-color cue survives world zoom by design.

**Finding H1 (LOW): the hatch is carried by reference, not restated or verified.** The v2 spine defers wholly to the v1 spec; hatch line color/spacing don't appear in v2, and hatch-vs-hero-fill contrast is absent from the recomputed table (the cue only works if the hatch is perceivable on the fill — needs its own ≥3:1-ish check or an explicit v1 citation). The prototype's visited landmasses are plain hero fill at 55% opacity with **no hatch** — every approved composition demonstrates the anti-pattern the spine bans. Add the hatch pair to the contrast table and annotate the frames.

## 7. Keyboard / focus — the search field

**Finding K1 (MEDIUM): nothing is specified.** The only adjacent rules are "no frame jolts on input focus" and the 17pt floor — both visual. Unanswered: does the search screen auto-focus the field and raise the keyboard on entry (it should — it's the capture front door); return-key role (搜尋) and behavior; whether results update live; Full Keyboard Access (iOS hardware-keyboard a11y) tab order on search, capture steps, and sheets; visible focus indicators on the parchment palette (a focused field at 1.11:1 boundary contrast, per C2, has no visible focus state at all). Prototype note: the input sets `outline:none` (line 60), which strips the focus indicator — harmless in a mock, wrong if copied.

---

## Findings summary

| # | Severity | Finding |
|---|---|---|
| C1 | HIGH | Selected-chip terracotta/terracotta-soft = 4.09:1, below 4.5 AA — verified; in approved frames on date chips and the re-live cohort chip; resolution undecided |
| V2 | HIGH | Fine-tune pin is drag-only (WCAG 2.5.7) with no VO/Switch alternative; long-press capture and pinch-zoom alternatives unstated |
| V1 | HIGH | No per-screen VO reading order or focus management: deep-link landing focus, capture-step announcements, map pin/cluster traversal, heading traits all unspecified |
| T1 | HIGH | 44pt floor doesn't cover the ⋯ overflow (≈30×38px in approved frame), chips (≈36pt), toggle (28pt); places search field breaks the 17pt input floor in the frame |
| D1 | MEDIUM | Dynamic Type reflow is a blanket claim: chip wrap, tab-bar/LCV, cluster-bubble scaling, row reflow, max size all unruled for zh-TW AX sizes |
| K1 | MEDIUM | Search-field keyboard/focus unspecified (auto-focus, return key, Full Keyboard Access order, visible focus state) |
| C2 | MEDIUM | Component-boundary contrast (1.4.11) unexamined: fields and chips sit at 1.11:1 on card with no border or shadow |
| H1 | LOW | Hatch texture carried by v1 reference only; hatch-vs-fill contrast not in the table; prototype frames omit the hatch entirely |
| R1 | LOW | Reduce Motion covers save + re-live but not cluster-dive/browse-dive camera moves or sheet transitions |

## What's genuinely strong (keep)

- Contrast table is real, recomputed, and accurate — including honestly flagging its own failure and banning hero-for-text at 3.88.
- Reduce Motion fallbacks specified per animation and demonstrated in the prototype's media queries.
- Visited-state non-color cue (hatch + pin fallback) stated as a hard rule in three places.
- VO bullet names per-element semantics (pins, clusters, photo tiles, save toast) rather than "VoiceOver everywhere."
- 去過的地點 as the canonical screen-reader path to map content is the right equivalent-facilitation pattern, now a first-class tab.
- 17pt input floor + no-frame-jolt rule; cluster hit-target padding to 44pt is spec'd at the token level.
