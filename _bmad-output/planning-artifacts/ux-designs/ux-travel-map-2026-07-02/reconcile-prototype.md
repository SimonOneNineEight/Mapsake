# Reconciliation — approved prototype vs. the spines

Source of truth for what Simon approved: `.working/capture-flow-prototype.html` (14 frames, approved 2026-07-08).
Targets: `DESIGN.md` + `EXPERIENCE.md` (both updated 2026-07-08).
Method: full parse of the prototype markup — every screen, every zh-TW string, every CSS rule — diffed against both spines. Bar: a SwiftUI dev must be able to rebuild all 14 screens from the spines alone.

## Frame inventory vs. spine coverage

All 14 frames exist and all 14 surfaces appear in EXPERIENCE.md's IA table. No screen is missing outright.

| # | Frame (`id`) | zh name | Spine coverage |
|---|---|---|---|
| 1 | `home` | 地圖 | Covered (IA, Component Patterns, UJ-3) |
| 2 | `search` | 搜尋 | Covered |
| 3 | `finetune` | 確認位置 | Covered |
| 4 | `date` | 日期 | Covered |
| 5 | `photos` | 照片 | Covered (minor anatomy gaps, §B3) |
| 6 | `saved` | 儲存 | Covered in copy/flow; **animation geometry dropped** (§B1) |
| 7 | `recap` | 記錄 | Covered in copy; **recap card/row component missing** (§B2) |
| 8 | `places` | 去過的地點 | Covered; **field-size contradiction** (§A1), expand-in-place card treatment unspecced (§B5) |
| 9 | `settings` | 設定 | Covered |
| 10 | `notif` | 通知 | Covered as copy pattern; card anatomy treated as OS surface (acceptable, §C) |
| 11 | `relive` | 重溫 | Covered (glow halo geometry partially dropped, §B1) |
| 12 | `intro` | 開場 | Covered in flow; **promise copy + 18px tagline role dropped** (§B4, §B6) |
| 13 | `signin` | 登入 | Covered in copy; **button variants missing from DESIGN** (§B2) |
| 14 | `notifask` | 通知詢問 | Covered in copy; mini-preview card anatomy unspecced (§B2) |

---

## A. Contradictions — spine says one thing, approved frame shows another

### A1. The 17pt input floor vs. the 15px 去過的地點 search field — HIGH
DESIGN.md Typography: "**Inputs never render below 17pt** … made permanent as a floor." `{components.field}` = 17px input, padding 15/16.
Approved frame 8 (`#places`) overrides the field to a compact variant: `padding:11px 14px; font-size:15px`, icon 18px — the input text renders at **15px**. That's the spine's own hard rule violated by an approved frame. Neither spine acknowledges the compact variant exists.
**Resolve:** either bless a `field-compact` variant and carve the floor to "≥17pt unless a compact in-collection filter" (weak), or spec the places search field at the standard 17pt field (spine-wins default). Must be an explicit decision — a dev copying the frame ships 15px; a dev following the spine ships a visibly different screen than Simon approved.

### A2. Visited-region fill opacity — MEDIUM
Prototype: `.landmass.visited{background:var(--terra-hero);opacity:.55}` — the approved frames render visited land at **55% opacity terracotta-hero** (a noticeably lighter, milkier fill).
DESIGN.md: visited fill = `{colors.terracotta-hero}` `#B5663E` full-strength, and the contrast table certifies "terracotta-hero / map-sea 3.22:1 PASS" **on the full value**. At 55% alpha over the parchment sea, the effective fill fails that 3:1 non-text claim.
Likely the .55 is fake-map styling (the prototype has no hatch texture, which is the real non-color cue), but the spine must say which rendering is canonical — the contrast table's validity hangs on it.

