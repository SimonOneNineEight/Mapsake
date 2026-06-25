---
baseline_commit: 527ca5b
---

# Story 2.4: Cross-device sync

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the same map wherever I log in,
so that my keepsake follows me.

## Acceptance Criteria

1. **Same map on a second device.** A signed-in user who opens the app on a second device sees the same map and memories (region marks, pins, notes, dates, photos). [epics 2.4 AC1]
2. **Refetch-based freshness, no live Realtime.** A change made on one device shows on the other when it regains focus or is refreshed — refetch-based, NOT live Realtime in v1. [epics 2.4 AC2; architecture NFR3 "server-of-truth + refetch; offline read-only", lines 157/160/307]

### This is a verify-and-document story (the machinery already shipped)

Both ACs are delivered by infrastructure already in place — 2-4 closes Epic 2 by **verifying + documenting** the v1 sync model, not by building new sync. Honest scope:

- **AC1 — already delivered by Story 2-7 + the RLS read layer.** 2-7's `signInWithOtp({shouldCreateUser:false})` signs device 2 INTO the existing account (session-replacing, the account's uid) and round-trips through `/auth/confirm` — a full document load that rebuilds the QueryClient so the uid-keyed caches refetch under the account uid. The reads (`usePins` `["pins",uid]`, `useRegionMarks` `["regionMarks",uid]`, `usePhotos` `["photos",pinId]`) are RLS-scoped to `auth.uid()`, so signing into the account loads exactly its rows. (Story 2-6 export already exercises this full RLS-scoped read set.)
- **AC2 — already delivered by the react-query config.** `app/providers.tsx` sets `refetchOnWindowFocus: true` + `staleTime: 30_000`; the pins/marks/photos queries inherit it (no per-query override), so device 2 refocusing after 30s refetches and shows device 1's writes. "No Realtime" is satisfied by simply not having it. The 2-5 `useAddPin onSuccess` idempotency fix already hardened the cache against a focus-refetch landing a row mid-add.

### Decisions baked in (from the 4-agent context analysis, 2026-06-25)

- **"Pull-to-refresh" = browser-native reload (no new gesture handler).** For a web-first PWA, the browser's own pull-to-refresh / reload (a full document load → QueryClient rebuild → refetch) satisfies AC2's "or pull-to-refresh", alongside `refetchOnWindowFocus`. Matches architecture line 160; avoids a custom scroll-gesture that would collide with the map's pan. No new component.
- **No conflict-reconciliation work.** v1 is online-only, single-writer-at-a-time; the field-level-merge conflict model (architecture Invariant #2) is the deferred offline-outbox/PowerSync concern (the same deferral 2-5 made). Two devices editing the same field concurrently is a rare, accepted v1 edge — do NOT build merge here.
- **No new infra:** no Realtime, no service role, no migration, no new query layer. 2-4 is expected to add **no production code** — its deliverable is the documented sync model + a refetch-on-focus e2e that locks AC2 as evidence.

## Tasks / Subtasks

- [x] **Task 1 — Verify AC1: the account's full map loads under the signed-in uid (AC: 1)** [no code — verified]
  - [x] Confirmed `usePins`/`useRegionMarks`/`usePhotos` are uid-keyed, `enabled: !!userId`, RLS-scoped; MapCanvas effects re-render fill/markers on `[marks, pins]` change. AC1's load-bearing piece (sign-in → the existing account's uid) is delivered by 2-7's `signInWithOtp` → `/auth/confirm` reload → `getClaims().sub`, verified sound by the adversarial review. The live two-device round-trip is a MANUAL check, gated on Simon's "Magic Link" email-template config (the 2-7 dependency).
- [x] **Task 2 — Verify AC2 + lock the refetch/render path with an e2e (AC: 2)** [e2e/sync.spec.ts (NEW)]
  - [x] Confirmed `app/providers.tsx` = `refetchOnWindowFocus: true` + `staleTime: 30_000`; pins/marks/photos inherit it (no per-query override; only `use-account`/`use-session-user` set `staleTime:Infinity`, which are identity, not data). NO Realtime anywhere (grep clean) → "no live Realtime" holds by absence.
  - [x] e2e (`e2e/sync.spec.ts`): fakes the account's server-side pins (GET `/rest/v1/pins`), asserts they load in the "去過的地方" list (the account's map appears), then adds one + reloads (the web-first pull-to-refresh) and asserts it appears — proving the refetch→render path surfaces another device's change. (The clock+focus simulation was not needed; the reload path is reliable and is the decided pull-to-refresh model. The window-focus refetch is react-query's library-tested behavior, config-verified above.)
- [x] **Task 3 — Document the v1 sync model (AC: 1, 2)** [Dev Notes / no code]
  - [x] Model documented (Dev Notes): server-of-truth + RLS reads; freshness via `refetchOnWindowFocus` + browser reload; NO Realtime in v1; field-level-merge + offline-write outbox stay the post-v1 fast-follow (PowerSync). The manual two-device round-trip is the AC1 acceptance evidence (gated on the Magic-Link config).
  - [x] No-regression: full e2e **67 passed, 1 skipped** (a known timing flake passed on retry); `tsc` + `lint` + `pnpm build --webpack` clean.

## Review Findings

_Adversarial verification 2026-06-25 (1 skeptical reviewer on the "already satisfied / no production code" conclusion + e2e soundness)._

