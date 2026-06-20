---
name: Mapsake
status: final
description: A private travel keepsake. A warm, muted milky-canvas atlas where visited places are a hand-tinted terracotta and the unvisited world stays bare paper.
updated: 2026-06-20
colors:
  # Light (default) — v1 ships LIGHT-ONLY
  canvas-bg: '#F2E8D5'          # milky parchment; also the unvisited land
  surface: '#FBF4E4'            # panels, cards, sheets
  region-visited-fill: '#B5663E' # hero terracotta clay — the signature MAP FILL hue (unchanged)
  region-unvisited: '#F2E8D5'   # = canvas-bg; unvisited land IS the paper
  region-border: '#96835E'      # soft warm brown; sole delineator of regions (≥3:1 on canvas)
  text-primary: '#3A2E22'
  text-muted: '#6F5C40'         # dates/secondary; ≥4.5:1 on both canvas and surface
  terracotta-text: '#9E4F2B'    # darker terracotta for TEXT uses (links, primary-button bg)
  accent: '#C8893B'             # re-living GLOW + active states ONLY — never text (non-text)
  # Dark ("Lamplight") — PHASE 2; NOT shipped in v1. Tokens preserved; do not build a theme toggle in v1.
  canvas-bg-dark: '#2C2621'     # cozy warm charcoal-brown
  surface-dark: '#37322B'
  region-visited-fill-dark: '#C4703F' # terracotta glow carries across modes
  region-unvisited-dark: '#383229'
  region-border-dark: '#4D463B'
  text-primary-dark: '#E8E2D8'
  text-muted-dark: '#978F84'
  accent-dark: '#E08A4E'
typography:
  wordmark:
    fontFamily: "Newsreader, 'Noto Serif TC', serif"
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.05'
  display:
    fontFamily: "Newsreader, 'Noto Serif TC', serif"
    fontSize: 30px
    fontWeight: '500'
    lineHeight: '1.15'
  display-mobile:
    fontFamily: "Newsreader, 'Noto Serif TC', serif"
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.2'
  heading:
    fontFamily: "Newsreader, 'Noto Serif TC', serif"
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'   # CJK floor: zh-TW is primary; 1.3 clipped dense Han strokes
  tagline:
    fontFamily: "Newsreader, 'Noto Serif TC', serif"
    fontSize: 18px
    fontWeight: '400'
    fontStyle: italic
    lineHeight: '1.4'
  body:
    fontFamily: "'Nunito Sans', 'Noto Sans TC', sans-serif"
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.55'
  ui:
    fontFamily: "'Nunito Sans', 'Noto Sans TC', sans-serif"
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.4'
  meta:
    fontFamily: "'Nunito Sans', 'Noto Sans TC', sans-serif"
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
  map-label:
    fontFamily: "'Nunito Sans', 'Noto Sans TC', sans-serif"
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.4'   # CJK floor; single-line Latin still sits fine at 1.4
    letterSpacing: 0.12em   # LATIN labels ONLY — never applied to Han glyphs
    textTransform: uppercase  # LATIN labels ONLY — no-op/forbidden on Han glyphs
rounded:
  sm: 6px
  DEFAULT: 8px
  md: 12px
  lg: 18px
  full: 9999px
spacing:
  unit: 8px
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  gutter: 24px
  margin-mobile: 16px
