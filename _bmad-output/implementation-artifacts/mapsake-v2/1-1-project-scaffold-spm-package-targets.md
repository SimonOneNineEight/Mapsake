# Story 1.1: Project scaffold, SPM package & targets

Status: ready-for-dev

## Story

As the maintainer,
I want the Xcode project, the local `MapsakeKit` package, and the three app targets wired up,
so that every later story has a buildable, CI-green foundation to add to.

## Acceptance Criteria

**AC1 — Targets build against iOS 17.0**
Given a fresh clone,
When the project is opened and built,
Then the App target, a Notification Service Extension target, and a Widget target all compile against iOS 17.0.

**AC2 — `MapsakeKit` module split with extension-safety flags**
Given the build,
Then `MapsakeKit` exposes `MapsakeModels` / `MapsakeData` / `MapsakeDesign`, with `MapsakeModels` and `MapsakeData` set `APPLICATION_EXTENSION_API_ONLY = YES`.

**AC3 — Shared App Group + Keychain access group**
Given the three targets,
Then an App Group and a Keychain access group are shared across all three (App, NSE, Widget) via entitlements.

**AC4 — SPM dependencies resolve**
Given the package graph,
Then `supabase-swift` (from 2.51.0) and `maplibre-gl-native-distribution` (6.x) resolve via SPM, with `supabase-swift` declared **only** on the `MapsakeData` target.

**AC5 — Secrets injected via gitignored xcconfig (never hardcoded)**
Given the dev Supabase project exists,
When the app initializes,
Then the Supabase URL + anon key are read from a gitignored `Secrets.xcconfig` (never hardcoded) and injected into `MapsakeData` at launch.

**AC6 — Green CI on a macOS runner**
Given the repository,
When CI runs on a macOS runner,
Then it builds, signs, and runs an (empty but real) Swift Testing suite green.

## Tasks / Subtasks

- [ ] **Task 1 — Create the `mapsake-ios` repository & Xcode project** (AC: 1)
  - [ ] Confirm the target location for the new `mapsake-ios` repo and that the dev Supabase project + an Apple developer signing identity exist (see Prerequisites — human-gated).
  - [ ] New Xcode project → **iOS App**, SwiftUI interface, Swift language, deployment target **iOS 17.0**, `CFBundleDevelopmentRegion = zh-Hant`.
  - [ ] Add a **Notification Service Extension** target and a **Widget Extension** target, both iOS 17.0.
  - [ ] Commit `.gitignore` (Xcode + `Secrets.xcconfig`), `README.md`, `.swiftlint.yml`.
- [ ] **Task 2 — Local SPM package `MapsakeKit` with three modules** (AC: 2, 4)
  - [ ] Create `Packages/MapsakeKit/Package.swift` (swift-tools 6.0, iOS 17 platform).
  - [ ] Define library products/targets `MapsakeModels`, `MapsakeData`, `MapsakeDesign` with the dependency direction: `MapsakeData → MapsakeModels`, `MapsakeDesign → MapsakeModels`; `MapsakeModels` has zero deps.
  - [ ] Declare `supabase-swift` (from `2.51.0`) as a package dependency linked **only** to `MapsakeData`; `maplibre-gl-native-distribution` (from `6.0.0`) linked to the App target (map rendering) — not into the extension-API-only modules.
  - [ ] Set `APPLICATION_EXTENSION_API_ONLY = YES` on `MapsakeModels` and `MapsakeData` (Swift settings / target unsafeFlags or an xcconfig applied to the package targets).
  - [ ] Add a non-test library target `MapsakeTestSupport` (repo fakes, shared by unit + UI tests) and Swift Testing test targets `MapsakeModelsTests` / `MapsakeDataTests`.
- [ ] **Task 3 — Target membership & entitlements** (AC: 2, 3)
  - [ ] App imports `MapsakeModels` + `MapsakeData` + `MapsakeDesign`; NSE imports `MapsakeModels` + `MapsakeData` (**never** `MapsakeDesign`); Widget imports `MapsakeModels` + `MapsakeDesign` (+ `MapsakeData` only if it queries).
  - [ ] Add the **App Group** (`group.<reverse-dns>.mapsake`) and **Keychain access group** entitlements to all three targets; add `aps-environment` + Associated Domains to the App entitlements (placeholder values are fine this story; consumed by Epic 3/5).