### A3. Recap accent color — glow vs. terracotta-hero — MEDIUM
DESIGN.md colors front-matter: `glow: '#E8B48C' # re-live glow halo + recap accents`.
Approved frame 7: the recap-row bullet is `.dot{background:var(--terra-hero)}` = **#B5663E**, not glow. The prototype never uses #E8B48C anywhere except the re-live halo.
**Fix:** delete "recap accents" from the glow comment (glow = halo only, matching the prose in the Colors section) and spec the recap dot as terracotta-hero (see B2) — or consciously restyle the dot to glow, which changes an approved frame.

### A4. Field background on parchment screens — LOW (confirm intent)
DESIGN.md `{components.field}` comment: "on parchment screens the field sits on `{colors.card}`."
Both approved search fields (frames 2 and 8) are **parchment-on-parchment** (`.field` background `--parchment` on the parchment canvas — a nearly invisible container). The spine's card-on-parchment rule is probably a deliberate correction (it's the only rendering that reads as a field), but it silently diverges from what Simon approved. One line in DESIGN noting "prototype rendered these parchment-on-parchment; spine corrects to card-on-parchment" closes it.

### A5. "Never stark white anywhere" vs. #fff functional whites — LOW
DESIGN Brand/Colors: "Never stark white anywhere." Approved frames use pure `#fff` for: the toggle knob, the photo-tile check border + checkmark. DESIGN's own toggle spec says "white knob," so the doc contradicts itself. Add a one-line carve-out: pure white is permitted for sub-24px functional glyphs/knobs; surfaces never.

---

## B. Dropped specs — approved in the prototype, absent from the spines

### B1. Save-moment + re-live animation geometry — HIGH (FR10 is the ritual centerpiece)
EXPERIENCE keeps durations/curves only. The keyframe geometry that makes the animation *feel* right exists only in the HTML:

**Settle** (`@keyframes settle`, `.7s cubic-bezier(.2,.8,.3,1.1)` both):
- 0%: `translateY(-90px) scale(1.15)`, opacity 0 (pin drops from ~90pt above at 115% size, fading in)
- 55%: `translateY(6px) scale(1)`, opacity 1 (lands with a 6pt overshoot)
- 75%: `translateY(-4px)` (4pt rebound)
- 100%: rest. Pin: 64pt hero teardrop.

**Ripple** (`@keyframes ripple`, `.9s ease-out, .45s delay` — fires as the pin lands):
- Ring: **70×70pt circle, 2.5px solid `{colors.terracotta-hero}` border**, centered on the pin
- 0%: `scale(.3)` opacity .6 → 100%: `scale(2.4)` opacity 0.

**Reduce Motion** (prototype: `animation:none` + ripple `display:none`): covered in EXPERIENCE ✓.

**Glow halo** (re-live): EXPERIENCE has loop timing/scale/opacity ✓ but drops the halo's build: **64×64pt radial gradient, `{colors.glow}` at center → transparent at 70%**, centered on the pin head (prototype offsets it to the teardrop's visual center, `top:58%` of the pin box). Reduce-Motion static ~40% ✓.

**Fold into:** EXPERIENCE Save-moment + Re-live rows (or a small "Motion" spec block); ripple ring anatomy also belongs in DESIGN components.

### B2. Components in approved frames with no DESIGN spec
- **Recap card + recap row** (frame 7): card-toned container, `{rounded.DEFAULT}`, floating shadow, 22px padding, 14px vertical / 20px side margins; rows = **10px terracotta-hero dot bullet** + 12px gap + hairline dividers; row text = place (16px ink) + `· date · N 張照片` sub inline (13px ink-soft). DESIGN's grouped-card is close but not this (no section label, dot bullets, inline sub).
- **Sign-in button variants** (frame 13): Apple = full pill in near-black **`#1a1613`** — a color that exists in no token (it's the prototype's phone-bezel value; presumably ASAuthorizationAppleIDButton black in practice, but say so). Google = **card-background pill with the floating shadow** and ink text — a fourth button variant (card-elevated) absent from button-primary/ghost/quiet. Email = ghost ✓.
- **Notification mini-preview card** (frame 14, an in-app surface, unlike frame 10): 330pt wide, **18px radius**, card bg, floating shadow, padding 12/13; 34px icon container (8px radius, parchment, 21px pin mark), app name 14/700, body line 13px ink-soft, 44px photo thumb (9px radius). DESIGN only gestures at "notification-style preview cards sit in the 18–20px family."
- **Search-result row leading glyph** (frame 2): terracotta location glyph (📍 placeholder) before name+sub. List-row spec has no leading-icon slot.