components:
  button-primary:
    background: '{colors.terracotta-text}'   # darker terracotta so cream label clears AA
    color: '{colors.surface}'
    radius: '{rounded.DEFAULT}'
    font: '{typography.ui}'
    padding: 8px 16px
  link-quiet:
    color: '{colors.terracotta-text}'   # darker terracotta clears AA as link text
    decoration: none-until-hover
    font: '{typography.ui}'
  memory-card:
    background: '{colors.surface}'
    border: 1px solid '{colors.region-border}'
    radius: '{rounded.md}'
  bottom-sheet:
    background: '{colors.surface}'
    radius: '{rounded.lg} {rounded.lg} 0 0'
    handle: '{colors.region-border}'
  region-visited:
    fill: '{colors.region-visited-fill}'
    texture: subtle-hatch-overlay   # always-on; redundant non-color cue
    texture-scale: screen-space     # zoom-stable; hatch must NOT shrink to sub-pixel
    small-region-fallback: pin-marker  # sub-~10px regions at world zoom get the visited pin so the cue never disappears
    border: '{colors.region-border}'
  region-unvisited:
    fill: '{colors.region-unvisited}'
    border: '{colors.region-border}'
  memory-pin:
    fill: '{colors.region-visited-fill}'   # terracotta teardrop — the core memory marker
    stroke: '{colors.surface}'             # thin cream outline so it reads on filled land
    radius: '{rounded.full}'
    selected:                              # the re-live / opened pin
      glow: '{colors.accent}'              # accent halo, matches the region re-living glow
      scale: '~1.15'                       # gently enlarges when selected
    cluster:                               # dense pins collapsed into a count bubble
      background: '{colors.region-visited-fill}'
      color: '{colors.surface}'            # cream count label
      border: '{colors.surface}'
      font: '{typography.ui}'
      radius: '{rounded.full}'
---

# Mapsake — Design Spine

> The visual identity. How Mapsake looks. The experience (how it works) lives in `EXPERIENCE.md`. Product scope and requirements are inherited by reference from the PRD and Brief — not restated here. When any mock conflicts with this spine, the spine wins.

## Brand & Style

Mapsake is a private travel keepsake, not a social map or a check-in game. The visual register is a **warm, muted, milky-canvas atlas** — a vintage hand-tinted map you keep for yourself. The world starts as bare parchment; the places you've been are filled in by hand, in a terracotta clay that reads like ink soaked into paper.

The posture is **quiet, personal, literary**. Calm over loud, keepsake over dashboard. No leaderboards, no progress meters, no celebratory chrome. The emotional payoff is the filled map and the resurfaced memory — the interface stays out of the way so those can carry the moment.

Two anchors hold the whole system together: the **milky canvas** (warm paper, never stark white) and the **terracotta fill** (the one hero color, reserved for "you were here"). Everything else is in service of those two.

**v1 ships light-only.** The "Lamplight" dark palette is fully specified below but deferred to **Phase 2** — do not build a theme toggle in v1.

## Colors

The palette is **Sepia Parchment** — warm, low-saturation, paper-first. Shaped by the user's own words: "warm feeling," "muted," "milk not white," "canvas/paper texture." Visited regions are the hero; unvisited regions are the bare page; only a soft border delineates them.

