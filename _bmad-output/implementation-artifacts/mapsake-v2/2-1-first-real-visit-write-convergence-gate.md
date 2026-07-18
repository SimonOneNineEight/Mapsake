# Story 2.1: First real visit-write & dual-writer convergence gate

Status: done

## Story

As the maintainer,
I want the thinnest real iOS visit-write through the production data-access layer, exercised against a live web writer,
so that the multi-visit migration is proven — not just regression-safe — before three epics build on it.

## Acceptance Criteria

**AC1 — Real write round-trips through the vendored data layer (epics.md#Story 2.1, verbatim)**
Given the vendored `MapsakeData` write path (not a hand-rolled insert),
When a headless test inserts one visit onto an existing pin,
Then the visit round-trips and the live web client still reads and writes the same pin correctly.

**AC2 — X1 dual-writer convergence is green as a merge gate (epics.md#Story 2.1, verbatim)**
Given the `mapsake-contract-e2e` surface,
When it runs a concurrent web-writer + iOS-writer scenario against the prod-shape clone,
Then the two writers converge (no corruption), the `promote_primary_visit` RPC is idempotent under race, and X1 is green as a merge gate on the migration.

### Additional acceptance criteria (derived from architecture — the story is NOT done without these)

**AC3 — The iOS write is a real `visits` INSERT, owner-guarded by RLS**
Given the anonymous authenticated principal established in Story 1.3,
When it inserts a `visits` row for a pin it owns,
Then the row persists with `user_id = auth.uid()`; and a `visits` insert naming another user's `pin_id` is rejected by RLS (owner-scoped, enforced in Postgres, never the client). [Source: architecture.md#Data Architecture line 122, #Process & Enforcement line 168]

**AC4 — Shape-A read is one merged timeline**
Given a pin with a primary visit (the `pins` row) and ≥1 additional visit (`visits` rows),
When `MapsakeData` reads the pin's timeline,
Then it returns `[TimelineEntry]` merging `UNION(pin-as-primary, visits)`, source-tagged, deterministically sorted `visitDate desc, then created_at, then id`, and tolerant of a bare/web-created pin with zero additional visits. The three merge bugs (id collision, tie-break stability, empty-visits pin) are covered by non-negotiable unit tests. [Source: architecture.md lines 209, 122, 158, 225]

**AC5 — The vendored `ios-consumer` contract matches the real binary (Path-2, G1 stays green)**
Given the real reads/writes `MapsakeData` now performs (pins read + `visits` insert + timeline read),
When the `ios-consumer` contract is authored in `mapsake-ios` and re-vendored into `travel-map`,
Then G1 (both consumer contracts) still passes post-migration, and the contract is self-consistent with the binary (I3) — no drift vs fiction. [Source: architecture.md lines 284, 316–318, 334]

**AC6 — The migration dashboard flips "regression-safe" → "proven"**
Given X1 is green,
When the migration CI reports status,
Then the label changes from "migration regression-safe (X1 dual-writer proof pending Story 2.1)" to "migration proven (X1 dual-writer convergence green)". [Source: 1-4 spec Task 6; migration-ci.yml final step]

**AC7 — Dev/prod isolation holds**
Given all of the above,
Then no test, harness, or debug build in this story writes to the prod Supabase project (`gnlatvacoqlwwabexbfm`); the round-trip runs against the dev project (`mapsake-dev` / `sulnxslznkwktukvwotq`) or a freshly-migrated ephemeral Postgres. [Source: architecture.md line 229 "a debug build pointed at the prod Supabase project" (anti-pattern); memory: prod link guardrail]

## Tasks / Subtasks

- [ ] **Task 1 — `Visit` read/write value types (MapsakeModels)** (AC: 1, 3, 4)
  - [ ] `Packages/MapsakeKit/Sources/MapsakeModels/Visit.swift`: `Visit` (read) mirroring the `visits` table with EXPLICIT CodingKeys — `id: UUID, pinId: UUID (pin_id), userId: UUID (user_id), visitDate: CalendarDate? (visit_date, date-only → CalendarDate, NEVER Date), note: String?, exifTakenAt: Date? (exif_taken_at), createdAt: Date (created_at)`. `Codable, Sendable, Identifiable, Equatable, Hashable`.
  - [ ] `VisitInsert` (write) in the same file: `pinId, userId, visitDate: CalendarDate?, note: String?` only. OMIT `id`/`created_at` (server-managed) and `exif_taken_at` (trigger-maintained — never hand-set). Explicit CodingKeys, snake_case. Mirror the `PinInsert` shape/style exactly.
  - [ ] Do NOT add a `VisitUpdate` here — edit/delete is Story 2.9.
- [ ] **Task 2 — `TimelineEntry` + `timeline()` merge (MapsakeModels)** (AC: 4)
  - [ ] `Packages/MapsakeKit/Sources/MapsakeModels/TimelineEntry.swift`: `TimelineEntry` with a `source: .primary | .additional` tag; its `id` is source-tagged (e.g. `"primary:<pinUUID>"` / `"visit:<visitUUID>"`), NEVER a raw UUID (id-collision bug).
  - [ ] Pure `timeline(pin: Pin, visits: [Visit]) -> [TimelineEntry]`: emit the pin as the primary entry (date = `pin.memoryDate`, note = `pin.note`) UNION the additional `visits`; sort `visitDate desc, then createdAt, then id`. Tolerate zero visits (bare/web pin) and a nil `visitDate` (sorts last within its group, stable).
  - [ ] Non-negotiable unit tests (`Tests/MapsakeModelsTests/TimelineMergeTests.swift`): (a) id collision — a pin and a visit with equal UUIDs stay distinct entries; (b) tie-break stability — equal `visitDate` rows order by `createdAt` then `id`, deterministically; (c) empty-visits pin — a bare pin yields exactly one primary entry.
- [ ] **Task 3 — `VisitRepository` seam + live impl (MapsakeData)** (AC: 1, 3)
  - [ ] `Packages/MapsakeKit/Sources/MapsakeData/VisitRepository.swift`: `protocol VisitRepository: Sendable` referencing ONLY MapsakeModels value types — `func insert(_ visit: VisitInsert) async throws -> Visit`; `func visits(forPin pinId: UUID) async throws -> [Visit]`.
  - [ ] `LiveVisitRepository` (PostgREST via the injected `MapsakeDataClient.supabase`): insert returns the created row (`.insert(...).select().single().value`); `visits(forPin:)` = `.from("visits").select().eq("pin_id", …).order("visit_date")`. NEVER `import Supabase` outside MapsakeData.
  - [ ] Wire it through the ONE shared `MapsakeDataClient` (from `AppSession`) — do NOT construct a second client (round-2 review lesson).
- [ ] **Task 4 — Fake + seam tests (MapsakeTestSupport / MapsakeDataTests)** (AC: 1)
  - [ ] `Packages/MapsakeKit/Sources/MapsakeTestSupport/FakeVisitRepository.swift` (mirrors `FakePinRepository`: records calls, returns seeded values, no Supabase import).
  - [ ] `Tests/MapsakeDataTests/VisitRepositoryTests.swift`: Swift Testing seam tests against the fake (view-model/data tests never hit the network).
- [ ] **Task 5 — Author + vendor the `ios-consumer` contract** (AC: 1, 5)
  - [ ] Author in mapsake-ios: `Packages/MapsakeKit/Sources/MapsakeData/contract/ios-consumer.contract.sql` — the reads/writes the binary now performs: the `pins` read (existing), the `visits` INSERT (write-shape: `insert into public.visits (pin_id, user_id, visit_date, note) select … where false`), and the `visits` read. Keep it a rolled-back-transaction contract.
  - [ ] Re-vendor (copy) into `travel-map/supabase/contracts/ios-consumer.contract.sql` by the reviewed PR (Path-2). Confirm G1 (`scripts/migration-run-consumer-contracts.sh`) still passes against the migrated schema.
- [ ] **Task 6 — `mapsake-contract-e2e` (X1) harness** (AC: 2, 7)
  - [ ] The concurrent dual-writer surface — DECIDED full-fidelity (Dev Notes §X1): hosted in mapsake-ios CI, real compiled MapsakeData Swift writer + SQL web-writer replay. First cut against a **freshly-migrated ephemeral Postgres** (local `supabase start` or a plain Postgres with all 9 migrations applied) — NOT prod.
  - [ ] **iOS-writer** = the real compiled `MapsakeData` write path (a small headless SwiftPM executable using `LiveVisitRepository`), per AC1 "not a hand-rolled insert". **Web-writer** = a replay of the `web-consumer` write operations (pins/photos INSERT/UPDATE of `memory_date`/`note`) — the web app's actual writes, no Next runtime needed.
  - [ ] Run both concurrently hammering the SAME pins; then assert: (a) convergence — the merged timeline reads agree, no rows corrupted/orphaned; (b) `promote_primary_visit` is idempotent under race (concurrent promote+delete leaves consistent state, re-call is a no-op); (c) the single lock order (pin row acquired first) holds — no web↔iOS deadlock. [architecture.md lines 335, 58, 124]
  - [ ] Emit a clear pass/fail; wire as a CI workflow that gates both repos (or is invocable from both).
- [ ] **Task 7 — Flip the dashboard label + record follow-ups** (AC: 6)
  - [ ] Change the migration-CI final step / README from "regression-safe (X1 … pending 2.1)" to "proven (X1 dual-writer convergence green)".
  - [ ] Record the flagged follow-ups (NOT in this story): the **prod-shape clone** substrate for X1/G1 (Simon-gated — needs prod access; 1.4 already deferred it), and the **min-supported + latest iOS build matrix** for X1 (moot today — field-support manifest both null, no shipped builds; populate in Epic 6).

## Dev Notes

### What this story proves (and why it's the crown jewel)

Story 1.4 shipped the multi-visit schema **additive, reversible, and unused** — labelled "regression-safe," explicitly NOT "proven," because X1 dual-writer convergence "is not runnable until there's a real iOS writer (2.1)." This story IS that writer. It is the last gate before Epics 2–5 pile capture, re-live, browse, and accounts on top of Shape-A. The WRITE is deliberately thin (one `visits` insert); the DELIVERABLE is the X1 gate. [Source: 1-4 spec#What this story does NOT include; epics.md line 181]

### The write is an ADDITIONAL-visit INSERT — not a pin insert

Under Shape-A the `pins` row IS the primary visit, and `visits` holds **additional visits only**. AC1 says "one visit onto an existing pin" — that is a `visits` row added to a pin that already exists (seed a pin, or use a web-created one). This is the right thinnest write because it exercises the NEW structure directly: the `visits` table, its owner-RLS, and the composite `(visit_id, pin_id)` FK path. Writing the *primary* visit is just a `pins` insert (the web-compatible path, unchanged) and is Story 2.3's UI concern, not this gate. [Source: architecture.md line 122; migration `20260716120000_add_visits_and_photo_visit_id.sql`]

### The `visits` table this writes into (source of truth = the applied migration)

```
visits(id uuid pk default gen_random_uuid(),
       pin_id uuid not null → pins(id) on delete cascade,
       user_id uuid not null → profiles(id) on delete cascade,
       visit_date date,               -- → CalendarDate on iOS
       note text,
       exif_taken_at timestamptz,     -- trigger-maintained (per-visit MIN(photos.taken_at)); NEVER hand-set
       created_at timestamptz not null default now(),
       unique (id, pin_id))           -- lets photos ref (visit_id, pin_id) → visits(id, pin_id)
```
RLS: `visits_owner_{select,insert,update,delete}` on `(select auth.uid())`; the **insert check also verifies the parent pin belongs to the caller** (a visit can't be attached to someone else's pin). Table grants are `authenticated` only. [Source: supabase/migrations/20260716120000_add_visits_and_photo_visit_id.sql]

### iOS data-layer patterns the write MUST follow (non-negotiable)

- **Import boundary:** only `MapsakeData` may `import Supabase` (greppable, SwiftLint-enforced). A Supabase import in Models/Views fails review. [architecture.md lines 221, 240]
- **Repository seam:** protocol over value types; `MapsakeData` returns only MapsakeModels value types so `MapsakeTestSupport` fakes conform without Supabase. Mirror `PinRepository`/`LivePinRepository` exactly. [architecture.md line 208; existing `PinRepository.swift`]
- **Separate read/write structs, explicit CodingKeys:** `Visit` (read) vs `VisitInsert` (write, omits id/created_at). Never global `convertFromSnakeCase` (can't invert `exif_taken_at` on write). [architecture.md line 190; existing `Pin.swift`]
- **Dates:** `visit_date`/`memory_date` are date-only → `CalendarDate`, never a bare `Date`. `CalendarDate` already exists and now rejects impossible dates (round-2 fix). [architecture.md line 207]
- **Typed errors, calm UI:** typed errors at the Data boundary; the user never sees raw error text (there's no UI in 2.1, but the seam must surface typed errors for later screens' `saving/saved/saveFailed(retryable:)`). [architecture.md lines 224, 210]
- **One shared client:** inject the single `MapsakeDataClient` from `AppSession`; do not build a second (the round-2 Critical). [memory: iOS review round 2]

### Anonymous principal now, sign-in later (reconciling the docs)

The architecture names a "signed-in-first" end state (FR23–25), but the epic re-sequencing pulls accounts to Epic 5: capture (Epic 2) builds on the **anonymous** session stub from Story 1.3, and Epic 5 `linkIdentity`-upgrades it in place. So in 2.1 the writer is the anonymous *authenticated* principal (Supabase anonymous sign-in = the `authenticated` role carrying a stable uid). RLS owner-scoped on `auth.uid()` is the guard either way — the shipped anon key is extractable, so **RLS in Postgres is the real boundary**, not the client. [Source: epics.md epic sequencing; architecture.md lines 168, 135; 1-3 spec]

### §X1 — the `mapsake-contract-e2e` surface (the heart of AC2)

Architecture (line 335, verbatim): *"X1 clone + candidate migration + web + min-supported and latest iOS builds, concurrent dual-writer Shape-A round-trips, assert convergence + no corruption + promote-RPC idempotent under race. The only place the semantic dual-writer break is observable."* It is a **third** CI surface, distinct from travel-map's G1–G4 and mapsake-ios's I1–I4, "triggered by both, blocks both."

**Decided first-cut shape (Simon, 2026-07-17 — full-fidelity):**
- **Host:** mapsake-ios CI (macOS runner) — it natively compiles the real `MapsakeData` Swift writer AND spins up Postgres; it checks out / fetches the migration SQL from travel-map at CI time (both are Simon's private repos) rather than duplicating it.
- **Substrate:** a freshly-migrated ephemeral Postgres (all 9 migrations applied). The **prod-shape clone** is the ideal substrate but is Simon-gated (needs prod access) and was already deferred by 1.4 — keep it a flagged follow-up, not a blocker.
- **iOS-writer:** a headless SwiftPM executable using `LiveVisitRepository` against the DB — the REAL vendored path (honors AC1 "not a hand-rolled insert").
- **Web-writer:** a psql/PostgREST replay of the `web-consumer` write operations (pins/photos INSERT + `memory_date`/`note` UPDATE). The web's writes are simple SQL; the Next runtime is not needed to reproduce them.
- **Version matrix:** "min-supported AND latest iOS" collapses to the single current writer today (field-support manifest both null — no shipped builds). Add the two-version matrix as a follow-up in Epic 6.
- **Assertions:** (a) after concurrent round-trips the merged timeline reads agree and no row is orphaned/corrupted; (b) concurrent promote+delete on the same pin leaves consistent state and re-calling `promote_primary_visit` is a no-op (idempotent); (c) the pin-row-first lock order holds (no web↔iOS deadlock).

### Vendored contract (Path-2) — author in ios, copy to travel-map

The `ios-consumer` contract is AUTHORED in mapsake-ios (`…/MapsakeData/contract/ios-consumer.contract.sql`) and COPIED into travel-map (`supabase/contracts/ios-consumer.contract.sql`) by reviewed PR — no submodule. The current vendored copy only covers the `pins` read; this story grows it with the `visits` insert + read. I3 (contract self-consistency) is what keeps the vendored file honest vs the binary. [architecture.md lines 233, 284, 316–318, 334]

### Human-gated (Simon)

- **Migrations already applied** (dev + prod carry all 9). No new migration in this story — 2.1 is a writer + gate, not DDL. If X1 needs a migration re-apply on its ephemeral DB, that's CI-local, not a prod push.
- **Prod-shape clone** substrate for X1/G1 stays Simon-gated / follow-up.
- **Never** point a test or debug build at prod (`gnlatvacoqlwwabexbfm`); use `mapsake-dev` or an ephemeral DB.

### What this story does NOT include (deferred to 2.2–2.9)

No place/address search (2.2), no fine-tune placement UI or the `選擇地點` confirm (2.3), no date step UI (2.4), no photos/EXIF-strip/per-visit-note picker (2.5), no save-moment animation/loop/recap (2.6), no memory-sheet UI or photo viewer (2.7 — this story ships only the pure `timeline()` merge it consumes, not the sheet), no region-backfill (2.8), no edit/remove UI (2.9 — this story only tests the RPC's race idempotency, it does not invoke promote from a UI). 2.1 is headless: its only surfaces are the `MapsakeData` write path and the X1 CI gate. [Source: epics.md#Epic 2 stories 2.2–2.9]

### Verification approach

- MapsakeModels/MapsakeData: `xcrun swift test` (Xcode toolchain — Swift Testing needs it) green, including the three merge-bug tests + the visit-repo seam tests.
- G1: `scripts/migration-run-consumer-contracts.sh` green with the reconciled `ios-consumer` contract.
- X1: the `mapsake-contract-e2e` harness passes against a freshly-migrated Postgres — convergence + promote-race idempotency.
- App still builds for the simulator (`xcodebuild -scheme Mapsake -destination 'platform=iOS Simulator,name=iPhone 17'`), SwiftLint clean.
- Round-2 review discipline continues: run `bmad-code-review` (Fable 5) after this story.

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/
│   ├── MapsakeModels/{Visit.swift(NEW), TimelineEntry.swift(NEW)}
│   ├── MapsakeData/{VisitRepository.swift(NEW), contract/ios-consumer.contract.sql(NEW/authored)}
│   └── MapsakeTestSupport/FakeVisitRepository.swift(NEW)
├── Packages/MapsakeKit/Tests/{MapsakeModelsTests/TimelineMergeTests.swift(NEW), MapsakeDataTests/VisitRepositoryTests.swift(NEW)}
└── <mapsake-contract-e2e: writer exe + CI workflow — host TBD (see Questions)>

travel-map/
├── supabase/contracts/ios-consumer.contract.sql (UPDATE — re-vendored)
└── .github/workflows/ (migration-ci label flip; + X1 surface if hosted here)
```

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 2.1 (lines 319–333); #Epic 2 (lines 180–182, 315–317); #AR9/AR10/AR11 (lines 96–99)]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Data Architecture (lines 122, 58, 124–125), #CI Gates (lines 331–335), #API & Communication Patterns (lines 140–141), #Process & Enforcement (lines 168, 221, 224–229), #Shape-A read (lines 209, 158), #Testing (line 225), #prod-shape clone spec (line 339)]
- [Source: supabase/migrations/20260716120000_add_visits_and_photo_visit_id.sql, …120100_visit_exif_aggregate.sql, …120200_promote_primary_visit_rpc.sql]
- [Source: _bmad-output/implementation-artifacts/mapsake-v2/1-4-additive-multi-visit-ddl.md — the migration this gate proves; 1-3-anonymous-session-data-access-boundary.md — the MapsakeData seam + anon session written through]
- [Source: mapsake-ios Packages/MapsakeKit/Sources/MapsakeModels/Pin.swift (PinInsert pattern to mirror), MapsakeData/PinRepository.swift (repo seam to mirror); travel-map supabase/contracts/ios-consumer.contract.sql (current vendored copy), .github/workflows/migration-ci.yml (label to flip)]

## Dev Agent Record

### Agent Model Used

Opus 4.8 (1M context) — dev; bmad-code-review (Fable 5) — review.

### Debug Log References

- X1 harness validated LOCALLY against Colima + local Supabase (all 9 migrations applied): iOS writer `WRITER_OK=1`, web-writer read/write convergence, promote no-corruption under concurrent double-fire → `✅ X1 GREEN`.
- Real MapsakeData write path also validated against the dev remote (mapsake-dev, anon enabled): pin insert + visit insert + merged-timeline read round-trip.
- Local-substrate gotcha: `authenticated` lacks base-table grants on a fresh `db reset` (prod provides them via managed default-privileges) → the harness grants pins/photos/region_marks as setup (mirrors the 1.4 pgTAP grant).

### Completion Notes List

- AC1/AC3/AC4 (write path): DONE + green. `Visit`/`VisitInsert`, `timeline()` + 4 merge tests, `VisitRepository`+live, `FakeVisitRepository`, seam tests. `PinRepository.insert` added (the writer creates the pin; Story 2.3 wires the UI). `PinInsert.exifTakenAt` DROPPED (trigger-owned, Shape-A hygiene — review finding).
- AC5 (contract): DONE. `ios-consumer.contract.sql` authored in mapsake-ios (pins read **+ pins INSERT** + region_marks read + visits read + visit insert — the pins-insert write-shape was a review gap), vendored into travel-map. G1 green.
- AC2 (X1) — **hardened after code review; logic proven + FALSIFIABLE locally, CI run pending.** The harness (`scripts/mapsake-contract-e2e.sh`) now: reads convergence AS THE USER (RLS-faithful, not superuser); S1 asserts EXACT single-promote state (content copied, primary photos deleted, successor photo repointed, row consumed); S2 forces genuine contention (a blocker holds the pin row lock so both promotes queue on the RPC's `FOR UPDATE`) and asserts no double-promote. **Falsifiability verified**: removing `FOR UPDATE` from the RPC turns S2 red locally. Writer asserts round-trip VALUES (not just ids). The workflow now runs on **ubuntu** (native Docker; macos-arm64 can't nest-virtualize, Intel macOS can't run Swift 6.1) — the writer's Linux build is validated in a swift:6.1 container (needed a Linux `InMemoryAuthStorage`, `#if os(Linux)`).
- AC6 (label): DONE + reconciled honest — migration-ci says "G1–G4 green; convergence gated by the X1 surface, triggered below" (not a bare "proven"), and now POSTs a `repository_dispatch` to trigger X1 on migration changes (the cross-repo gate the review flagged as missing).
- AC7 (isolation): held.
- AC3 negative RLS: added a pgTAP `throws_ok` (insert a visit onto another user's pin → blocked). 18/18 pgTAP green.
- **Still Simon-gated before X1 is a live green gate:** add `TRAVEL_MAP_TOKEN` (mapsake-ios → read travel-map) and `MAPSAKE_IOS_DISPATCH_TOKEN` (travel-map → dispatch to mapsake-ios), then one CI run to confirm the ubuntu end-to-end (supabase-start + Linux writer + harness). Not runnable from a dev machine.
- **Follow-ups (flagged, not this story):** prod-shape clone substrate; min/latest iOS build matrix (both null today); true idempotency-key for promote (Story 2.9); grant-faithful local substrate (replicate prod's ALTER DEFAULT PRIVILEGES so a grant regression is gate-visible); read pagination for the 1000-row cap.

### File List

**mapsake-ios:**
- NEW `Packages/MapsakeKit/Sources/MapsakeModels/Visit.swift`, `TimelineEntry.swift`
- NEW `Packages/MapsakeKit/Sources/MapsakeData/VisitRepository.swift`, `contract/ios-consumer.contract.sql`
- NEW `Packages/MapsakeKit/Sources/MapsakeContractWriter/MapsakeContractWriter.swift` (NOT main.swift — @main/top-level-code clash)
- UPDATE `Sources/MapsakeData/MapsakeDataClient.swift` (Linux `InMemoryAuthStorage` for headless CI), `Sources/MapsakeModels/Pin.swift` (drop PinInsert.exifTakenAt)
- NEW `Packages/MapsakeKit/Sources/MapsakeTestSupport/FakeVisitRepository.swift`
- NEW `Packages/MapsakeKit/Tests/MapsakeModelsTests/TimelineMergeTests.swift`, `Tests/MapsakeDataTests/VisitRepositoryTests.swift`
- NEW `scripts/mapsake-contract-e2e.sh`, `.github/workflows/mapsake-contract-e2e.yml`
- UPDATE `Packages/MapsakeKit/Package.swift` (writer target + contract exclude), `Sources/MapsakeData/PinRepository.swift` (+insert), `Sources/MapsakeTestSupport/FakePinRepository.swift` (+insert)

**travel-map:**
- UPDATE `supabase/contracts/ios-consumer.contract.sql` (re-vendored, +pins insert), `supabase/config.toml` (anon sign-ins enabled for local/CI), `.github/workflows/migration-ci.yml` (honest label + repository_dispatch to X1), `supabase/tests/pgtap/visits_promote_and_rls.test.sql` (+AC3 negative-insert test, 18/18)
