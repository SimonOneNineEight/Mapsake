---
baseline_commit: 53839ed
---

# Story 5.2: On-this-day detection + eligibility

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the system,
I want to find which memories qualify to resurface on a given day,
so that the re-live loop fires even for users who never set a date.

## Acceptance Criteria

1. **Four-tier eligibility, in priority order.** Given a user's pins and a target day, the engine assigns each pin an *effective anniversary date* by the first signal it has: explicit `memoryDate` (tier 1) → else `exifTakenAt` (tier 2, the first photo's EXIF capture date, already denormalized onto the pin) → else `createdAt` (tier 3, surfaced as "added N years ago" rather than a true anniversary). A pin's anniversary "hits" the target day when the effective date's **month-day equals the target's month-day AND it is ≥ 1 whole year earlier** (a same-year match is not an anniversary). [epics 5.2 AC1; architecture 168-169; EXPERIENCE 120-124]
2. **Dateless monthly rediscovery (tier 4) keeps the engine from ever going silent.** Given NO pin anniversaries the target day, the engine offers a gentle "rediscovery" of a random *older* place — but only on a slow cadence (≈ monthly), gated by a caller-supplied `lastRediscoveryAt`. If a rediscovery happened within the cadence window, the engine returns nothing for the day (preserving the mostly-quiet, max-1/day feel). Brand-new pins are not rediscovery-eligible. [epics 5.2 AC1 tier 4; EXPERIENCE 125, 127, 129]
3. **Muted pins are excluded; dates stay fully optional.** A pin with `muted = true` never qualifies under any tier. The engine never depends on a date being set — the median breadth-first user (regions marked, nothing dated) is still reached via tiers 3-4. [epics 5.2 AC2; EXPERIENCE 120, 127, 134]
4. **At most one memory is chosen, with the rest hinted.** When multiple pins' anniversaries hit the same day, the engine returns exactly ONE winner plus a count of the others from that day. **Tie-break: oldest effective date wins** (more years-ago = more emotional weight); **photos are the secondary tiebreaker** (so the landing leads somewhere visual); a stable final tiebreaker (`id`) keeps selection deterministic. [epics 5.2; EXPERIENCE 131-132]
5. **Pure, deterministic, fully unit-tested.** The engine is a pure function: the target day, and any "now"/randomness/cadence state, are passed IN (no `Date.now()`, no `Math.random()`, no DB access inside the engine). It returns a plain result object (or `null` for a quiet day) carrying everything the sender (5-3) and the deep-link landing (5-4) need: `pinId`, `name`, `lat`/`lng`, `regionCode`/`countryCode`, `tier`, `yearsAgo`, `othersFromThisDayCount`. [architecture 282 data-boundary; testability]

### Decisions baked in

- **5-2 is the BRAIN, not the trigger or the delivery.** Scope = the pure eligibility/selection engine + its unit tests, ONLY. OUT: the Vercel Cron trigger, reading all users' pins via the service role, `web-push` send, push copy, and storing `lastRediscoveryAt` — all of that is **Story 5-3** (`app/api/on-this-day/route.ts`). The deep-link landing is **5-4**, "N more from this day" rendering is **5-4/5-5**, per-memory mute UI + delivery-time + global-off are **5-6**. 5-2 produces NO user-visible behavior and sends nothing.
- **No new table, no migration, no gated config.** The engine reads only fields already on `pins` (`memoryDate`, `exifTakenAt`, `createdAt`, `muted`, plus `id`/`name`/`lat`/`lng`/`regionCode`/`countryCode`). Tier-2's "first photo EXIF date" is already denormalized onto `pins.exif_taken_at` at upload — the engine does NOT join `photos`. The `hasPhotos` flag for the tiebreaker is an OPTIONAL input the 5-3 caller supplies (it defaults to `exifTakenAt != null` as a proxy when absent). `lastRediscoveryAt` is an INPUT here; WHERE 5-3 stores it (a `profiles` column or a notifications log) is 5-3's decision. So 5-2 is fully buildable + CI-verifiable with zero Simon-gated steps.
- **Cadence + the 1/day ceiling live in the engine** (given the cadence state), so the scheduler in 5-3 stays a thin "call the engine, send what it returns" loop. The engine returns at most one result, so the hard daily ceiling is structural.
- **Decouple the input type.** The engine takes a small structural `MemoryCandidate` interface (only the fields it needs), NOT the `Pin` type from `data/pins.ts` (which transitively pulls the Supabase client). `Pin & { hasPhotos? }` is assignable to it. This keeps the engine a pure Node-testable module via the e2e rollup pattern (no Supabase at import time).