**Light (default):**
- **Canvas (`{colors.canvas-bg}` `#F2E8D5`)** — the milky parchment base, and *also the unvisited land*. Unvisited regions are not a separate color; they are the paper itself. This is intentional and matches the PRD's "unvisited stays plain."
- **Surface (`{colors.surface}` `#FBF4E4`)** — panels, memory cards, the bottom sheet. A half-shade lighter than canvas so containers lift gently off the page without a hard edge.
- **Visited fill (`{colors.region-visited-fill}` `#B5663E`)** — the hero terracotta clay, Mapsake's signature hue. **MAP FILLS only**, kept unchanged at `#B5663E` to hold the milky-canvas feel. Never decoration.
- **Terracotta text (`{colors.terracotta-text}` `#9E4F2B`)** — a darker sibling of the hero fill, used for **text uses only**: quiet links and the primary-button background (where cream text sits on it). Darkened so it clears AA both as link text on canvas and as a button background under cream text (see table). The bright `#B5663E` stays for fills; this darker variant carries text.
- **Region border (`{colors.region-border}` `#96835E`)** — soft warm brown, the *sole* delineator between unvisited regions (since unvisited = canvas). **Trade-off:** the user originally wanted this border as soft as possible, but at the old `#C7B79A` it was effectively invisible (1.62:1) and failed the 3:1 non-text floor. `#96835E` is the *lightest* warm brown that still clears 3:1 on canvas (3.03:1), so it stays as quiet a hairline as legibility allows — soft, but now actually visible to low-vision users and in glare.
- **Text primary (`{colors.text-primary}` `#3A2E22`)** — warm near-black ink (10.84:1 on canvas).
- **Text muted (`{colors.text-muted}` `#6F5C40`)** — dates, secondary lines, map labels. Darkened from the old `#8A7456` (which failed AA on both surfaces) to a warm brown that clears ≥4.5:1 on **both** canvas and surface, while staying clearly muted against the 10.84:1 primary ink.
- **Accent (`{colors.accent}` `#C8893B`)** — the glow on a region being re-lived and active states. A warmer, lighter sibling of the terracotta fill so the two never compete. **Non-text only** — never used for text (it computes only 2.43:1 as text; see Do/Don't).

**Contrast (AA) after the hybrid fix** — targets: body/secondary text ≥4.5:1, large/non-text ≥3:1.

| Pair | Use | Ratio | Threshold | Result |
|---|---|---|---|---|
| text-primary `#3A2E22` / canvas `#F2E8D5` | body ink | 10.84:1 | 4.5 | PASS |
| text-muted `#6F5C40` / canvas `#F2E8D5` | dates, secondary | 5.27:1 | 4.5 | PASS |
| text-muted `#6F5C40` / surface `#FBF4E4` | dates on cards/sheet | 5.84:1 | 4.5 | PASS |
| cream `#FBF4E4` / terracotta-text `#9E4F2B` | primary button label | 5.31:1 | 4.5 | PASS |
| terracotta-text `#9E4F2B` / canvas `#F2E8D5` | quiet link text | 4.79:1 | 4.5 | PASS |
| region-border `#96835E` / canvas `#F2E8D5` | unvisited separator | 3.03:1 | 3.0 | PASS |

**Dark — "Lamplight" — Phase 2 — not shipped in v1.**
Tokens are fully specified and preserved for later; do not build a theme toggle in v1. The evening / couch re-live mood. Warm charcoal-brown, never blue-cold, never pure black. The brand terracotta carries across as a slight glow.
- Canvas `{colors.canvas-bg-dark}` `#2C2621` · Surface `{colors.surface-dark}` `#37322B`
- Visited fill `{colors.region-visited-fill-dark}` `#C4703F` · Unvisited `{colors.region-unvisited-dark}` `#383229`
- Border `{colors.region-border-dark}` `#4D463B`
- Text primary `{colors.text-primary-dark}` `#E8E2D8` · Text muted `{colors.text-muted-dark}` `#978F84`
- Accent `{colors.accent-dark}` `#E08A4E`

Note: in dark mode, unvisited land (`region-unvisited-dark`) is a *distinct* token from the canvas, because at low light an identical fill would lose the land/sea read; in light mode they are deliberately the same paper.

There is **no free user color-picker** (see Do's and Don'ts). Curated map-theme presets are a documented fast-follow, not v1.

## Typography

A **dual-script editorial system**: a warm serif for emotional/display moments, a humanist sans for working UI and body. Latin and Traditional Chinese (zh-TW, the **primary** language) each get a matched serif/sans pair, and the two scripts share one stack so they coexist in a single string.

**Latin:**
- **Newsreader** (variable serif) — wordmark, place/memory titles, large headings, the italic tagline. Weights ~400/500/600 + italic 400.
- **Nunito Sans** (variable sans) — notes, dates, buttons, labels, settings, dense screens. Weights ~400/600/700.

**Traditional Chinese (zh-TW), the keepsake companion:**
- **Noto Serif TC** (Song/Ming 明體) — display/titles. Literary, keepsake warmth.
- **Noto Sans TC** — body and UI.

**Mixed-script stack rule:** every font stack lists the **Latin font first, Noto TC after** (e.g. `Newsreader, 'Noto Serif TC', serif`). Latin glyphs — including the "Mapsake" wordmark and English place names inside a Chinese sentence — render in Newsreader / Nunito Sans; CJK characters fall through to Noto TC. This keeps brand coherence across both languages.

**CJK title weight rule:** memory/place titles in Chinese (e.g. 京都) are set in **Noto Serif TC weight 500 (medium), never bold.** Ming/明體 serifs turn stern and heavy at 700; hierarchy is carried by size and serif elegance, not weight. **Bold 700 is reserved** for rare loud moments. For special titles, **emphasis-via-terracotta** (`{colors.terracotta-text}` `#9E4F2B` — the AA-clearing text variant, not the bright fill) is an on-brand alternative to weight.

**Map labels:** Nunito Sans / Noto Sans TC, small (~12px), `{colors.text-muted}`. The **UPPERCASE + ~0.12em letterspacing applies to LATIN labels ONLY** — a quiet cartographic touch without going engraved. **Han characters are never uppercased and never letter-spaced** (0.12em tracking between Han glyphs looks broken and re-groups perceived words); Chinese labels render at normal tracking with no transform. Scope the rule by script/lang. Since zh-TW is primary, the *default* label rendering is the un-tracked Chinese one.

**CJK line-height floor:** any wrapping Chinese text uses a **~1.4 floor** (Han glyphs are denser/taller than Latin; the old 1.3 heading and 1.0 map-label clipped strokes and cramped stacking). `heading` and `map-label` are raised to 1.4 accordingly. Single-line labels never go below ~1.3.

**Wordmark "Mapsake":** set in Newsreader 500 for now. A bespoke logotype is a possible later refinement, not v1-blocking.

Indicative scale (refine in build): wordmark ~48px · place/memory title ~28–30px (mobile ~24px) · card/section heading ~20px · body note ~15–16px · UI/button/date ~13–14px · map label ~12px tracked caps.

## Layout & Spacing

8px base unit. Scale: 4 / 8 / 12 / 16 / 24 / 32. Largest gaps separate major surfaces (map vs panel); smallest sit inside a card. Mobile side margins 16px so content feels framed, not bled to the edge.

The dominant layout is the **map + memory** pairing — its responsive behavior (desktop right-docked split panel; phone single bottom sheet with three snap points) is a behavioral pattern owned by `EXPERIENCE.md.Interaction Primitives`. This spine owns only its surfaces' look: the panel and the sheet both sit on `{colors.surface}` with a `{colors.region-border}` edge.

## Elevation & Depth

Depth comes from **warm tonal layering**, not hard shadow. Surfaces (`{colors.surface}`) lift off the canvas (`{colors.canvas-bg}`) by tone alone. The one place a real shadow earns its keep is the **bottom sheet** on phones — a soft upward shadow (large blur, low opacity, warm-tinted) to read as a physical sheet drawn over the map. Borders, where needed, are 1px in `{colors.region-border}` — a ghost line, never a hard rule.

## Shapes

Soft, paper-with-rounded-corners — never sharp, never fully pill. `{rounded.DEFAULT}` (8px) for buttons and small surfaces. `{rounded.md}` (12px) for memory cards. `{rounded.lg}` (18px) for the top corners of the bottom sheet. `{rounded.full}` only for the small visited pin/marker and the drag handle. Imagery follows its container's corner radius.

## Components

- **Primary button** — solid `{colors.terracotta-text}` (`#9E4F2B`, the darker text-safe terracotta) with `{colors.surface}` (cream) text, `{rounded.DEFAULT}` corners, `{typography.ui}`. The darker variant keeps the hero-hue family while clearing AA for the cream label. Used sparingly.
- **Quiet text link** — `{colors.terracotta-text}` text, no underline until hover/focus. The default for "+ Add photos / + Write a note" style invitations; low-emphasis, never shouting. Uses the darker terracotta so the link text clears AA on canvas and surface.
- **Memory card** — sits on `{colors.surface}` with a soft `{colors.region-border}` edge, `{rounded.md}`. Holds place title (`{typography.heading}`), optional date (`{typography.meta}`, `{colors.text-muted}`), note, and photos. Looks complete with title alone.
- **Visited region** — `{colors.region-visited-fill}` **plus an always-on subtle texture/hatch overlay** (the accessibility cue, below). The texture is part of the brand look — a hand-tinted, slightly woven fill — not a toggle. **Texture robustness:** the hatch is **screen-space / zoom-stable** — its scale does not shrink to sub-pixel as you zoom out, so the non-color cue survives at the world tier (where a visited country may be only a few pixels and color-blind users most need it). **Very small regions at world zoom (sub ~10px)** fall back to the small `{rounded.full}` visited pin/marker (in addition to or instead of the hatch) so the visited cue never disappears. The hatch also carries enough luminance delta from `#B5663E` to read as texture, not just hue.
- **Unvisited region** — `{colors.region-unvisited}` (= the canvas in light mode), delineated only by the soft `{colors.region-border}`.
- **Re-living glow** — a region being re-lived gets an `{colors.accent}` glow/halo (animated fly-to + glow; honors reduced-motion per `EXPERIENCE.md`).
- **Memory pin** (`{components.memory-pin}`) — the **core memory marker**: a small terracotta teardrop in `{colors.region-visited-fill}` (`#B5663E`, the hero fill family) with a thin `{colors.surface}` cream outline so it reads cleanly on top of filled terracotta land. `{rounded.full}`. Fades in when zoomed into a region; the re-live / opened pin takes a **selected state** — an `{colors.accent}` (`#C8893B`) glow/halo (the same accent as the region re-living glow) and a gentle ~1.15× scale-up — so the pin you're re-living reads as the focal point inside its glowing region. **Cluster bubble** (`{components.memory-pin.cluster}`): dense pins collapse into a `{colors.region-visited-fill}` circle with a cream `{colors.surface}` count label (`{typography.ui}`), `{rounded.full}` — standard MapLibre clustering; tapping/zooming splits it back into individual pins.
- **Visited pin / marker** — small `{rounded.full}` dot, `{colors.surface}` center with a `{colors.region-visited-fill}` ring, for the small-region visited fallback (`{components.region-visited.small-region-fallback}`) where a region is too small to show its fill.
- **Bottom sheet** — `{colors.surface}`, top corners `{rounded.lg}`, a `{colors.region-border}` drag handle centered at the top, soft upward shadow. Behavioral snap points live in `EXPERIENCE.md`.
- **Map labels** — `{typography.map-label}`, `{colors.text-muted}`. Localized to Chinese where the dataset allows (see `EXPERIENCE.md.Map & Localization`).

## Do's and Don'ts

| Do | Don't |
|---|---|
| Keep the canvas milky parchment (`#F2E8D5`) | Use stark `#FFFFFF` anywhere as a surface |
| Reserve the hero fill (`{colors.region-visited-fill}` `#B5663E`) for visited MAP FILLS; use `{colors.terracotta-text}` for links and the button | Spread the hero fill into decoration or use the bright `#B5663E` for text (fails AA) |
| Keep `{colors.accent}` `#C8893B` for the re-live glow and active states only (non-text) | Use accent for any text — it is only 2.43:1 and fails AA |
| Always render visited state as **terracotta + the texture/hatch cue** | Encode visited by color alone — color is never the only signal |
| Set Chinese titles in Noto Serif TC **500 (medium)** | Set Chinese titles in bold 700 (the Ming serif turns stern/heavy) |
| Carry hierarchy with size, serif, and terracotta emphasis | Reach for bold weight to create hierarchy |
| Lead every font stack with the Latin font, Noto TC as fallback | Put Noto TC first (would re-render Latin glyphs off-brand) |
| Ship one curated palette (terracotta) in v1; presets as a fast-follow | Offer a free user color-picker in v1 (binary state, brand identity, contrast, scope) |
| Lift surfaces by warm tone | Manufacture depth with hard shadows or heavy borders |
