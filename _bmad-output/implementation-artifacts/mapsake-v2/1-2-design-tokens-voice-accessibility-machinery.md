# Story 1.2: Design tokens & the voice/accessibility machinery

Status: ready-for-dev

## Story

As the maintainer,
I want the parchment design system and the voice + accessibility enforcement gates in place,
so that every screen built afterward is on-brand, in-voice, and accessible by construction.

## Acceptance Criteria

**AC1 — Parchment tokens exist as typed SwiftUI tokens (`MapsakeDesign`)**
Given `MapsakeDesign`,
When a view uses a token,
Then the Sepia-Parchment palette (incl. the AA-verified pairs), the Noto Serif TC + Noto Sans TC type ramp mapped to iOS text styles, 8px spacing, radii, and ink-tinted shadows are all available as typed tokens (no raw hex/point literals at call sites).

**AC2 — String-literal lint gate**
Given the enforcement machinery,
When CI runs,
Then a lint rule fails the build on any string literal passed to `Text` / `Label` / `.accessibilityLabel` / alert titles/messages.

**AC3 — Candidate-string release gate**
Given the `.xcstrings` catalog,
When a release build runs,
Then a grep gate fails on any entry still `needs_review` or carrying a `CANDIDATE:` comment.

**AC4 — Accessibility + motion modifiers exist**
Given `MapsakeDesign`,
Then `.mapsakeAccessible(label:trait:)` (label + trait are **required** arguments) and `.mapsakeMotion(…)` (reads `accessibilityReduceMotion`) exist and are usable from the app.

**AC5 — The data-boundary lint rule is active**
Given `.swiftlint.yml`,
Then `import Supabase` outside `MapsakeData` fails the build (the boundary rule the scaffold deferred from Story 1.1), and SwiftLint runs in CI.

**AC6 — Proven, not just present**
Given the machinery,
Then a Reduce-Motion-on UI test proves the `.mapsakeMotion` gate does not animate, an XCUITest asserts an accessible element built with `.mapsakeAccessible` exposes a non-empty label + real trait, and the design tokens compile into at least the foundational primitives (button-primary / button-ghost / button-quiet / chip) as a smoke-test of the token system.

## Tasks / Subtasks

- [ ] **Task 1 — Palette tokens** (AC: 1)
  - [ ] Add `Color` tokens to `MapsakeDesign` for every entry in the palette table below (asset catalog or code-defined; light-only, no dark variants). Expose via a namespaced accessor (e.g. `MapsakeColor.parchment` / a `Color.mapsake…` set) — never a raw `Color(hex:)` at a call site.
  - [ ] Encode the visited-fill rule as a token pair (fill + the always-on hatch cue is a Story 1.6 map concern; here only the color tokens land).
- [ ] **Task 2 — Type ramp** (AC: 1)
  - [ ] Bundle **Noto Serif TC** + **Noto Sans TC** fonts; register via `Info.plist` `UIAppFonts` (or a package-resource registration). Map each ramp role (table below) to the nearest iOS text style so Dynamic Type scales (incl. zh-TW). Serif = display/emotional roles only, **weight 500 never 700**; CJK line-height floors; inputs never below 17pt.
  - [ ] Provide typed text-style accessors (e.g. `Text(...).mapsakeType(.captureQuestion)`), not raw `.font(.system(size:))`.
- [ ] **Task 3 — Spacing, radii, elevation** (AC: 1)
  - [ ] Spacing scale `4/8/12/16/24/32`, screen margin `20`, grid gap `6`; corner radii `full` / `14` / `22` / `12` / `10`; the three ink-tinted shadows + hairline (values in Dev Notes). All typed.
- [ ] **Task 4 — Accessibility + motion modifiers** (AC: 4, 6)
  - [ ] `.mapsakeAccessible(label:trait:)` — a `ViewModifier` with **required** `label` (a localized/typed key, never a raw literal) and `trait` args; sets `.accessibilityLabel` + `.accessibilityAddTraits`.
  - [ ] `.mapsakeMotion(…)` — the single animation gate reading `@Environment(\.accessibilityReduceMotion)`; when reduce-motion is on it degrades to the static/non-animating fallback. Both the FR10 save moment and the FR13 re-live glow will route through this later; here it must exist and be provably inert under Reduce Motion.
