# Accessibility Review — Mapsake UX Spine

Reviewer: accessibility pass over `DESIGN.md` + `EXPERIENCE.md` (+ decision log).
Scope: v1 is **light-only**, zh-TW primary / English fast-follow. Bar = sensible consumer floor for a private keepsake, not enterprise/regulated. Over-engineering is flagged too.

Severity tags: **BLOCKER** (ship would embarrass / exclude users) · **SHOULD-FIX** (fix before build hardens) · **NICE-TO-HAVE**.

---

## 1. Color contrast (computed)

All ratios computed from the actual light-theme hexes in `DESIGN.md` using the WCAG 2.1 relative-luminance formula.

| Pair | Ratio | Threshold | Result |
|---|---|---|---|
| text-primary `#3A2E22` on canvas `#F2E8D5` | **10.84:1** | 4.5 (text) | **PASS** |
| text-muted `#8A7456` on canvas `#F2E8D5` | **3.67:1** | 4.5 (text) | **FAIL** |
| text-muted `#8A7456` on surface `#FBF4E4` | **4.07:1** | 4.5 (text) | **FAIL** (passes 3:1 large only) |
| map-label `#8A7456` on canvas `#F2E8D5` (12px caps) | **3.67:1** | 3.0 / 4.5* | borderline — see note |
| button text cream `#FBF4E4` on terracotta `#B5663E` | **3.88:1** | 4.5 (text) | **FAIL** (passes 3:1 large only) |
| region-border `#C7B79A` on canvas `#F2E8D5` | **1.62:1** | 3.0 (non-text) | **FAIL — hard** |
| accent `#C8893B` on canvas `#F2E8D5` (links/active) | **2.43:1** | 4.5 (text) | **FAIL** |
| terracotta `#B5663E` on canvas `#F2E8D5` (quiet link text) | **3.50:1** | 4.5 (text) | **FAIL** |
| visited fill `#B5663E` vs border `#C7B79A` (region edge) | **2.16:1** | 3.0 (non-text) | **FAIL** |

\* Map labels are 12px 600-weight uppercase. 12px is NOT "large text" under WCAG (large = 18.66px normal / 14pt bold ≈ 18.5px). So strictly the 4.5 threshold applies and the label fails at 3.67:1. Even judged leniently as a graphical/decorative cartographic element (3:1) it only barely clears.

### BLOCKER — region-border is the sole separator of unvisited land and fails badly (1.62:1)
**Location:** `DESIGN.md.Colors` (region-border `#C7B79A`), flagged "open" there and in `EXPERIENCE.md.Accessibility Floor`.
This is the highest-value finding and the spine itself flagged it open. At 1.62:1 against canvas, the border that distinguishes one unvisited country/region from the next is effectively invisible to low-vision users and in bright/glare conditions — the map becomes an undifferentiated parchment blob. Non-text UI components require 3:1 (WCAG 1.4.11).
**Fix:** Darken the unvisited region border to roughly `#A89572` or darker (≈3:1 on canvas) for unvisited/unvisited boundaries. You can keep it "soft" perceptually — 3:1 is still a quiet hairline, not a hard rule. Alternatively keep the warm light border as the visited-fill edge (where contrast comes from the terracotta side) but use a distinctly darker line between two bare regions. Re-verify the chosen value computes ≥3:1.

### BLOCKER — visited region edge vs border is only 2.16:1
**Location:** `DESIGN.md` region-visited (`#B5663E`) bordered by `#C7B79A`.
The boundary between a visited (terracotta) region and the border line is 2.16:1. In practice the terracotta-vs-paper edge carries the read here, so this is less severe than the unvisited case — but if the border is the intended delineator it fails. Folds into the border fix above; once the border darkens to ~3:1 on canvas this resolves naturally.

### SHOULD-FIX — text-muted fails AA for body text on both backgrounds
**Location:** `DESIGN.md` text-muted `#8A7456`; used for dates, secondary lines, map labels (`EXPERIENCE.md` State Patterns, memory card meta).
3.67:1 on canvas, 4.07:1 on surface — both under 4.5. Dates and secondary memory lines are real reading content, not decoration. Apple-Photos-style "two years ago today" date lines need to be readable.
**Fix:** Darken text-muted to ~`#6F5C40` (≈4.6:1 on surface, ≈4.5:1 on canvas). Still clearly "muted" relative to the 10.8:1 primary ink. Cheap, no brand cost.

### SHOULD-FIX — primary button text fails AA (3.88:1)
**Location:** `DESIGN.md.Components` button-primary: surface cream `#FBF4E4` on terracotta `#B5663E`.
3.88:1 — passes only the large-text/3:1 bar. UI button labels are 14px 600 (not "large"), so this fails 4.5. The button is used sparingly, but it is the one primary CTA.
**Fix (any one):** (a) use a slightly darker terracotta for the button background only, e.g. `#A4542E` → cream text reaches ~4.7:1; or (b) bump button label to ≥18.5px bold to qualify as large text (off-brand for this quiet UI — not recommended); or (c) use white-ish `#FFF` text — but the spine bans stark white. Option (a) is cleanest and keeps the hero hue family.

