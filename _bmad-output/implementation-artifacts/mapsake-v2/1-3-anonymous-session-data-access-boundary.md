# Story 1.3: Anonymous session & the data-access boundary

Status: ready-for-dev

## Story

As the maintainer,
I want a real per-install Supabase anonymous session and a clean data-access layer,
so that later stories write real, claimable rows through one tested seam.

## Acceptance Criteria

**AC1 — Per-install anonymous session, persisted**
Given a first launch,
When the app starts,
Then `MapsakeData` establishes a **per-install Supabase anonymous session** (a real principal with a stable `uid`), and the session persists across app launches (the same `uid` on relaunch, no re-sign-in).

**AC2 — Supabase import stays inside MapsakeData**
Given the data layer,
When any code accesses Supabase,
Then only `MapsakeData` imports `Supabase` (already lint-enforced from Story 1.2 — this story is the first real use of it).

**AC3 — Repositories are protocol seams with fakes**
Given the data layer,
Then repositories are defined as **protocols**, with a live Supabase implementation and a `MapsakeTestSupport` fake, so view-model/logic tests never hit the network.

**AC4 — Date-only columns are `CalendarDate`, never bare `Date`**
Given a row with a date-only column (`pins.memory_date`),
When it decodes,
Then it decodes into a `CalendarDate` value type (y/m/d), converted to `Date` only at render with an explicit calendar — a bare `Date` (UTC-midnight) is a defect.

**AC5 — Separate read and write structs, explicit CodingKeys**
Given the model types,
Then read and write structs are separate (`Pin` for reads; `PinInsert` / `PinUpdate` for writes, which omit `id` / `created_at` / `updated_at`), each with **explicit `CodingKeys`** (never a global `convertFromSnakeCase`).

**AC6 — Proven by tests**
Given the seam,
Then a pinned-JSON decode fixture proves `Pin` (incl. the `CalendarDate` and a null `memory_date`) round-trips against the real `pins` shape, and a repository test runs against the `MapsakeTestSupport` fake (no network). CI stays green.

## Tasks / Subtasks

