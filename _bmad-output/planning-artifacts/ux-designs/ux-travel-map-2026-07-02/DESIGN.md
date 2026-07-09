---
title: "DESIGN.md — Mapsake v2 (native iOS)"
name: Mapsake
status: final
created: 2026-07-02
updated: 2026-07-09
description: A private travel time capsule, native on iOS. The v1 sepia-parchment keepsake identity carried onto SwiftUI — warm paper canvas, terracotta "you were here", pill actions, soft floating cards.
sources:
  - ../../prds/prd-travel-map-2026-07-02/prd.md
  - ../ux-travel-map-2026-06-16/DESIGN.md
  - mockups/capture-flow-prototype.html
colors:
  # Core palette — carried from v1 BY DECISION (2026-07-08 brain dump: "the color palette and typography stay")
  parchment: '#F2E8D5'        # app canvas — the milky parchment base
  card: '#FBF4E4'             # surfaces: cards, sheets, tab bar, fields-on-parchment invert
  ink: '#3A2E22'              # primary text; toast background
  ink-soft: '#6B5B49'         # secondary text, sub-lines, inactive tabs (v2 prototype value; supersedes v1 text-muted #6F5C40)
  terracotta: '#9E4F2B'       # THE action color: primary buttons, active tab, links, standard pin, cluster bubble, search icon
  terracotta-hero: '#B5663E'  # visited MAP FILL (unchanged v1 hero) + emotional pin moments (save pin, re-live pin, brand mark)
  terracotta-soft: '#E8D5C4'  # selected-chip background, avatar background — the only tint surface
  destructive: '#A33B2E'      # destructive text (刪除帳號) only
  glow: '#E8B48C'             # re-live glow halo + recap accents — NON-TEXT ONLY (approved prototype; lightens v1 accent #C8893B)
  # Map layer — carried from v1 (FR1: v1 tile pipeline + parchment identity)
  map-sea: '#EADFC8'          # ocean/background
  map-land-unvisited: '#FBF4E4' # = card; bare paper land
  region-border: '#96835E'    # sole delineator between unvisited regions (3.03:1 on parchment)
  hairline: '#3A2E2212'       # ink at ~7% — list-row dividers; tab-bar top border at ~8% (#3A2E2214)
  grabber: '#3A2E222E'        # ink at ~18% — sheet grabber, inactive page dots
typography:
  # Family decision (approved prototype + Claude Design foundations card): Noto Serif TC + Noto Sans TC.
  # Serif = emotional/display moments only; Sans = everything working. Sizes are reference pt at
  # default Dynamic Type; map to nearest iOS text style and let Dynamic Type scale (NFR8).
  display:
    fontFamily: "'Noto Serif TC', serif"
    fontSize: 34px
    fontWeight: '500'
    lineHeight: '1.2'
  title:
    fontFamily: "'Noto Serif TC', serif"
    fontSize: 26px
    fontWeight: '500'
    lineHeight: '1.3'
  title-sm:
    fontFamily: "'Noto Serif TC', serif"
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  question:
    fontFamily: "'Noto Serif TC', serif"
    fontSize: 22px
    fontWeight: '500'
    lineHeight: '1.4'
  heading:
    fontFamily: "'Noto Serif TC', serif"
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  note:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 15px
    fontWeight: '400'
    lineHeight: '1.7'
  button:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 17px
    fontWeight: '500'
    lineHeight: '1.4'
  input:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 17px
    fontWeight: '400'
    lineHeight: '1.4'
  context-line:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
  sub:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  section-label:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
  caption:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
  tab-label:
    fontFamily: "'Noto Sans TC', sans-serif"
    fontSize: 11px
    fontWeight: '400'
    lineHeight: '1.3'
rounded:
  sm: 10px          # photo-grid tiles
  md: 12px          # photo-strip tiles, notification photo thumbs
  DEFAULT: 14px     # cards, fields, grouped-list containers, date-wheel card
  lg: 22px          # sheet top corners; 18–20px family for notification-style preview cards
  full: 9999px      # buttons, chips, search pill, cluster bubbles, toast, toggle
