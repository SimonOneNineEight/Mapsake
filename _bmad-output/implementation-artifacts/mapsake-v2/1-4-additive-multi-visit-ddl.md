# Story 1.4: Additive multi-visit DDL (isolated, reversible)

Status: ready-for-dev

## Story

As the maintainer,
I want the multi-visit schema added additively behind the migration gates,
so that the new shape exists without breaking the live web client and before any writer depends on it.

## Acceptance Criteria

**AC1 — Additive `visits` + `photos.visit_id` + RLS**
Given the shared Supabase,
When the migration is applied,
Then a `visits` table (additional visits only), `photos.visit_id` (nullable), and the `promote_primary_visit` RPC are created with owner-scoped RLS mirroring `pins`.

**AC2 — Web write-compat preserved**
Given the migration,
Then `pins.memory_date` / `pins.note` remain writable with **no bridge trigger**, and the live web client keeps reading AND writing pins/photos exactly as before (NFR6).

**AC3 — Reversible**
Given each migration,
Then it is reversible (a `down` path that drops what it added, in dependency order), and re-applying up→down→up is clean.

**AC4 — Consumer contracts verify (G1)**
Given the migration CI,
When a migration PR runs,
Then the `web-consumer` and vendored `ios-consumer` contracts both verify (the reads/writes each consumer performs still resolve against the post-migration schema).

**AC5 — pgTAP covers RLS + the RPC (G2)**
Given pgTAP,
Then tests cover the `visits`/`photos.visit_id` owner-RLS (no cross-user read/write) and the `promote_primary_visit` RPC signature + behavior (promote-most-recent, delete, photo-repoint; NULL when no successor).

**AC6 — Gates armed, dashboard honest (G3, G4)**
Given the migration CI,
Then the anti-staleness gate (G3) is armed (field-support manifest present) and expand/contract lint (G4) passes, and the status is labelled **"migration regression-safe"** — NOT "proven" (X1 dual-writer convergence is not runnable until Story 2.1).

## Tasks / Subtasks