## Tasks / Subtasks

- [x] **Task 1 — The eligibility engine (AC: 1, 3, 4, 5)** [features/notifications/lib/eligibility.ts (NEW)]
  - [x] Defined `MemoryCandidate` (structural input) + `EligibleMemory` (output) + `EligibilityContext` + the tunable constants `REDISCOVERY_INTERVAL_DAYS` (30) / `REDISCOVERY_MIN_AGE_DAYS` (90).
  - [x] `effectiveDate(c)` → `{ iso; tier }` by priority `memoryDate → exifTakenAt → createdAt`. `dateParts()` reads the **UTC calendar date** (memoryDate parses as UTC midnight, so parts align); tz simplification documented as a 5-3/5-6 refinement.
  - [x] `anniversary(effIso, todayIso)` → `{ hit, yearsAgo }`: `hit = sameMonth && sameDay && yearsAgo >= 1`. Feb-29 leap edge documented.
  - [x] `selectMemoryForDay(candidates, ctx)`: drop muted → collect tier-1-3 anniversary hits → if any, sort (yearsAgo desc, then photos true-first via `hasPhotos ?? exifTakenAt!=null`, then id) and return one + `othersFromThisDayCount`; else tier-4 rediscovery gated by `lastRediscoveryAt`/cadence over a pool older than the min age, chosen by the injected `pick` (default: oldest then id); else `null`.
  - [x] Named exports, kebab-case module, JSDoc'd tiers + 5-3/5-4 contract + tz/leap/cadence notes. NO Supabase import; NO `Date.now()`/`Math.random()` inside (only `new Date(iso)` on passed-in strings).
- [x] **Task 2 — Unit tests (AC: 1, 2, 3, 4, 5)** [e2e/eligibility.spec.ts (NEW)]
  - [x] Rollup pattern, fixed `today = 2026-06-25`, 13 cases: tier-1/2/3 anniversaries with correct `tier`/`yearsAgo`; same-year (yearsAgo 0) does NOT fire; muted excluded; multiple hits → oldest wins + `othersFromThisDayCount`; photos tiebreaker; rediscovery via injected `pick` (tier "rediscovery"/`yearsAgo` null); rediscovery suppressed within cadence; brand-new pins excluded from the pool; empty + all-muted → null. All green (RED first confirmed — import failed before the module existed).
- [x] **Task 3 — Validation (AC: all)** [no app wiring]
  - [x] `tsc --noEmit` + `pnpm lint` clean; `pnpm build` clean; full `pnpm test:e2e` green — **85 passed, 1 pre-existing skip** (was 73; +12 eligibility cases). No route/migration/UI added, no regressions.

## Dev Notes

### Why a pure engine, and where it sits
- The architecture puts re-live behind `app/api/on-this-day/route.ts` (Vercel Cron → eligibility + web-push) [architecture 257, 290, 306]. Splitting the **eligibility brain** (this story) from the **cron + send** (5-3) keeps the brain a pure, exhaustively-testable function and the route a thin caller. Lives in `features/notifications/lib/eligibility.ts` (the `features/notifications` feature already exists from 5-1; `lib/` for pure logic, kebab-case per architecture 189/193).
- This project has **no separate unit-test runner** (only Playwright); pure logic is unit-tested via the **e2e rollup pattern** — a `*.spec.ts` in `e2e/` that imports the function by relative path and asserts in Node, no browser/page (see `e2e/rollup.spec.ts`, `e2e/push.spec.ts`). Follow that exactly.