spacing:
  unit: 8px
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  screen-margin: 20px   # v2 side margin (prototype; v1 mobile was 16px)
  grid-gap: 6px         # photo grid + photo strip gap
components:
  button-primary:
    background: '{colors.terracotta}'
    color: '{colors.card}'
    radius: '{rounded.full}'
    padding: 16px
    font: '{typography.button}'
    width: full
  button-ghost:
    background: transparent
    color: '{colors.terracotta}'
    border: 1.5px solid {colors.terracotta}
    radius: '{rounded.full}'
    padding: 16px
    font: '{typography.button}'
  button-quiet:
    background: none
    color: '{colors.ink-soft}'
    padding: 10px
    font: '{typography.button}'
  chip:
    background: '{colors.parchment}'
    color: '{colors.ink}'
    radius: '{rounded.full}'
    padding: 8px 14px
    fontSize: 14px
    selected:
      background: '{colors.terracotta-soft}'
      color: '{colors.ink}'      # AA fix (2026-07-09): terracotta on the tint was 4.09:1; ink = 8.42:1
      fontWeight: '500'
  sheet:
    background: '{colors.card}'
    radius: '{rounded.lg} {rounded.lg} 0 0'
    shadow: 0 -6px 24px rgba(58,46,34,.22)
    padding: 10px 20px 34px
    grabber: 44px x 5px, radius 3px, {colors.grabber}
  field:
    background: '{colors.parchment}'   # on-card invert; on parchment screens the field sits on {colors.card}
    radius: '{rounded.DEFAULT}'
    padding: 15px 16px
    font: '{typography.input}'
  list-row:
    padding: 14px 4px
    divider: 1px solid {colors.hairline}
    title: '{typography.body}'
    sub: '{typography.sub}' in {colors.ink-soft}
  grouped-card:
    background: '{colors.card}'
    radius: '{rounded.DEFAULT}'
    shadow: 0 4px 16px rgba(58,46,34,.18)
    label-above: '{typography.section-label}' in {colors.ink-soft}
  search-pill:
    background: '{colors.card}'
    radius: '{rounded.full}'
    shadow: 0 4px 16px rgba(58,46,34,.18)
    padding: 14px 18px
    icon: '{colors.terracotta}' at 22px
    placeholder: '{colors.ink-soft}' at 16px
  cluster-pin:
    background: '{colors.terracotta}'
    color: '{colors.card}'
    size: min-width 40px, height 40px (hit target padded to >= 44pt)
    radius: '{rounded.full}'
    border: 2.5px solid {colors.card}
    shadow: 0 4px 16px rgba(58,46,34,.18)
    count: 15px / 700
    unit-label: 11px / 500   # 「個回憶」
  pin-marker:
    shape: teardrop with {colors.card} inner dot
    fill: '{colors.terracotta}'          # standard read-map + fine-tune pin
    fill-hero: '{colors.terracotta-hero}' # save moment, re-live, brand mark
    fill-approximate: '{colors.parchment}' with 1.5px DASHED {colors.terracotta} stroke, no inner dot  # region-backfill pins ("記錄這個地區") — honest imprecision; solidifies when dragged to a real spot
    shadow: drop-shadow(0 2px 4px rgba(58,46,34,.35))
    sizes: 34px map / 44px fine-tune + re-live / 64px save moment / 72px brand
  motion-save:   # FR10 — the ritual carrier (geometry from the approved prototype)
    settle: 'from translateY(-90px) scale(1.15) opacity 0 → 55% translateY(+6px) scale(1) opacity 1 → 75% translateY(-4px) → 100% rest; .7s cubic-bezier(.2,.8,.3,1.1)'
    ripple: '70pt ring, 2.5px {colors.terracotta-hero} border, scale .3→2.4, opacity .6→0; .9s ease-out, .45s delay'
    haptic: light impact at settle
    reduce-motion: none — toast + state change only
  motion-glow:   # re-live landing halo
    halo: '64pt radial {colors.glow} → transparent 70%'
    pulse: 'scale .9→1.35, opacity .5→.15; 2.2s ease-in-out loop'
    reduce-motion: static halo at ~40% opacity
  recap-card:
    container: '{components.grouped-card}'
    row: '10px {colors.terracotta-hero} dot bullet + {typography.body} title + {typography.sub} meta ( · date · N 張照片)'
  signin-buttons:   # first-run only — the one surface with non-token fills (platform conventions win)
    apple: 'full-width pill, #1A1613 fill, {colors.card} label, Apple mark leading'
    google: 'full-width pill, {colors.card} fill + floating shadow 0 4px 16px rgba(58,46,34,.18), {colors.ink} label, G mark leading'
    email: '{components.button-ghost}'
  notif-preview-card:   # the notifask mini-preview + lock-screen mock anatomy
    width: ~330pt in-app preview / 354pt lock-screen
    radius: 18px (lock-screen 20px)
    anatomy: 'app-icon tile 34-38px ({colors.parchment}, pin mark) + title/body stack + trailing photo thumb 44-66px {rounded.md}'
  browse-expand-card:   # 去過的地點 expand-in-place grammar
    collapsed: flat {components.list-row} rows on parchment
    expanded: 'the country lifts into a {components.grouped-card} containing its region rows (indented 14px)'
  photo-tile:
    aspect: '1:1'
    radius: '{rounded.sm}'
    check: 22px circle top-right, 2px white border; selected = {colors.terracotta} fill + white check
    add-tile: '{colors.parchment}' bg, 1.5px dashed {colors.terracotta}, plus 26px + label 12px in {colors.terracotta}
  photo-strip-tile:
    size: 118px x 118px
    radius: '{rounded.md}'
  toggle:
    size: 46px x 28px
    radius: '{rounded.full}'
    on-track: '{colors.terracotta}'
    knob: 23px white circle
  toast:
    background: '{colors.ink}'
    color: '{colors.card}'
    radius: '{rounded.full}'
    padding: 10px 20px
    fontSize: 15px
  tab-bar:
    background: '{colors.card}'
    height: 84px            # includes home-indicator inset (8px top pad + 26px bottom)
    border-top: 1px solid #3A2E2214
    icon: 26px, stroke 1.8
    label: '{typography.tab-label}'
    active: '{colors.terracotta}'
    inactive: '{colors.ink-soft}'
  avatar:
    size: 52px circle
    background: '{colors.terracotta-soft}'
    initial: '{colors.terracotta}', Noto Serif TC 22px