### SHOULD-FIX — links/active states fail as text
**Location:** quiet text link uses terracotta `#B5663E` (3.50:1); accent `#C8893B` for links/active (2.43:1) per `DESIGN.md`.
Quiet links ("+ Add photos", "+ Write a note") are interactive text. Terracotta link text on canvas is 3.50:1; accent is far worse at 2.43:1. Note these affordances usually sit on `surface` (cards/sheet), where terracotta computes ≈3.9:1 — still under 4.5.
**Fix:** Don't rely on accent `#C8893B` for any text — reserve it for the glow/halo (a graphical element, where lower contrast is acceptable). For link text, use the darkened terracotta (`#A4542E`-ish) so the quiet links clear 4.5 on surface. The "underline on hover/focus" already there helps but does not substitute for contrast.

### NICE-TO-HAVE — map labels borderline at 12px
Covered above. If you keep `#8A7456` for labels, the text-muted darkening fix lifts them too. Consider 13px for label legibility at world tier given letterspaced caps lose density.

---

## 2. Non-color encoding (texture cue)

The redundant texture/hatch on visited regions (Option A, validated against deuteranopia sim) is the right call and well-reasoned in the decision log. Two gaps:

### SHOULD-FIX — texture robustness across the three zoom tiers is unspecified
**Location:** `EXPERIENCE.md.Map & Localization` (world → country → admin-1) vs `DESIGN.md` region-visited texture "subtle-hatch-overlay".
A subtle hatch that reads at country zoom can vanish at world zoom (tiny visited countries become a few terracotta pixels — the hatch is sub-pixel) and can alias/moiré at admin-1 zoom. The cue must survive at the world tier specifically, where a single visited country may be 4–10px — that is exactly where color-blind users most need the non-color signal and where a hatch is most likely to disappear.
**Fix:** Specify that the texture is screen-space / zoom-stable (hatch scale does not shrink to sub-pixel), or define a minimum-size fallback (e.g. below N px the region gets the pin/dot marker instead of/in addition to hatch). One line in `DESIGN.md` region-visited.

### NICE-TO-HAVE — texture contrast against its own fill
The hatch must itself be perceivable on the terracotta. If it's a near-tone-on-tone weave it can be decorative-only and not actually function as the non-color cue for low-vision (vs color-blind) users. Note that the hatch needs enough luminance delta from `#B5663E` to read as texture, not just hue variation.

---

## 3. Motion (prefers-reduced-motion)

**Adequate.** `EXPERIENCE.md` State Patterns + UJ-2 + Accessibility Floor all state fly-to and glow degrade to a gentle fade, and "the same memory still lands." Good — the fallback preserves the outcome, not just the animation. No over-build.

### NICE-TO-HAVE
- Confirm the fade itself is brief/subtle (a long cross-fade can still bother vestibular users). A near-instant state change is the safest reduced-motion target.
- The bottom-sheet snap-point drag is user-initiated (fine), but if any auto-animated snap/settle exists, it should also respect reduced-motion. Worth one line.

---

## 4. Screen reader / keyboard

The "Places visited" text/list alternative is the right primitive and is named as the screen-reader path (`EXPERIENCE.md` IA + Accessibility Floor). It correctly doubles as a browse view (no separate-but-unequal a11y silo). But it is under-specified for build.

### SHOULD-FIX — the list alternative needs enough spec to actually be the SR path
**Location:** `EXPERIENCE.md` IA row "Places visited"; Accessibility Floor bullet 2.
Currently it's a one-liner. To function it needs: (a) it must expose the same actions as the map — open a memory, and ideally mark/unmark visited — or SR users can browse but not author; (b) reachable without entering the map widget (a real menu/accessibility entry, which is stated); (c) reflect visited state and memory presence as text.
**Fix:** Add a short behavioral note: the list exposes open-memory (and mark/unmark) for each place, groups by visited/unvisited or region, and is the canonical non-map path. Keep it modest — a flat searchable/grouped list is enough; no need to mirror every map gesture.

### SHOULD-FIX — map keyboard nav and focus model unspecified
**Location:** Accessibility Floor mentions "visible focus states; reading-order focus traversal" but the *map widget itself* has no keyboard model.
A zoomable polygon map is the hard a11y surface. Tabbing through hundreds of regions is unusable. The honest, low-effort answer for a keepsake: **the list IS the keyboard/SR path; the map canvas is a single focusable element with an aria-label and a documented "use the Places list to navigate" affordance.** That's a legitimate consumer-floor decision — but it must be written down, otherwise build will either ship an unfocusable map or attempt full polygon keyboard nav (over-build).
**Fix:** State explicitly: map is one focus stop; regions are not individually tab-focusable; keyboard/SR users route through "Places visited." This both fixes the gap and prevents over-engineering.