- [ ] **Task 1 — Migration 1: `visits` + `photos.visit_id` + RLS** (AC: 1, 2, 3)
  - [ ] `supabase/migrations/<ts>_add_visits_and_photo_visit_id.sql`: create `public.visits` (Shape A — additional visits only; the `pins` row IS the primary visit): `id uuid pk, pin_id uuid not null references pins(id) on delete cascade, user_id uuid not null references profiles(id) on delete cascade, visit_date date, note text, exif_taken_at timestamptz, created_at timestamptz not null default now()`.
  - [ ] Add `photos.visit_id uuid null references visits(id) on delete cascade` (nullable; NULL = belongs to the pin's primary visit).
  - [ ] Owner-scoped RLS on `visits` mirroring `pins` (`visits_owner_{select,insert,update,delete}` on `(select auth.uid())`); insert check also verifies the parent pin belongs to the user.
  - [ ] `idx_visits_pin_id`, `idx_photos_visit_id`. Do NOT tighten/constrain any web-touched column (`pins.memory_date/note` stay as-is; no bridge trigger).
  - [ ] Reversible down section (drop policies, indexes, `photos.visit_id`, `visits`).
- [ ] **Task 2 — Migration 2: per-visit EXIF aggregate** (AC: 1, 2, 3)
  - [ ] `supabase/migrations/<ts>_visit_exif_aggregate.sql`: a trigger maintaining `visits.exif_taken_at = MIN(photos.taken_at WHERE visit_id = v.id)`. **Leave the existing pin-level `sync_pin_exif_taken_at` trigger untouched** — two independent aggregates, no coupling. `SECURITY DEFINER`, `set search_path = ''`, fully-qualified names.
  - [ ] Reversible down (drop the trigger + function).
- [ ] **Task 3 — Migration 3: `promote_primary_visit` RPC** (AC: 1, 5)
  - [ ] `supabase/migrations/<ts>_promote_primary_visit_rpc.sql`: `promote_primary_visit(target_pin uuid)` — `SECURITY DEFINER`, `set search_path = ''`, **one transaction**: if additional visits exist, copy the most-recent one's `visit_date`/`note`/`exif_taken_at` into the `pins` row, re-point that visit's photos to the pin (`visit_id = NULL`), delete the promoted `visits` row; if none remain, set `pins.memory_date = NULL`. Owner-guarded (operates only on the caller's pin). Never a client-side multi-write.
  - [ ] Reversible down (drop function).
- [ ] **Task 4 — pgTAP tests (G2)** (AC: 5)
  - [ ] `supabase/tests/pgtap/`: RLS tests (owner can CRUD own visits; a second user cannot see/modify them; `photos.visit_id` respects ownership); RPC tests (promote-most-recent, photo-repoint, delete, NULL-on-empty, idempotent under re-call). Use pgTAP with `auth.uid()` shimmed per test user.
- [ ] **Task 5 — Consumer contracts (G1)** (AC: 4)
  - [ ] `supabase/tests/contracts/web-consumer.contract.sql` — the reads/writes the live web app performs (authored here). Must still pass post-migration (proves web isn't broken).
  - [ ] `supabase/tests/contracts/ios-consumer.contract.sql` — the **vendored** iOS consumer contract (the queries `MapsakeData` performs — currently `select * from pins`; grows with the app). Authored in `mapsake-ios`, copied here by reviewed PR; a first cut can be committed now and reconciled when Story 2.1's real writer lands.
- [ ] **Task 6 — Migration CI + gates (G1–G4)** (AC: 4, 6)
  - [ ] A migration CI workflow (GitHub Actions) that: spins up a Postgres/Supabase, applies all migrations (G-apply), runs pgTAP (G2), asserts both consumer contracts (G1), runs expand/contract lint (G4 — destructive ops need a justified annotation), and arms the anti-staleness gate (G3 — a field-support manifest: contract ⊇ min-supported AND latest-released). The **prod-shape clone** (schema + PII-scrubbed, distribution-preserving) is the ideal G1 substrate; a first cut may verify against a freshly-migrated empty schema, with the prod-shape clone flagged as the follow-up (needs Simon's prod access).
  - [ ] Label the dashboard/README "migration regression-safe (X1 dual-writer proof pending Story 2.1)".

## Dev Notes

### ⚠️ This touches the SHARED, LIVE database — the riskiest surface in the plan

`travel-map`'s Supabase is the **same** database the live web app uses. Every change here must ship **without breaking the web client's reads AND writes** (NFR6). The strategy is **expand → activate → contract**: this story is pure **expand** (additive, nothing removed, nothing tightened). Under **Shape A**, the `pins` row IS the primary visit; the new `visits` table holds only *additional* visits; `pins.memory_date`/`note` stay web-writable with zero translation and **no bridge trigger**. Never add a computed/generated column on a web-written field. Never tighten a web-touched column.
[Source: architecture.md#Data Architecture, #API & Communication Patterns; epics.md#Story 1.4; NFR6]

### 🚧 Human-gated (Simon)

- **Applying migrations is Simon's, not the agent's** — `supabase db push` (or the dashboard) against the dev project first, then prod, contract-gated between. The agent authors + verifies locally/CI; it never applies to prod.
- **Prod-shape clone** (the ideal G1 substrate) needs prod access (schema + a PII-scrubbed, distribution-preserving sample) — Simon-gated. Story 1.4 can ship the gate machinery verifying against a freshly-migrated schema and land the prod-shape clone as a follow-up.
- **Local verification needs Docker/Colima running** (`colima start`) so `supabase start` + `supabase test db` (pgTAP) can run.

### Current schema this builds on (source of truth = the DB)

- `pins(id, user_id, name, lat, lng, country_code?, region_code?, note?, memory_date? date, exif_taken_at?, muted, created_at, updated_at)` — owner-RLS on `auth.uid()`.
- `photos(id, pin_id→pins ON DELETE CASCADE, user_id, storage_path, width?, height?, taken_at? timestamptz, sort_order, created_at)` — owner-RLS; insert check verifies the pin is the user's.
- Existing trigger `sync_pin_exif_taken_at()` on `photos` maintains `pins.exif_taken_at = MIN(photos.taken_at WHERE pin_id=…)`. **Leave it untouched**; add a parallel per-visit aggregate keyed on `visit_id`.
[Source: supabase/migrations/20260622120000_init_pins.sql, 20260623120000_init_photos.sql, 20260628120000_sync_pin_exif_taken_at.sql]

### DB conventions (match v1 — enforced by review)

`snake_case` plural tables/columns; `idx_<table>_<cols>`; RLS policies `<table>_owner_<action>`; functions/triggers `snake_case`, **`SECURITY DEFINER` + `set search_path = ''`**, fully-qualified names; migrations `<UTCtimestamp>_<description>.sql`. RLS uses `(select auth.uid())` (per-statement cache).
[Source: architecture.md#Naming Patterns]

### Why the promote RPC is server-side + atomic (AR5)

Deleting the primary visit while additional visits exist must **promote** the most-recent additional visit into the pin row (copy date/note/exif, re-point its photos, delete its `visits` row) as **one transaction**. iOS doing promote-then-delete as separate client writes would half-fail offline and orphan data. `SECURITY DEFINER`, owner-guarded, idempotent under re-call/race (Story 2.1's X1 proves the race behavior — this story proves single-caller correctness in pgTAP).
[Source: architecture.md#Data Architecture — Primary-visit delete]

### What this story does NOT include

Photo-object reaping (AR6), `apns_device_tokens` (AR7), and the re-live per-visit engine (AR8) are **later epics' migrations** — not here. The `visits` shape ships **defined, reversible, and unused** (no writer depends on it until Story 2.1). X1 dual-writer convergence is **not runnable** until there's a real iOS writer (2.1) — so the honest status here is "regression-safe," not "proven."
[Source: epics.md#Story 1.4; #Story 2.1; architecture.md#CI Gates]

### Verification approach

Author the SQL, then verify against a **local Supabase** (`supabase start` needs Docker/Colima): `supabase db reset` applies all migrations cleanly; `supabase test db` runs the pgTAP suite; a manual up→down→up proves reversibility; a scripted "web-consumer contract" run proves the web reads/writes still resolve. This is real verification without touching prod. Prod application is Simon-gated.

### Project Structure Notes

```
travel-map/supabase/
├── migrations/
│   ├── <ts>_add_visits_and_photo_visit_id.sql
│   ├── <ts>_visit_exif_aggregate.sql
│   └── <ts>_promote_primary_visit_rpc.sql
└── tests/
    ├── pgtap/               # RLS + RPC behavior
    └── contracts/
        ├── web-consumer.contract.sql       # authored here
        └── ios-consumer.contract.sql       # VENDORED from mapsake-ios (first cut ok now)
travel-map/.github/workflows/  # migration CI: apply → pgTAP (G2) → contracts (G1) → lint (G4) → anti-staleness (G3)
```

### References

- [Source: _bmad-output/planning-artifacts/epics-travel-map-2026-07-13/epics.md#Story 1.4: Additive multi-visit DDL (isolated, reversible)]
- [Source: _bmad-output/planning-artifacts/architecture-travel-map-2026-07-09/architecture.md#Data Architecture, #API & Communication Patterns, #Naming Patterns, #CI Gates, #Prod-Shape Clone Spec]
- [Source: travel-map/supabase/migrations/ — 20260622 pins, 20260623 photos, 20260628 exif trigger]
- [Source: _bmad-output/implementation-artifacts/mapsake-v2/1-3-anonymous-session-data-access-boundary.md — MapsakeData is the iOS consumer whose contract gets vendored]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