---

# Mapsake v2 — Design Spine

> The visual identity of the native iOS app. How it works lives in `EXPERIENCE.md`. Product scope is inherited from the PRD (`prd-travel-map-2026-07-02`). **This is v1's identity inherited + iOS-native adaptation deltas — no re-imagining** (decision, 2026-07-08). When any mock conflicts with this spine, the spine wins. Composition reference: `mockups/capture-flow-prototype.html` (14 frames, Simon-approved 2026-07-08) and the "Mapsake v2" Claude Design project cards.

## Brand & Style

Mapsake is a **private travel time capsule** (私人旅行時光膠囊) — a keepsake, not a social map, a check-in game, or a dashboard. The visual register carries over from v1 unchanged in soul: a warm, muted, milky-canvas atlas; bare parchment world; the places you've been, hand-tinted in terracotta. Quiet, personal, literary. "The visual language evolves, the soul doesn't."

What changes in v2 is the body, not the face: native SwiftUI on iPhone, full-bleed map, floating pill actions and soft cards over the map, iOS-grouped settings. The v1 palette and typography roles stay; the shapes soften further toward native iOS (pill buttons, larger card radii, a real bottom-sheet grammar).

**The poetry-in-positioning-only rule (Simon's master calibration, 2026-07-08):** the 時光膠囊 / 封存 poetic register belongs to *positioning surfaces only* — the App Store page and the one first-run brand moment (「你的私人旅行時光膠囊」 on the intro screen). Every working UI surface speaks plain, light, factual-warm Taiwan Mandarin. **The save animation carries the ritual emotion; the chrome and the copy stay plain.** The interface never celebrates itself.

Anti-pattern posture (PRD + decision log): no feeds, no streaks, no completion percentages, no scarcity mechanics, no celebratory chrome — and **no unexpected scale/viewport jumps, ever** (the v1 PWA login-zoom gripe, elevated to principle: no focus or transition moment may jolt the frame).

The prototype ships **light-only**; v1's "Lamplight" dark tokens remain in the v1 spine, but no v2 dark decision has been recorded.

## Colors

The palette is **Sepia Parchment**, carried from v1 by decision. Two anchors hold everything: the milky canvas and the terracotta "you were here."

- **Parchment (`{colors.parchment}` `#F2E8D5`)** — the app canvas, chips at rest, field fills on cards. Never stark white on any *surface or text* (functional component internals — the toggle knob, the photo-tile check ring — are the sanctioned pure-white exceptions).
- **Card (`{colors.card}` `#FBF4E4`)** — floating surfaces: sheets, cards, tab bar, search pill, unvisited map land. A half-shade lighter so surfaces lift by tone.
- **Ink (`{colors.ink}` `#3A2E22`)** — primary text; also the toast's background (the one dark surface).
- **Ink-soft (`{colors.ink-soft}` `#6B5B49`)** — secondary text: sub-lines, dates, hints, inactive tabs, quiet buttons. *v2 prototype value; supersedes v1's `#6F5C40` text-muted.*
- **Terracotta (`{colors.terracotta}` `#9E4F2B`)** — the single action color: primary buttons, ghost-button borders, active tab, selected-chip text, standard pins, cluster bubbles, the search glyph. Text-safe on both paper tones.
- **Terracotta-hero (`{colors.terracotta-hero}` `#B5663E`)** — the signature **map fill** for visited regions (unchanged from v1), and the fill of *emotional* pin moments: the save-moment pin, the re-live pin, the brand mark, the notification icon. Map fills and hero moments only — never text (3.88:1), never decoration.
- **Terracotta-soft (`{colors.terracotta-soft}` `#E8D5C4`)** — the only tint: selected-chip background, avatar background.
- **Destructive (`{colors.destructive}` `#A33B2E`)** — destructive row text (刪除帳號). Errors themselves are calm prose, never red fills.
- **Glow (`{colors.glow}` `#E8B48C`)** — the re-live pulse halo around the landed pin. Non-text only. Lightens v1's `#C8893B` accent per the approved prototype; active states in v2 use `{colors.terracotta}` instead.
- **Map layer** (carried from v1 / FR1): sea `{colors.map-sea}` `#EADFC8`; unvisited land = `{colors.card}`; `{colors.region-border}` `#96835E` remains the sole delineator between unvisited regions; visited fill = `{colors.terracotta-hero}` **plus the always-on hatch texture cue** (visited is never color alone — NFR8; v1's screen-space zoom-stable hatch and small-region pin fallback carry over).

**Contrast (AA), recomputed for v2 tokens** — floors: text ≥ 4.5:1, large/non-text ≥ 3:1:

| Pair | Use | Ratio | Result |
|---|---|---|---|
| ink / parchment | body text | 10.84:1 | PASS |
| ink / card | text on cards/sheets | 12.02:1 | PASS |
| ink-soft / parchment | secondary text | 5.37:1 | PASS |
| ink-soft / card | sub-lines on cards | 5.96:1 | PASS |
| card / terracotta | primary-button label | 5.31:1 | PASS |
| terracotta / parchment | links, active text | 4.79:1 | PASS |
| terracotta / card | active tab, chip text on card | 5.31:1 | PASS |
| card / ink | toast label | 12.02:1 | PASS |
| destructive / card | destructive row text | 5.95:1 | PASS |
| region-border / parchment | unvisited separator (non-text) | 3.03:1 | PASS |
| terracotta-hero / map-sea | visited fill (non-text) | 3.22:1 | PASS |
| ink / terracotta-soft | selected-chip text (14px/500) | 8.42:1 | PASS |

**Resolved (2026-07-09):** the prototype's original selected-chip pair (terracotta text on the tint) measured 4.09:1 and failed the AA floor — the fix keeps the terracotta-soft fill and switches the text to `{colors.ink}` (spine + prototype both updated). Terracotta text on the tint is now banned for text-size runs.

Note on the visited map fill: the approved frames render visited land at **55% opacity** `{colors.terracotta-hero}` over the land tone (the full-strength swatch is the token; the fill is decorative). Contrast for the visited state is NOT carried by the fill — the **always-on hatch texture** is the non-color cue (NFR8), and the 3.22:1 row above certifies the full-strength swatch for boundary legibility at low zoom.

## Typography

**Noto Serif TC + Noto Sans TC** (per the approved prototype and the synced Foundations type-scale card). The serif is reserved for *emotional and display moments*: the wordmark/brand moment, screen headlines, recap and re-live titles, capture-step questions, the saved place-name line. The sans does all working UI: body, rows, buttons, labels, notes.

Rules carried from v1:

- **CJK serif weight: 500, never bold.** Ming/明體 turns stern at 700; hierarchy comes from size and the serif itself. Sans 700 is reserved for rare loud numerals (cluster counts, the notification app name).
- **CJK line-height floor ~1.4** for any wrapping Chinese text; single-line titles never below ~1.3. Memory notes breathe at 1.7 (`{typography.note}`).
- **No letterspacing and no uppercasing on Han glyphs, ever.**
- **Inputs never render below 17pt** (`{typography.input}`) — the v1 login-zoom gripe made permanent as a floor, even though native SwiftUI removes the auto-zoom mechanism.

On iOS these are reference sizes at default Dynamic Type: map each role to the nearest text style and let Dynamic Type scale (zh-TW included, NFR8). v1's Latin-first stacks (Newsreader / Nunito Sans) do **not** appear in the approved v2 frames; whether a Latin display face returns for the wordmark is an open item.

Indicative ramp (from the approved frames): brand display 34 · screen title 26 · sheet/recap title 24 · capture question 22 · sheet heading 20 · **intro tagline 18 serif terracotta** · button/input 17 · body 16 · note 15 · re-live context line + **screen subtitle** 14 (500 terracotta / 400 ink-soft respectively) · sub/meta + section label 13 · caption/hint 12 · tab label 11.

## Layout & Spacing

8px base unit, carried from v1: 4 / 8 / 12 / 16 / 24 / 32. **Screen side margins are 20px** in v2 (`{spacing.screen-margin}`; up from v1 mobile's 16px, per the approved frames). Photo grids and strips pack tight at `{spacing.grid-gap}` 6px — imagery is dense, chrome is airy.

The map is **full-bleed** on iPhone (every pixel of map counts; v1's desktop mat does not apply). Content floats over it: the search pill pinned 14px below the status bar with 16px side insets, cluster pins, and the bottom sheet. List screens (去過的地點, 設定) are parchment pages with grouped `{colors.card}` containers under 13px section labels — the iOS-grouped-list grammar in Mapsake's materials. One modal layer at a time; the capture flow is a single forward-moving stack.

Buttons are full-width within the 20px margins, stacked with 8px gaps, primary above secondary. The tab bar (`{components.tab-bar}`) is a persistent 84px card-toned bar (home-indicator inset included) with three tabs.

## Elevation & Depth

Depth stays **warm and tonal** — v1's rule, with one v2 refinement: floating elements over the map earn a real shadow, always **ink-tinted, never grey-black**.

- **Floating card / pill shadow:** `0 4px 16px rgba(58,46,34,.18)` — search pill, grouped cards, cluster pins, recap card, notification preview card.
- **Sheet shadow:** `0 -6px 24px rgba(58,46,34,.22)` — the bottom sheet drawn over the map.
- **Pin shadow:** `drop-shadow(0 2px 4px rgba(58,46,34,.35))`.
- **Hairlines:** `{colors.hairline}` (ink at ~7–8%) for row dividers and the tab-bar top edge — a ghost line, never a hard rule.

Nothing else casts shadow. On-page hierarchy still comes from tone (card on parchment) and type.

## Shapes

Softer than v1, per the approved frames — paper with rounded corners, now with **pill actions**:

- `{rounded.full}` — all buttons, chips, the search pill, cluster bubbles, toast, toggle. (v2 delta: v1's 8px buttons become full pills.)
- `{rounded.DEFAULT}` (14px) — cards, fields, grouped-list containers, the date-wheel card. (v1's 12px card radius grows to 14px.)
- `{rounded.lg}` (22px) — the bottom sheet's top corners (v1: 18px); notification-style preview cards sit in the 18–20px family.
- `{rounded.md}` (12px) — photo-strip tiles and notification photo thumbs; `{rounded.sm}` (10px) — photo-grid tiles.
- The grabber is a 44×5px bar at 3px radius; avatars are true circles.

Imagery follows its container's radius. Never sharp corners; never a hard rectangle over the map.

## Components

- **Primary button** (`{components.button-primary}`) — full-width terracotta pill, cream 17px/500 label, 16px vertical padding. One per screen; it names a concrete action (選擇地點 / 上傳（3 張照片） / 記錄下個地點).
- **Ghost button** (`{components.button-ghost}`) — transparent pill, 1.5px terracotta border and text. The co-equal alternative (完成這次記錄, 使用 Email 登入).
- **Quiet button** (`{components.button-quiet}`) — bare ink-soft text button. The single skip/dismiss per screen (略過 / 取消 / 先不用 / 登出).
- **Chip** (`{components.chip}`) — parchment pill, 14px ink text; selected = terracotta-soft fill with **ink** 500 text (AA-resolved above). Hit area padded to ≥ 44pt (visual height unchanged). Used for date shortcuts and the re-live cohort link.
- **Sheet** (`{components.sheet}`) — card-toned, 22px top corners, grabber, up-shadow; holds a serif heading, ink-soft sub, then actions or content. The map stays visible above it.
- **Field** (`{components.field}`) — parchment-on-card (or card-on-parchment) rounded input, 17pt text, leading terracotta glyph where it aids meaning (the ⌕).
- **Search pill** (`{components.search-pill}`) — the floating capture front-door on the map: card pill, shadow, terracotta ⌕ at 22px, ink-soft placeholder.
- **List row** (`{components.list-row}`) — 16px title + optional 13px ink-soft sub-line, hairline divider, trailing chevron/affordance. Rows render complete with a title alone; no empty slots.
- **Grouped card** (`{components.grouped-card}`) — the settings/browse container: 13px ink-soft section label above a shadowed card of rows.
- **Cluster pin** (`{components.cluster-pin}`) — terracotta pill with cream count 15/700 + 「個回憶」 11/500, 2.5px cream border, shadow. Visual min 40px; hit target ≥ 44pt.
- **Pin marker** (`{components.pin-marker}`) — the terracotta teardrop with cream inner dot and soft drop shadow. Standard fill `{colors.terracotta}` at 34px on the read map, 44px as the draggable fine-tune pin; **hero fill `{colors.terracotta-hero}`** at 44px re-live / 64px save moment / 72px brand mark. The re-live pin carries the `{colors.glow}` pulse halo. **Approximate variant** (`fill-approximate`): parchment fill with a 1.5px dashed terracotta stroke and no inner dot — region-backfill pins placed at a region's center (「記錄這個地區」), honest about imprecision; the marker solidifies to standard fill when the user drags it to a real spot.
- **Motion** (`{components.motion-save}`, `{components.motion-glow}`) — the save settle+ripple and the re-live glow pulse, with full keyframe geometry and Reduce-Motion fallbacks in the frontmatter. The save animation is the ritual carrier; nothing else in the app animates for celebration.
- **Recap card** (`{components.recap-card}`) — the session-payoff grouped card: terracotta-hero dot-bullet rows of place · date · photo count.
- **Sign-in buttons** (`{components.signin-buttons}`) — first-run only: Apple (near-black `#1A1613` pill — the one non-token fill, platform convention), Google (card-toned pill with floating shadow), Email as ghost. Order fixed: Apple, Google, Email.
- **Notification preview card** (`{components.notif-preview-card}`) — the shared anatomy of the lock-screen mock and the notifask in-app mini-preview: icon tile + text stack + trailing photo thumb.
- **Browse expand card** (`{components.browse-expand-card}`) — 去過的地點's expand-in-place grammar: collapsed countries are flat rows; the expanded country lifts into a grouped card holding its region rows.
- **Photo tile** (`{components.photo-tile}`) — square, 10px radius, 3-column 6px-gap grid; 22px selection check top-right (terracotta when selected). The **＋其他照片 add-tile** is a dashed-terracotta parchment tile in the same grid — a control, not a caption.
- **Photo strip tile** (`{components.photo-strip-tile}`) — 118pt square, 12px radius, horizontal swipe strip in the re-live sheet.
- **Toggle** (`{components.toggle}`) — 46×28 pill, terracotta on-track, white knob (matches iOS switch proportions in Mapsake's hue).
- **Toast** (`{components.toast}`) — ink pill with cream 15px text (已儲存). The one inverted surface; no icons.
- **Tab bar** (`{components.tab-bar}`) — card-toned, hairline top edge, three tabs (地圖 / 去過的地點 / 設定), 26px 1.8-stroke line icons, 11px labels; active = terracotta, inactive = ink-soft.
- **Avatar** (`{components.avatar}`) — 52px terracotta-soft circle with a serif terracotta initial.
- **Visited region** — `{colors.terracotta-hero}` fill **+ the always-on hatch texture** (screen-space, zoom-stable) with the small-pin fallback for sub-~10px regions — the v1 spec carries over whole; the non-color cue must survive at world zoom.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep the canvas milky parchment; lift surfaces by tone + warm ink-tinted shadow | Use stark `#FFFFFF`, grey-black shadows, or hard borders |
| Reserve `{colors.terracotta-hero}` for map fills and hero pin moments; `{colors.terracotta}` carries actions and text | Use the hero fill for text (3.88:1 fails AA) or spread it into decoration |
| Render visited as terracotta **+ hatch texture** always | Encode visited state by color alone |
| Set Chinese serif titles at weight 500 | Bold 700 Ming serifs (stern, heavy) |
| Keep `{colors.glow}` for the re-live halo, non-text | Use glow/accent tones as text |
| Pill buttons that name concrete actions (選擇地點, 上傳, 記錄) | Sentence-buttons, abstractions, or reassurance captions where a control belongs |
| One skip affordance per screen (a single quiet button) | Multiple escape hatches (a 先不填 chip *and* a 略過 button) |
| Keep poetry in positioning surfaces only (App Store, the intro brand moment) | 時光膠囊 / 封存-register copy on working UI surfaces |
| Keep inputs ≥ 17pt; transitions never jolt the frame | Any unexpected scale/viewport jump, ever (the v1 login-zoom gripe) |
| Let the save animation carry the ritual emotion | Celebratory chrome, streaks, feeds, progress meters, scarcity mechanics |
| Write zh-TW that LINE would ship — plain, warm, 你 never 您 | Translationese: 「登入以…」, soft-question CTAs 「要不要…？」, system-speak 「已達上限」, jargon like 反查地址 |

## Open Items

Owned forward — nothing here blocks the build starting; each has a decision owner:

- **Latin display face for the wordmark** — v1's Newsreader/Nunito Sans don't appear in the approved v2 frames (pure Noto TC). Decide when the App Store asset pass happens (UX follow-up).
- **Dark mode ("Lamplight")** — deferred in v1, no v2 decision recorded; light-only ships. Post-v2.
- **Widget visuals (FR18)** — no design exists; only needed if epic planning votes the widget IN.
- **Intro pages 2–3** — the approved intro shows page 1 of 3 (dots); remaining pages' content designed during build or a UX touch-up.
- **Settings sub-screens** — 靜音的地點 management list, export flow states, account-deletion confirm: specified behaviorally in EXPERIENCE.md, not visually framed.
- **Edit/remove surfaces (FR29)** — behavior specified; entry points and screens unframed.
- **SwiftUI sheet detents** — exact `presentationDetents` set; v1's three-snap model is the reference (EXPERIENCE.md Interaction Primitives).
- **Tab icon glyphs** — prototype uses hand-drawn strokes; map to SF Symbols (or custom) at build.