- [x] [Review][Confirmed] **No production-code gap** — both ACs are deliverable by existing infra: AC1 via 2-7's sign-in (`signInWithOtp` → `/auth/confirm` reload → correct uid) + RLS-scoped uid-keyed reads; AC2 via the `refetchOnWindowFocus`/`staleTime` config (queries inherit it; no Realtime by absence) + the MapCanvas `[marks,pins]` re-render. The reviewer found nothing needing new code.
- [x] [Review][Accept] **Coverage-claim correction:** `e2e/sync.spec.ts` runs as the shared ANON session and stubs the pins GET, so it locks the **refetch→render** path (AC2 + "the account's pins render"), NOT AC1's sign-in uid-continuity (the harness is anon-only — it can't perform a real sign-in, the same limitation as 2-1/2-2/2-3/2-7's signed-in paths). AC1's uid-continuity is covered by 2-7's code + the manual two-device round-trip. Story claim adjusted to say "locks the refetch/render path" rather than "locks the behavior". A two-session RLS integration test for AC1 is a documented follow-up (needs a permanent test account the anon harness doesn't have).

## Dev Notes

### Why no production code (the honest finding)
- **AC1:** the same-map-on-device-2 is a consequence of being signed into the account (2-7) + RLS-scoped reads keyed on `auth.uid()`. Nothing new to build — the read layer + 2-7's full-reload uid switch already do it. [Source: features/{pins,regions,memories}/queries/*; app/auth/confirm/route.ts; Story 2-7]
- **AC2:** `app/providers.tsx` — `refetchOnWindowFocus: true`, `staleTime: 30_000`; the queries don't override staleTime, so they refetch on focus once stale. "No Realtime" = absence. The MapCanvas `[marks, pins]` effects re-apply feature-state/markers on changed data, so a refetch that brings new rows updates the map. [Source: app/providers.tsx; features/map/components/MapCanvas.tsx]

### Sync model (v1) — the documented contract
- **Server-of-truth + refetch** (architecture NFR3, lines 157/160/307: "No Realtime in v1 (refetch-based reads)", "Reads: refetch-on-focus + pull-to-refresh", "server-of-truth + refetch; offline read-only").
- **Freshness:** `refetchOnWindowFocus` (tab refocus / app foreground after 30s stale) + browser reload (the web-first "pull-to-refresh"). No custom gesture.
- **Offline:** read-only cached shell (Story 4-6) — no offline-write queue in v1.
- **Conflict model:** single-writer-at-a-time online; field-level merge + the offline-write outbox (PowerSync) are the deferred post-v1 fast-follow. NOT built here. [Source: architecture Invariant #2 line 55; deferred-work.md; Story 2-5]

### Scope boundary
- 2-4 = verify + document the cross-device read/freshness model and lock AC2 with an e2e. It builds no sync infra. The anon-map MERGE on sign-in is Story 2-8; the offline-write outbox + field-merge are post-v1.

### Project Structure Notes
- NEW: `e2e/sync.spec.ts` (the refetch-on-focus test). Likely NO production code change (the config + 2-7 already satisfy both ACs). VERIFY-ONLY: `app/providers.tsx`, `features/*/queries/*`, `features/map/components/MapCanvas.tsx`. No migration, no new dependency, no Realtime, no service role.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 55, 157, 160, 307 (server-of-truth + refetch; no Realtime v1; conflict model deferred)]
- [Source: app/providers.tsx; features/pins/queries/pins-queries.ts; features/regions/queries/region-marks-queries.ts; features/memories/queries/photos-queries.ts; features/map/components/MapCanvas.tsx]
- [Source: Stories 2-7 (returning-user sign-in — unblocks AC1), 2-6 (RLS-scoped full read set), 2-5 (addPin idempotency hardening; conflict-model deferral)]

### Resolved with Simon (2026-06-25)
1. **Verify-and-document scope:** both ACs are delivered by existing infra (2-7 sign-in + react-query refetch config). 2-4 adds no sync infra: a refetch-on-focus e2e + the documented model. Pull-to-refresh = browser reload (no gesture handler). Field-level-merge + offline outbox stay post-v1. The live two-device round-trip is a manual check gated on the Magic-Link email-template config (the 2-7 dependency).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

### Completion Notes List

- **Verify-and-document, NO production code.** Both ACs ride on existing infra: AC1 = 2-7 sign-in (correct uid via the `/auth/confirm` full reload) + RLS-scoped uid-keyed reads; AC2 = `app/providers.tsx` `refetchOnWindowFocus:true`/`staleTime:30_000` (inherited by the data queries) + browser reload (pull-to-refresh); "no Realtime" = absence (grep clean). The MapCanvas `[marks,pins]` effects repaint on changed data. Adversarial review confirmed no code gap.
- **Deliverable = the documented v1 sync model + `e2e/sync.spec.ts`** (account pins load in "去過的地方"; a reload surfaces another device's added pin — the refetch→render path). AC1's sign-in uid-continuity is covered by 2-7's code + the manual two-device round-trip (the anon-only harness can't sign in); a two-session RLS integration test is a documented follow-up.
- **Deferred (documented):** field-level-merge conflict model + offline-write outbox (PowerSync) stay post-v1; the anon-map merge is Story 2-8.
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build --webpack` clean · full e2e **67 passed, 1 skipped** (1 new sync test; the date-persist timing flake passed on retry).

### File List

- **NEW** `e2e/sync.spec.ts` — cross-device freshness test (account pins load; reload surfaces a new pin)
- _No production code changed — both ACs are satisfied by the existing 2-7 sign-in + react-query refetch config._

### Change Log

- 2026-06-25 — Verified + documented cross-device sync (Story 2.4): both ACs delivered by existing infra (2-7 sign-in + RLS reads for AC1; refetch-on-focus config + reload for AC2; no Realtime). Added the refetch→render e2e; documented the v1 sync model. Adversarial review: no production-code gap. **Closes Epic 2 for v1** (2-8 merge stays the deferred follow-up). Status → done.
- 2026-06-25 — Story created (context engine + 4-agent research workflow). Verify-and-document scope.