### SHOULD-FIX — tap targets for small regions
**Location:** Accessibility Floor: "zoom and/or tap-assist so small admin-1 areas remain selectable."
Direction is right but unquantified. The known floor is ~44×44px (iOS) / ~24px min (WCAG 2.2 target size). Small admin-1 polygons (and the visited pin/dot) will be below this at lower zoom tiers.
**Fix:** Pick the mechanism: rely on zoom (a region only needs to be tappable at the tier where it's the finest grain) plus a hit-slop around small polygons/pins. State a ~44px effective target. This also interacts with finding 2 (small visited regions need the pin marker anyway).

### NICE-TO-HAVE
- The bottom-sheet "▾ back to map" and close (×) on the panel should be keyboard-reachable and labeled; sheet snap states should be operable without a drag gesture (e.g. the handle is a button that cycles snaps, or expand/collapse controls). Drag-only would strand keyboard users at one snap.

---

## 5. CJK / i18n accessibility

The typography system is unusually well-considered for a11y already (weight-500 rule avoids stern heavy Ming bold; Latin-first stack; externalized strings). Notes:

### SHOULD-FIX — line-height for CJK reading text
**Location:** `DESIGN.md` typography: body lineHeight 1.55, ui 1.4, meta 1.4, heading 1.3.
Body 1.55 is fine for Chinese. But the tighter values (ui/meta 1.4, heading 1.3, map-label 1.0) were tuned for Latin; Traditional Chinese glyphs are denser and taller, and zh-TW is the *primary* language. 1.3 on Chinese headings and especially map-label `lineHeight: 1` risk clipping of complex characters' top/bottom strokes and cramped stacking.
**Fix:** Set a CJK floor of ~1.4–1.5 for any wrapping Chinese text; never below ~1.3 for single-line Chinese. For map-label, `lineHeight: 1` is acceptable only because labels are single-line — confirm no Chinese label wraps; if it can, raise it.

### SHOULD-FIX — letterspacing on Chinese map labels
**Location:** `DESIGN.md` map-label `letterSpacing: 0.12em`, UPPERCASE.
0.12em tracking + uppercase is a Latin cartographic convention. `text-transform: uppercase` is a no-op on Chinese (fine), but 0.12em letterspacing between Han characters can look broken or, worse, change perceived word grouping. zh-TW is primary, so the *default* rendering is the Chinese one.
**Fix:** Apply the 0.12em tracking and uppercase to Latin labels only; Chinese labels get normal (or slightly positive, ~0.05em) tracking and no transform. Scope the rule by script/lang.

### NICE-TO-HAVE — text scaling with CJK
Accessibility Floor lists "text scaling without breaking layout." Validate at 200% with the *Chinese* strings specifically (denser, and the "wider English vs compact Chinese" layout rule cuts both ways under zoom). Date format "2022 年 4 月" must not wrap awkwardly when scaled.

---

## 6. Over-build check

Mostly disciplined. The decision log explicitly scopes "modest floor, not over-built," and several choices are correctly minimal (light-only v1, list-as-SR-path, reduced-motion = simple fade). Flags:

- **GOOD / keep:** Deferring dark mode, no color-picker, fade-only reduced motion, single list as the SR path. All correct for a keepsake.
- **AVOID over-build (call-out):** Do NOT attempt full per-region keyboard/SR navigation of the map polygons. That's enterprise-grade machinery this product doesn't need — the "Places visited" list is the sanctioned path (see finding 4). Writing that decision down is what prevents an eager build from over-engineering it.
- **AVOID over-build:** No need for an APCA/full WCAG 2.2 audit, automated a11y gates in CI, or AAA targets. The contrast fixes above (hitting AA) are the appropriate ceiling. Skip 7:1 AAA.
- **Right-sized:** The redundant texture cue is the one genuinely product-specific a11y investment and is worth it — not over-build.

---

## Summary of required actions (build-blocking first)

1. **BLOCKER** — Darken region-border to ≥3:1 on canvas (currently 1.62:1). Resolves the unvisited-separator and visited-edge failures.
2. **SHOULD-FIX** — Darken text-muted to ~4.5:1 (dates/secondary lines).
3. **SHOULD-FIX** — Fix primary-button text contrast (darker terracotta for the button bg → ≥4.5:1).
4. **SHOULD-FIX** — Don't use accent/terracotta for link *text* without hitting 4.5 on surface; reserve accent for the glow only.
5. **SHOULD-FIX** — Specify texture stability at the world zoom tier (+ small-region pin fallback).
6. **SHOULD-FIX** — Write down the map keyboard/SR model (map = one focus stop; list = the nav path) and quantify ~44px tap targets.
7. **SHOULD-FIX** — CJK line-height floor (~1.4) and Latin-only letterspacing on map labels.