### B3. Small anatomy details dropped from existing DESIGN specs
- Photo-tile check: **unselected state = rgba(0,0,0,.15) scrim** inside the 2px white ring; position inset 6px from top-right; checkmark glyph 13px/700 white. DESIGN has only the selected state.
- Cluster pin: horizontal padding `0 10px` (how counts >2 digits breathe).
- Tab bar: 3px icon-to-label gap; icons are (1) folded-map, (2) teardrop-pin, (3) person-silhouette line glyphs — glyph identities named nowhere (matters for SF Symbols selection: `map` / `mappin.and.ellipse` / `person` family).
- Re-live sheet uses 26px bottom padding (vs. component default 34px) — content-dense sheet variant.
- Inactive page dots = `{colors.grabber}`, 8px, 6px gap (DESIGN's grabber comment covers the color ✓; size/gap only in the frame).

### B4. Approved copy strings in frames but in neither spine
Per EXPERIENCE's own rule, "copy shown … in the approved frames is approved-in-context" — so these are blessed strings the spines lost:
- **Intro two-line promise** (frame 12): 「把去過的地點記錄在你的地圖上。」／「某個傍晚，回憶會自己回來找你。」 — UJ-4 says only "a two-line promise." This is positioning-register copy on the one poetry-allowed surface; it should be quoted, not paraphrased.
- **Fine-tune drag hint** 「按住拖曳微調」 ✓ (in EXPERIENCE) — listed for completeness; confirmed present.
- Sample-data strings (清水老街／台中市清水區, 淺草寺 · 澀谷 +1, 傍晚的清水舞台…, 1 年前的今天：九份老街, address 日本 京都府 京都市東山區清水1丁目294) are correctly treated as samples — no action.

### B5. 去過的地點 expand-in-place treatment — MEDIUM-LOW
EXPERIENCE says "country rows … expand in place," but the approved visual grammar is specific: the **expanded** country lifts into a shadowed `{colors.card}` grouped container (its header row keeps a slightly stronger divider, chevron rotates to ⌄); its region rows indent 14px with › chevrons; **collapsed** countries (台灣, 法國) sit as flat hairline rows directly on parchment, chevron ›. Continent labels are 13px section labels. Without this, a dev plausibly builds all-flat or all-carded lists.

### B6. Type-ramp gaps — LOW
- **Intro tagline**: 「你的私人旅行時光膠囊」 renders serif **18px** terracotta — no 18px serif role exists in the ramp (jumps 20 → 16).
- **Screen subtitle**: the 14px/400 ink-soft sub-line under screen titles (frames 3, 4, 5, 7 subs) maps to no role — DESIGN has only 14/500 context-line (terracotta) and 13 sub. Add a `subtitle` role (14/400, ink-soft) or fold into the ramp note.
- Intro promise sets line-height 1.8 (note role says 1.7) — trivial; round to note.

---

## C. Confirmed coverage (spot-checked, matches — no action)

Tokens: all 8 core colors + shadows + radii match the prototype `:root` exactly (ink-soft #6B5B49 supersession noted ✓). Buttons (primary/ghost/quiet paddings, 1.5px ghost border), chip incl. selected state, sheet (22px corners, grabber 44×5/3px, up-shadow, 10/20/34 padding), field (standard), list-row, search pill (14px top, 16px insets, 22px glyph), cluster (40px min, 15/700 + 11/500, 2.5px cream ring), pin sizes ladder (34/44/64/72 with correct standard-vs-hero fills per frame), photo grid (3-col, 6px, 10px radius) + ＋其他照片 dashed add-tile, photo strip 118/12px, toggle 46×28/23px knob, toast, tab bar (84px, hairline, 26px/1.8 icons, 11px labels), avatar 52px serif initial. All arbitrated vocabulary strings verified present in the frames and in EXPERIENCE (選擇地點, 哪一天去的呢？, 上傳（3 張照片）, 不加照片，直接記錄, 已儲存, 記錄下個地點, 完成這次記錄, 你記錄了 4 個地點, 這天還有 N 個回憶 →, 開啟通知，重溫你的旅行, 先不用, both sign-in reassurance lines, 每天傍晚 7:00, 靜音的地點, 預設畫面／整個世界, 匯出我的回憶, 刪除帳號, 登出). Recap rows correctly drop 第 N 次 in both prototype and spine ✓. Reduce-Motion guards specified in both ✓. Frame 10's lock-screen card (354pt, 92%-opacity blur, grey-black shadow) is an OS-rendered surface — spines rightly spec only the copy pattern + thumb radius; the grey-black shadow there does not violate the in-app shadow rule.

## D. Prototype-side defects — do NOT copy forward

- **「清水geo斷崖」** (frame 2, third search result) is a typo — should be 清水斷崖 (Hualien's Qingshui Cliff). Sample data, but flag it so it never lands in a fixture or screenshot as "approved copy."
- The fake-map colors (`#E2CFA9` land, `#C9B896` land border, gradient sea `#EFE4CF→#E4D6BA`) are prototype scenery, **not tokens** — DESIGN's map-layer tokens (sea #EADFC8, land = card, border #96835E) win. Worth one explicit line in DESIGN so nobody samples the HTML.
- Frame 5 shows 9 suggestion tiles for a "找到 12 張" sub — the grid scrolls; harmless.

## E. Adjacent spine debts surfaced during reconciliation

- **Dangling source paths:** both spines cite `mockups/capture-flow-prototype.html` and EXPERIENCE cites `mockups/voice-guide.md` — no `mockups/` directory exists; both files live in `.working/`. The decision log's "promote keepers to mockups/" step never ran. Until it does, the spines' composition-reference pointers are broken.
- **Approximate-pin decision never folded in:** the 2026-07-08 open-items triage resolved backfill granularity ("記錄這個地區" → hollow/dashed APPROXIMATE pin variant) and explicitly says "→ EXPERIENCE.md Component Patterns + DESIGN.md pin-marker variant (to be folded in post-distillation)." Neither spine contains it. Not prototype-sourced, but it's the same class of loss.

## Recommended edit list (ordered)

1. EXPERIENCE Save-moment/Re-live rows (or new Motion block): add settle keyframes, ripple ring anatomy, glow halo build (§B1). DESIGN: add ripple ring to components.
2. Resolve A1 (input floor vs. 15px places field) as an explicit decision; record in both spines.
3. Resolve A2 (visited fill opacity) — state canonical rendering; re-verify the 3.22:1 row if alpha wins.
4. DESIGN: fix the glow token comment (A3); add recap-card/row, sign-in Apple/Google variants, notif mini-preview card, result-row leading glyph (§B2); photo-check unselected state + tab glyph names (§B3).
5. EXPERIENCE UJ-4 / DESIGN Brand: quote the intro promise strings (§B4); EXPERIENCE Geographic browse: spec the expand-in-place card lift (§B5).
6. DESIGN typography: add 18px serif tagline + 14/400 subtitle roles (§B6); add the white-glyph carve-out (A5) and the field-on-parchment note (A4).
7. Promote `.working/capture-flow-prototype.html` + `voice-guide.md` to `mockups/` (fixes E1); fold in the approximate-pin variant (E2).
8. Fix 清水geo斷崖 → 清水斷崖 in the prototype; add the "fake-map colors are not tokens" line (D).