- [ ] **Task 5 — Voice / i18n machinery** (AC: 2, 3)
  - [ ] Create the `Localizable.xcstrings` zh-TW catalog. Establish the **typed-key** accessor pattern (e.g. an `L` enum: `Text(L.saved)`), so no string literal reaches a view.
  - [ ] Seed it with the arbitrated vocabulary (table in Dev Notes) as **blessed** entries, and add one or two `needs_review` + `CANDIDATE:` entries to prove the gate (AC3) actually fails on them, then resolve them.
  - [ ] Add the CI **grep gate**: fail the release lane on any surviving `needs_review` / `CANDIDATE:`.
- [ ] **Task 6 — SwiftLint rules + CI** (AC: 2, 5)
  - [ ] Add `.swiftlint.yml` with two custom rules: (a) `import Supabase` allowed **only** under `MapsakeData`; (b) no string literal in `Text` / `Label` / `.accessibilityLabel` / alert title+message.
  - [ ] Add a **SwiftLint** step to `.github/workflows/ci.yml` (install + run; fail on violations).
- [ ] **Task 7 — Foundational primitives + proof tests** (AC: 6)
  - [ ] Build `button-primary` / `button-ghost` / `button-quiet` / `chip` from the tokens (stateless; specs in Dev Notes) as the token smoke-test. Defer all stateful/complex components (sheet, pins, photo tiles, recap, sign-in, tab bar) to the stories that introduce them.
  - [ ] Add the **Reduce-Motion UI test** (AC6) and the **a11y label/trait XCUITest** (AC6) in `MapsakeUITests` (XCUITest, launch with `-UIAccessibilityReduceMotionEnabled` / the reduce-motion launch env).

## Dev Notes

### Where this builds — `MapsakeDesign` (already scaffolded in 1.1)