### The four tiers (EXPERIENCE 120-127) — exact intent
1. **Explicit date** → fires on the **anniversary** ("兩年前的今天：京都").
2. **No user date, photos exist** → first photo's **EXIF** date as the anniversary date. Already denormalized to `pins.exif_taken_at` at upload, so NO photos join is needed here.
3. **No date at all** → **entry-created** date, surfaced as **"added N years ago"** (still a month-day anniversary match, just framed as age, not occasion).
4. **No anniversary signal hitting today** → gentle **rediscovery** of a random older place, on a **slow (≈monthly) cadence**, well below the daily ceiling. Resurfacing a user's OWN older place is explicitly NOT a banned "invented occasion" (EXPERIENCE 127) — it honors the "real memory resurfacing, never a nag" contract.
- **Curated, max ONE/day** across all tiers (EXPERIENCE 129); anniversaries fire first, tier-3/4 fill the quiet stretches. The engine returning at most one result makes the ceiling structural.

### Inputs are injected (purity + determinism)
- `today`, `lastRediscoveryAt`, and the rediscovery `pick` are all parameters — the engine calls no clock and no RNG (mirrors the codebase's pure-function discipline and makes every case deterministic). 5-3 supplies the real "today", the stored `lastRediscoveryAt`, and a real random `pick`.
- **Tz simplification (document it):** `memory_date` is a plain `date`; `exif_taken_at`/`created_at` are `timestamptz`. v1 compares the **UTC calendar date** for the month-day match. Per-user delivery time/timezone is a 5-3/5-6 concern; do not build it here.

### Data shapes already in place (don't reinvent)
- `Pin` (data/pins.ts): `{ id, userId, name, lat, lng, countryCode, regionCode, note, memoryDate, exifTakenAt, muted, createdAt, updatedAt }` — all the fields the engine needs already exist; `Pin & { hasPhotos? }` is assignable to `MemoryCandidate`. The engine must NOT import `Pin` (it pulls the Supabase client transitively); define the small structural input locally. [Source: data/pins.ts; architecture data-model 129-133]
- `pins.muted` is the per-memory mute column (no side table) [architecture 143] — the mute UI is 5-6, but the column exists today, so the engine's `muted` exclusion is real now.

### Scope guardrails (what NOT to do)
- NO `app/api/on-this-day/route.ts`, NO service role, NO reading other users' data, NO `web-push`, NO cron config, NO push copy strings — that is **5-3**.
- NO deep-link/fly-to/glow, NO "N more from this day" UI — that is **5-4/5-5** (the engine only RETURNS the count).
- NO mute affordance, NO delivery-time, NO global-off — that is **5-6**.
- NO migration, NO `types/supabase.ts` change, NO `.env` change. 5-2 is buildable + CI-green with zero gated steps.

### Project Structure Notes
- NEW: `features/notifications/lib/eligibility.ts`, `e2e/eligibility.spec.ts`. No MODs. No new dependency.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2 (lines 377-381)]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 129-133 (pins), 157, 168-169 (eligibility tiers), 189/193 (naming/structure), 257/282/290/306 (re-live wiring — for 5-3, not 5-2)]
- [Source: EXPERIENCE.md lines 116-136 (Notifications & Re-live Trigger — the four tiers, max 1/day, oldest+photos tiebreak, mute, never-silent)]
- [Source: data/pins.ts (Pin shape), e2e/rollup.spec.ts + e2e/push.spec.ts (the Node pure-test pattern), Story 5-1 (features/notifications established)]