- [ ] **Task 4 — xcconfig configuration & secrets injection** (AC: 5)
  - [ ] `Config/Debug.xcconfig` + `Config/Release.xcconfig` carry the non-secret build settings and `#include "Secrets.xcconfig"`.
  - [ ] `Config/Secrets.xcconfig` (**gitignored**) holds `SUPABASE_URL` + `SUPABASE_ANON_KEY`; surface them into `Info.plist` and read them in `MapsakeApp.swift`, passing into a `MapsakeData` configuration entry point at launch. No key literal anywhere in source.
  - [ ] Commit a `Secrets.xcconfig.example` documenting the required keys.
- [ ] **Task 5 — macOS CI workflow** (AC: 6)
  - [ ] `.github/workflows/ci.yml` on a macOS runner: resolve SPM, build + code-sign the App + both extensions, run SwiftLint, run the Swift Testing unit suite. The suite may be near-empty but must be real and green (at least one `@Test` that `#expect(true)` or asserts a trivial `MapsakeModels` value type).
  - [ ] Wire CI secrets so the build gets a `Secrets.xcconfig` (or equivalent env) without committing keys.
- [ ] **Task 6 — Verify a fresh-clone build** (AC: 1–6)
  - [ ] From a clean checkout with `Secrets.xcconfig` supplied, `⌘B` (or `xcodebuild`) builds all three targets green; the test target runs green.

## Dev Notes

### ⚠️ Repository location — this story does NOT land in `travel-map`