`MapsakeDesign` exists as a placeholder module in `Packages/MapsakeKit/Sources/MapsakeDesign/` (currently just `Placeholder.swift`). It **depends on `MapsakeModels`**, and **App + Widget import it — the NSE never does**. Unlike Models/Data, `MapsakeDesign` is **not** `APPLICATION_EXTENSION_API_ONLY` today; the Widget is an extension, so if a token/component uses a non-extension-safe API, decide then whether to split it (defer — SwiftUI `Color`/`Font`/`View` are extension-safe). Replace `Placeholder.swift` with real token files; delete the placeholder `let`.
[Source: architecture.md#Structure Patterns; Story 1.1 file list]

### Colors — Sepia Parchment (light-only). Every value is a token; no raw hex at call sites.

| Token | Hex | Use |
|---|---|---|
| `parchment` | `#F2E8D5` | app canvas, chips at rest, field fills on cards |
| `card` | `#FBF4E4` | sheets, cards, tab bar, search pill, unvisited land |
| `ink` | `#3A2E22` | primary text; toast background |
| `ink-soft` | `#6B5B49` | secondary text, sub-lines, dates, hints, inactive tabs |
| `terracotta` | `#9E4F2B` | the single action color: buttons, active tab, selected-chip **text**, standard pins, search glyph — text-safe on both papers |
| `terracotta-hero` | `#B5663E` | visited map fill + emotional pin moments (save/re-live/brand/notif). **Fills only, never text** (3.88:1) |
| `terracotta-soft` | `#E8D5C4` | selected-chip background, avatar background |
| `destructive` | `#A33B2E` | destructive row text only; errors are calm prose, never red fills |
| `glow` | `#E8B48C` | re-live pulse halo; non-text |
| `map-sea` | `#EADFC8` | sea |
| `region-border` | `#96835E` | unvisited region separator |
| `hairline` | ink @ ~7–8% | row dividers, tab-bar top edge |

**AA is already verified** (DESIGN.md table) — honor the resolved rule: **selected-chip = terracotta-soft fill with `ink` 500 text** (terracotta text on the tint is banned for text sizes, it failed at 4.09:1). `terracotta-hero` is never text.
[Source: DESIGN.md#Colors]

### Type ramp — Noto Serif TC (display/emotional, wt 500) + Noto Sans TC (all working UI)

| Role | pt | Face |
|---|---|---|
| brand display | 34 | serif |
| screen title | 26 | serif |
| sheet/recap title | 24 | serif |
| capture question | 22 | serif |
| sheet heading | 20 | serif |
| intro tagline | 18 | serif, terracotta |
| button / input | 17 | sans |
| body | 16 | sans |
| note | 15 | sans (line-height 1.7) |
| re-live context / screen subtitle | 14 | 500 terracotta / 400 ink-soft |
| sub-meta / section label | 13 | sans |
| caption / hint | 12 | sans |
| tab label | 11 | sans |

Rules: **CJK serif weight 500, never bold**; sans 700 only for rare loud numerals (cluster counts, notif app name); **CJK line-height floor ~1.4** (single-line titles ~1.3); **no letterspacing/uppercasing on Han**; **inputs never < 17pt**. Map roles to iOS text styles and let Dynamic Type scale (zh-TW incl.).
[Source: DESIGN.md#Typography]

### Spacing / radii / elevation

- **Spacing:** `4 / 8 / 12 / 16 / 24 / 32`; screen side margin **20**; photo grid/strip gap **6**.
- **Radii:** `full` (pills: buttons, chips, search pill, toast, toggle) · `DEFAULT` **14** (cards, fields, grouped containers) · `lg` **22** (sheet top corners) · `md` **12** (photo-strip tiles) · `sm` **10** (photo-grid tiles). Grabber 44×5 @ 3px; avatars true circles.
- **Shadows (ink-tinted, never grey-black):** card/pill `0 4px 16px rgba(58,46,34,.18)`; sheet `0 -6px 24px rgba(58,46,34,.22)`; pin `0 2px 4px rgba(58,46,34,.35)`. Nothing else casts shadow.
[Source: DESIGN.md#Layout & Spacing, #Elevation & Depth, #Shapes]

### Foundational primitives to build now (Task 7) — stateless, token-composed

- **button-primary** — full-width terracotta pill, `card`-toned 17/500 label, 16px vertical padding. One per screen; names a concrete action.
- **button-ghost** — transparent pill, 1.5px terracotta border + text.
- **button-quiet** — bare ink-soft text button (the single skip/dismiss per screen).
- **chip** — parchment pill, 14 ink text; selected = terracotta-soft fill + **ink** 500 text; hit area ≥ 44pt (visual height unchanged).

**Explicitly deferred** to their introducing stories (do NOT build here): sheet, list-row, grouped-card, search-pill, field, cluster-pin, pin-marker (all variants), recap-card, sign-in buttons, notif-preview-card, browse-expand-card, photo tiles/strip, toggle, toast, tab-bar, avatar. Building them now is premature — they carry behavior from later stories.
[Source: DESIGN.md#Components; epics.md#Story 1.2 ACs (tokens + machinery, not the full component library)]

### Voice / i18n enforcement (UX-DR5) — the machinery, not the screens

- **Every string lives in `Localizable.xcstrings`**; **no string literal reaches a view** — typed keys only (e.g. an `L` enum → `Text(L.saved)`). A SwiftLint rule forbids literals in `Text` / `Label` / `.accessibilityLabel` / alert title+message (AC2).
- **New strings ship `state: needs_review` + a `CANDIDATE:` comment** naming the voice-guide term; **blessing is a diff** (`needs_review → translated`, strip the prefix). A **CI grep fails the release build** on any surviving `needs_review` / `CANDIDATE:` (AC3).
- **VoiceOver labels draw from the same blessed key** as the visible text — never a parallel hardcoded string (ties into `.mapsakeAccessible`).
- The **arbitrated vocabulary is binding** — seed these as blessed entries:

| Concept | Word |
|---|---|
| capture verb | 記錄 |
| choose place (confirm) | 選擇地點 |
| photo action | 上傳 |
| promise verb (re-live only) | 重溫 |
| a memory | 回憶 |
| a visit (counter) | 第 N 次 (pin/re-live only, **not** recap rows) |
| save success | 已儲存 (everywhere) |
| the map | 地圖 |
| a place (noun, app-wide) | 地點 |
| browse-all surface | 去過的地點 |
| date question | 「哪一天去的呢？」 |

Register: warm plain spoken Taiwan Mandarin (LINE register), **你 never 您**; imperative+benefit CTAs never soft-questions; no translationese (`登入以…`, `要不要…？`, `已達上限`, jargon like 反查地址). **Simon arbitrates every candidate string before implementation (FR28)** — this story seeds only the already-blessed vocabulary; any *new* copy stays a candidate.
[Source: mockups/voice-guide.md; architecture.md#Process & Enforcement Patterns]

### Accessibility + motion (UX-DR3, UX-DR6)

- `.mapsakeAccessible(label:trait:)` — **required** label + trait args; the label comes from the blessed catalog key (never a parallel literal). An XCUITest asserts every accessible element has a non-empty label + real trait (AC6).
- `.mapsakeMotion(…)` — the **one** gate reading `accessibilityReduceMotion`; save-moment + re-live glow route through it later. A **Reduce-Motion-on UI test** proves they don't animate (AC6). Launch the app under the reduce-motion setting in the XCUITest.
- Also in the floor (apply as components arrive, not all here): Dynamic Type incl. zh-TW, ≥44pt targets, AA contrast (done in tokens), visited-never-color-alone (Story 1.6), load-bearing focus ring.
[Source: architecture.md#Process & Enforcement Patterns; DESIGN.md; NFR8]

### Testing standards

**Swift Testing** for unit-level token/logic tests (e.g. a token resolves, the type ramp maps a role). The two required proofs (Reduce-Motion, a11y label/trait) are **XCUITest** in `MapsakeUITests` (needs an app host; XCTest, not Swift Testing) — the `MapsakeUITests` target exists from 1.1 (empty). Wire it into CI.
[Source: architecture.md#Testing; Story 1.1]

### Learnings carried from Story 1.1 (avoid re-hitting these)

- **Build/verify from the terminal** with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, `xcodebuild ... -scheme Mapsake -destination 'platform=iOS Simulator,name=iPhone 17'`. Host package tests via `swift test` in `Packages/MapsakeKit` (the package now declares a macOS 13 floor for host testing).
- **`.swiftlint.yml` does not exist yet** — 1.1 deferred it; this story creates it (both the data-boundary rule and the string-literal rule) and adds the SwiftLint CI step. SwiftLint is **not yet installed on the runner** — the CI step must install it (e.g. via brew) or use a pinned action.
- **CI** currently builds the app for `generic/platform=iOS Simulator` (unsigned) + runs `swift test`. Adding XCUITest to CI needs a **concrete booted simulator** (not `generic/`), e.g. `-destination 'platform=iOS Simulator,name=iPhone 17'`, and a longer runner budget.
- **Adding files to the Xcode project**: prefer editing the package (SPM auto-includes new `Sources/**` files — no pbxproj change needed) over Xcode "Add Files" (which mis-defaulted to copy-to-root + Copy-Bundle-Resources in 1.1). Fonts/`.xcstrings` that must live in the **app target** do need project membership — add them carefully (uncheck "Copy items if needed" when already in place; correct target; not the Resources phase for config).
- **App Group is deferred** (Story 1.1 Piece 5, gated on the paid Apple Developer Program until Epic 3). Nothing in 1.2 needs it.
- Secrets flow (`Config/*.xcconfig` → Info.plist → `MapsakeData.loadSupabaseConfig()`) is in place; unrelated to 1.2 but don't disturb it.

### Project Structure Notes

```
Packages/MapsakeKit/Sources/MapsakeDesign/
├── Colors/…            # palette tokens (asset catalog or code)
├── Typography/…        # Noto TC registration + role→text-style ramp
├── Layout/…            # spacing, radii, shadows
├── Accessibility/…     # .mapsakeAccessible, .mapsakeMotion
├── Localization/…      # L typed-key accessor over Localizable.xcstrings
└── Components/…        # button-primary/ghost/quiet, chip (only)
mapsake-ios/
├── .swiftlint.yml                       # NEW: data-boundary + string-literal rules
├── Mapsake/Resources/Localizable.xcstrings   # zh-TW catalog (app target)
├── Mapsake/Resources/Fonts/…            # Noto Serif TC / Noto Sans TC (if app-target hosted)
├── MapsakeUITests/…                     # Reduce-Motion + a11y proof tests
└── .github/workflows/ci.yml             # + SwiftLint step; + candidate-string grep gate; XCUITest on a concrete sim
```
Font/`.xcstrings` hosting (app target vs package resource) is an implementation call — if hosted in the package, register via `Bundle.module`; if app-target, via `UIAppFonts`. Either is fine; keep tokens' font names consistent.

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 1.2: Design tokens & the voice/accessibility machinery]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/DESIGN.md#Colors, #Typography, #Layout & Spacing, #Elevation & Depth, #Shapes, #Components]
- [Source: _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-07-02/mockups/voice-guide.md]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Process & Enforcement Patterns, #Structure Patterns, #Testing]
- [Source: _bmad-output/implementation-artifacts/mapsake-v2/1-1-project-scaffold-spm-package-targets.md] (module layout, CI, learnings)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