### Dependency handed to 5-3
- 5-3 must persist + supply `lastRediscoveryAt` per user (a `profiles` column or a notification-log row — 5-3's call), provide the real `today` and a random `pick`, map each `Pin` → `MemoryCandidate` (supplying `hasPhotos` from a photo-count join if it wants precision over the `exifTakenAt` proxy), and turn the returned `EligibleMemory` into push copy (name + `yearsAgo`/`tier`) + a deep-link payload (`pinId` + coords for 5-4).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- RED→GREEN: ran `playwright test eligibility` first (import of the missing module failed → "No tests found", confirming red), then implemented the engine and re-ran → 13/13 green.
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all clean. Full `pnpm test:e2e`: 85 passed, 1 skipped (pre-existing).

### Completion Notes List

- Pure, dependency-free engine. The only date handling is `new Date(isoString)` on passed-in values (deterministic) read via UTC getters — no `Date.now()`, no `Math.random()`, no Supabase import, so it unit-tests in Node via the rollup pattern.
- **Four tiers via a single `effectiveDate` priority** (`memoryDate → exifTakenAt → createdAt`) feeding one `anniversary()` month-day check; tier 4 (rediscovery) is the separate quiet-stretch fallback. This keeps "never silent for no-date users" structural: every pin has at least `createdAt`, so tier 3 covers the median breadth-first user, and tier 4 fills days with no anniversary at all.
- **At most one result** → the max-1/day ceiling is structural, not a separate guard. Tie-break order: oldest effective date (max `yearsAgo`) → has-photos → `id` (stable).
- **Cadence + randomness are injected**, not owned: `lastRediscoveryAt` gates the ≈monthly rediscovery and `pick` chooses from the older pool. WHERE 5-3 stores `lastRediscoveryAt`, the real `today`, a random `pick`, and the `Pin → MemoryCandidate` mapping (incl. a precise `hasPhotos` join if it wants better than the `exifTakenAt != null` proxy) are all 5-3's job — handed off in the story's "Dependency handed to 5-3" note.
- Documented v1 edges in-code: UTC date comparison (per-user delivery tz is 5-3/5-6), and Feb-29 effective dates only hitting on leap-year targets.
- No gated config: no migration, no `.env`, no `types/supabase.ts` change. Fully CI-verifiable.

### File List

- `features/notifications/lib/eligibility.ts` (NEW)
- `e2e/eligibility.spec.ts` (NEW)

### Change Log

- 2026-06-25 — Story created (context engine; grounded in epics 5.2 + EXPERIENCE 116-136 + architecture 168-169 + the live `pins` schema). Scoped to the pure eligibility/selection engine + unit tests; the cron trigger, service-role read, web-push send, and `lastRediscoveryAt` storage are deferred to 5-3. No migration / no gated config — fully CI-verifiable.
- 2026-06-25 — Dev-story complete. `features/notifications/lib/eligibility.ts` + 13 unit tests (RED→GREEN). tsc/lint/build clean; full e2e 85 passed. Status → review.
- 2026-06-25 — Adversarial review (3 dimensions × skeptic verify): 0 false positives, 0 code bugs (engine hand-traced correct). 2 confirmed missing-test gaps closed by adding 3 tests (16 total). Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Approve (engine correct) + 2 test-coverage gaps closed · 3 dimensions (date math, tier/tie-break/cadence, purity+contract+test-rigor), each finding adversarially verified by a hand-tracing skeptic. 0 false positives; no code defects found.

### Action Items
- [x] **[Med] Lock the tier-precedence contract.** `effectiveDate` uses the first *present* signal, not "any matching date" — a defensible reading, but no test proved it, so a refactor to "try each signal until one hits" would have passed silently. **Added** two tests: a higher-priority `memoryDate` that misses shadows a `exifTakenAt` that would hit (→ null), and the positive direction (`memoryDate` hits while `exifTakenAt` misses → tier `explicit`).
- [x] **[Low] Enforce the month component of the anniversary match.** The only negative case exercised the `yearsAgo >= 1` guard, not month/day equality — a day-only-match bug would have passed the whole suite. **Added** a same-day-of-month / wrong-month case (`2024-07-25` vs `2026-06-25` → null).