The v2 architecture uses **two repos** ("Path 2, vendored"). All Story 1.1 code lands in a **new `mapsake-ios` repository**, not in `travel-map` (this repo is the Supabase backend + the maintenance-only web app). Only the *story spec + sprint status* live here under `_bmad-output/implementation-artifacts/mapsake-v2/`. Do not scaffold Swift/Xcode files into `travel-map`.
[Source: architecture.md#Project Structure & Boundaries — "Two repos (topology decision Path 2, vendored)"; architecture.md#iOS App Repository (`mapsake-ios`, new)]

### 🚧 Prerequisites — human-gated (Simon), blocking before dev

These are external to code and gate a green build/verify. The dev agent cannot satisfy them and must not fake them:

1. **`mapsake-ios` repo** — a new empty repo must be created and its location agreed (the current `travel-map` origin is `github.com/SimonOneNineEight/Mapsake.git`; decide whether `mapsake-ios` is a new GitHub repo or a sibling working dir).
2. **Xcode** — a full Xcode install is required (this workstation currently has **Command Line Tools only**, so `xcodebuild`/`.xcodeproj` creation/build cannot run here). The Xcode project (`.xcodeproj`) is created via Xcode; there is no `xcodegen`/`tuist` in this environment.
3. **Dev Supabase project (AR2)** — a **separate dev** Supabase project (free tier allows 2 active) so debug builds + the destructive delete-RPC never touch prod. AC5 needs its **URL + anon key** for `Secrets.xcconfig`. Debug builds pointed at prod is a named anti-pattern.
4. **Apple signing identity / dev team** — needed for AC1/AC6 (target build + code-sign on the macOS CI runner), and later for the App Group / Keychain group / aps-environment / Associated Domains entitlements to provision.
[Source: architecture.md#Infrastructure & Deployment — "Separate dev Supabase project (decided)"; architecture.md#Anti-Patterns — "a debug build pointed at the prod Supabase project"]

### Stack & versions (verified 2026-07-09 in the architecture)

- **Swift 6.x**, SwiftUI app lifecycle, **iOS 17.0** floor (NFR5). `@Observable` (Observation) for state — no third-party state lib.
- **SPM only** (no CocoaPods/Carthage).
- `supabase-swift` **from 2.51.0** (v2.50.0 raised the floor to Swift 6.1+ / iOS 16+; under our iOS 17 target). Linked **only** on `MapsakeData`.
- `maplibre-gl-native-distribution` **6.x** (native PMTiles landed in iOS 6.10.0). Not needed to *compile* this story beyond resolving; the map is built in 1.5. **MapLibreSwiftUI DSL is intentionally deferred** to the Story 1.5 map-layer decision (AR21) — do NOT add it now.
[Source: architecture.md#Selected Starter; architecture.md#Frontend (iOS) Architecture]

### Module split (by dependency direction — this is load-bearing)

- **`MapsakeModels`** — row structs, pure value types, the `timeline()` merge, `reliveSelection()`, `PushPayload`. **Zero deps.** The only definition; every target imports it.
- **`MapsakeData`** — the Supabase client wrapper, session, signed-URL, repo protocol seams. **The sole `import Supabase` site** (greppable, lint-enforced). App + NSE import it.
- **`MapsakeDesign`** — parchment tokens, `N年前` formatting, `.mapsakeAccessible`, `.mapsakeMotion`. Depends on `MapsakeModels`. App + Widget import it; **the NSE does NOT** (a decorated push attaches an image, it doesn't render the design system).
- `MapsakeModels` + `MapsakeData` are **`APPLICATION_EXTENSION_API_ONLY = YES`** (extension-safe: no UIKit, no main-app singletons) because the NSE/Widget link them.
- Rationale: not shared-membership files (rot), not a dynamic framework (dylib-load tax inside the NSE's 30s/memory budget) → one **static-linked** local SPM package.
[Source: architecture.md#Structure Patterns; architecture.md#Architectural Boundaries]

### Conventions to honor now (cheap to set up, expensive to retrofit)

- **Strict concurrency architecture from day one, compiler flag staged** `minimal → targeted → complete` (flip to `complete` at end of Epic 1). Set the package/targets up so this staging is possible.
- **Naming:** Swift API Design Guidelines — types `UpperCamelCase`, one primary type per file `TypeName.swift`.
- **Testing = Swift Testing** (`@Test`/`#expect`), **not XCTest**, for unit tests. The one exception is `MapsakeUITests` (XCUITest needs an app host and uses XCTest) — that target lives in the xcodeproj, App-hosted, and is set up (empty) but exercised from Story 1.2 onward.
- **Data boundary is greppable:** only `MapsakeData` may `import Supabase`. Encode this in `.swiftlint.yml` now (custom rule) even though there's nothing to catch yet.
- The **voice/i18n** (`.xcstrings` candidate gate) and **accessibility/motion** machinery (`.mapsakeAccessible`, `.mapsakeMotion`) are **Story 1.2**, not here. This story only stands up the project so 1.2 has a home. Do not build the token system now.
[Source: architecture.md#Format & Async Patterns; architecture.md#Naming Patterns; architecture.md#Testing; epics.md#Story 1.2]

### Testing standards for this story

Keep it real but minimal: a single Swift Testing `@Test` in `MapsakeModelsTests` that constructs/asserts a trivial value type (or a placeholder) so CI (AC6) has a genuine green suite, not a stub that always passes vacuously. Fixture-based decode tests and the merge-bug tests are later stories' work.
[Source: architecture.md#Testing — "Non-negotiable unit tests: the three merge bugs…"; epics.md#Story 1.1 AC6]

### Project Structure Notes

Target tree for the new `mapsake-ios` repo (build the skeleton; feature dirs are created empty as later stories fill them):

```
mapsake-ios/
├── .swiftlint.yml            # import Supabase only under MapsakeData; (string-literal rule lands 1.2)
├── .github/workflows/ci.yml  # macOS: build+sign, SwiftLint, Swift Testing unit
├── Mapsake.xcodeproj
├── Config/{Debug,Release}.xcconfig + Secrets.xcconfig (gitignored) + Secrets.xcconfig.example
├── Mapsake/                  # App target
│   ├── MapsakeApp.swift      # @main, injects Supabase config into MapsakeData
│   ├── Mapsake.entitlements  # App Group, aps-environment, associated domains, keychain group
│   ├── Info.plist            # CFBundleDevelopmentRegion=zh-Hant; usage strings added when used
│   ├── Core/                 # (Router, AppSession) — created as later stories need
│   ├── Features/             # Map, Capture, Pins, Relive, Browse, Settings, Auth, Photos, Notifications
│   └── Resources/            # Localizable.xcstrings + Assets.xcassets (populated 1.2+)
├── MapsakeNotificationService/  # NSE target + entitlements (App Group, keychain group)
├── MapsakeWidget/               # Widget target + entitlements (App Group)
├── Packages/MapsakeKit/
│   ├── Package.swift
│   ├── Sources/{MapsakeModels,MapsakeData,MapsakeDesign}/
│   └── Tests/{MapsakeModelsTests,MapsakeDataTests} + MapsakeTestSupport
└── MapsakeUITests/            # XCUITest target in the xcodeproj (App-hosted; empty this story)
```

Variance: the architecture's `.swiftlint.yml` also forbids string literals in `Text`/`Label`/`.accessibilityLabel`. That rule belongs with the voice machinery in **Story 1.2** — add only the `import Supabase` boundary rule here to avoid a red build with no strings yet.
[Source: architecture.md#iOS App Repository (`mapsake-ios`, new)]

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 1.1: Project scaffold, SPM package & targets]
- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Epic 1: Foundation, Platform & the Map] (AR1, AR2, AR15, AR21; UX-DR machinery scoped to 1.2)
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Selected Starter: Stock Xcode SwiftUI App + deliberate SPM set]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Structure Patterns]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Format & Async Patterns]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Infrastructure & Deployment]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#iOS App Repository (`mapsake-ios`, new)]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Anti-Patterns]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