- [ ] **Task 1 — SupabaseClient wiring + anonymous session** (AC: 1, 2)
  - [ ] In `MapsakeData`, build the `SupabaseClient` from the injected `SupabaseConfig` (from Story 1.2's `loadSupabaseConfig()`); make it the single owned client. supabase-swift persists the session in its default local storage.
  - [ ] On launch, if there is no session, call `auth.signInAnonymously()`; otherwise reuse the persisted session. Expose the current `uid` / session state through a small `AppSession`-style seam (an `@Observable` app-session object may live in the App's `Core/`, fed by `MapsakeData`).
  - [ ] Establish the session **once at launch, before any read**; a read path must tolerate "session still resolving."
- [ ] **Task 2 — `CalendarDate` value type** (AC: 4)
  - [ ] Add `CalendarDate` (year/month/day) to `MapsakeModels`: `Codable` (ISO `yyyy-MM-dd` string ↔ value), `Sendable`, `Equatable`, `Comparable`; `toDate(in: Calendar)` for render-time only. No implicit `Date` bridging.
- [ ] **Task 3 — Read/write structs for `pins`** (AC: 5)
  - [ ] `Pin` (read) mirroring the live columns (below) with explicit `CodingKeys`; `memory_date` → `CalendarDate?`, timestamps → `Date` (ISO8601), `id`/`user_id` → `UUID`.
  - [ ] `PinInsert` (omits `id`/`created_at`/`updated_at`; `user_id` set by the caller/RLS) and `PinUpdate` (optional fields for partial update) with explicit `CodingKeys`.
- [ ] **Task 4 — `PinRepository` protocol + live impl + fake** (AC: 3)
  - [ ] Define `protocol PinRepository: Sendable` with the minimal reads this epic needs (e.g. `func allPins() async throws -> [Pin]`). Writes arrive in Epic 2 — keep the protocol small now.
  - [ ] Live impl over PostGREST in `MapsakeData` (RLS-scoped, returns value types only).
  - [ ] Add a **`MapsakeTestSupport`** target (non-test library) with an in-memory `FakePinRepository`.
- [ ] **Task 5 — Tests** (AC: 6)
  - [ ] Pinned JSON decode fixture(s) for `Pin`: one full row + one with `memory_date: null` / null optionals, asserting `CalendarDate` parses and nulls survive.
  - [ ] A repository behavior test against `FakePinRepository` (no network).
  - [ ] Session persistence: unit-test what can be tested off-device (e.g. the "sign in only if no session" decision as a pure function); verify the live anonymous sign-in on the simulator (screenshot/log the resolved `uid`), since the real Supabase call can't run in host `swift test`.

## Dev Notes

### ⚠️ This is THE load-bearing seam of the whole build

The Epic 1 session **MUST be per-install Supabase anonymous auth**, and Epic 5's sign-in will later `linkIdentity`-**upgrade this same live session in place** (uid unchanged) so all captured rows + the device token carry over with no data migration. Do not build a throwaway/mock session here — it has to be the real anonymous principal that Epic 5 upgrades. This is the single most important seam in the build order.
[Source: epics.md#Load-bearing seams; architecture.md#Authentication & Security]

### 🚧 Human-gated: enable Anonymous sign-ins on the dev project

Supabase **Anonymous sign-ins are off by default**. Simon must enable them in the **`mapsake-dev`** project → Authentication → Sign In / Providers → Anonymous (toggle on) before AC1 can succeed at runtime. Flag this; the dev project URL/anon key are already wired (Story 1.2). Prod is untouched (separate project).
[Source: architecture.md#Infrastructure & Deployment — separate dev project]

### The live `pins` schema (mirror exactly; source of truth is the DB)

```
id            uuid            -> UUID                (read-only)
user_id       uuid            -> UUID                (set by caller; RLS enforces = auth.uid())
name          text  NOT NULL  -> String
lat           float8 NOT NULL -> Double
lng           float8 NOT NULL -> Double
country_code  text            -> String?
region_code   text            -> String?
note          text            -> String?
memory_date   date            -> CalendarDate?       (date-only — NEVER a bare Date)
exif_taken_at timestamptz     -> Date?               (ISO8601)
muted         bool  NOT NULL  -> Bool
created_at    timestamptz     -> Date                (read-only)
updated_at    timestamptz     -> Date                (read-only)
```
RLS is owner-scoped on `(select auth.uid())` for select/insert/update/delete. The anonymous principal owns its own rows. Under Shape A (Epic 1.4+), the `pins` row IS the primary visit; `memory_date`/`note` stay web-writable — do not add computed columns on them.
[Source: travel-map supabase/migrations/20260622120000_init_pins.sql]

### Naming & async patterns (architecture — enforced)

- **Explicit `CodingKeys`, never `convertFromSnakeCase`** (it can't reliably invert acronyms like `exif_taken_at` on write). Separate read/write structs: `Pin` (read) vs `PinInsert`/`PinUpdate` (writes omit `id`/`created_at`).
- **Dates:** date-only columns → `CalendarDate`, converted to `Date` only at render with an explicit calendar (UTC-midnight decoding shows the wrong day west of UTC). Timestamps stay ISO8601 `Date`.
- **Concurrency:** async/await throughout; the network client is a `final class … : Sendable` (or a `static` async namespace) returning **only value types**. `@unchecked Sendable` needs a justifying comment. Strict-concurrency flag is staged `minimal → targeted → complete` — flip MapsakeKit to `complete` at the **end of Epic 1**; this story can move it toward `targeted`.
- **Repo seam:** repositories are `protocol`s tested via `MapsakeTestSupport` fakes; view-model tests never hit the network. The read path must tolerate a **bare pin with zero additional visits** and a web-created pin (multi-visit `TimelineEntry` merge is Epic 2 — don't build it here).
- **Screen state enum** (for when views arrive): `idle / loading / loaded([T], isRefreshing: Bool) / failed(Error)`. Not this story's surface, but shape the repo returns to fit it.
[Source: architecture.md#Naming Patterns, #Format & Async Patterns, #Frontend (iOS) Architecture, #Communication & State Patterns]

### `MapsakeTestSupport` target (new)

A **non-test library target** in `MapsakeKit` holding repo fakes, shared by unit tests (and later XCUITest). Add it to `Package.swift`; it depends on `MapsakeModels` (+ the repo protocols, which live in `MapsakeData` or a thin protocol module — keep the protocol where the fake and live impl can both see it without the fake importing Supabase). Simplest: define `PinRepository` in `MapsakeData` (no Supabase types in its signature — only `MapsakeModels` value types), have `MapsakeTestSupport` depend on `MapsakeData` for the protocol but the fake imports no Supabase.
[Source: architecture.md#Structure Patterns; #Testing]

### Learnings carried from Stories 1.1–1.2

- Build/verify from the terminal with `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`; host unit tests via `swift test` in `Packages/MapsakeKit`; run/inspect on the sim with a **normally-signed** build (not `CODE_SIGNING_ALLOWED=NO`, which the sim won't launch).
- Adding Swift files to a package needs **no** Xcode/pbxproj step (SPM auto-includes `Sources/**`). New **targets** (like `MapsakeTestSupport`) are a `Package.swift` edit only — no GUI.
- SwiftPM `swift test` can't exercise the real Supabase network call; verify the live anonymous session on the simulator (log the `uid`).
- The `Supabase`-import lint rule is active — keep all Supabase usage inside `MapsakeData`.
- Config injection (`Config/Secrets.xcconfig` → Info.plist → `loadSupabaseConfig()`) is in place from 1.2; build the client from it.

### Project Structure Notes

```
Packages/MapsakeKit/Sources/
├── MapsakeModels/
│   ├── CalendarDate.swift          # date-only value type
│   └── Pin.swift                   # Pin (read) + PinInsert/PinUpdate (write), explicit CodingKeys
├── MapsakeData/
│   ├── SupabaseClientProvider.swift# builds SupabaseClient from SupabaseConfig; owns the session
│   ├── Session.swift               # anonymous sign-in (only if none) + current-uid seam
│   └── PinRepository.swift         # protocol + live PostGREST impl (value types only)
└── MapsakeTestSupport/             # NEW non-test library target
    └── FakePinRepository.swift
Mapsake/Core/AppSession.swift       # (optional) @Observable app-session glue fed by MapsakeData
```
The `mapsakeDataPlaceholder`/`SupabaseLinkCheck` placeholders from 1.1 can be removed once the real client lands.

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 1.3: Anonymous session & the data-access boundary]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Authentication & Security, #Naming Patterns, #Format & Async Patterns, #Frontend (iOS) Architecture, #Structure Patterns, #Testing]
- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Load-bearing seams]
- [Source: travel-map/supabase/migrations/20260622120000_init_pins.sql] (the live pins schema + RLS)
- [Source: _bmad-output/implementation-artifacts/mapsake-v2/1-2-design-tokens-voice-accessibility-machinery.md] (build/verify flow, learnings)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
