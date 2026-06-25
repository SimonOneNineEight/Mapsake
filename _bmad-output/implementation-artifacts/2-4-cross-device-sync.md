# Story 2.4: Cross-device sync

Status: ready-for-dev

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

- [ ] **Task 1 — Verify AC1: the account's full map loads under the signed-in uid (AC: 1)** [no code — verify]
  - [ ] Confirm `usePins`/`useRegionMarks`/`usePhotos` are uid-keyed, `enabled: !!userId`, RLS-scoped, and that the MapCanvas effects re-render the fill/markers when `marks`/`pins` change. (Already proven by the rollup/pins specs + the 2-6 export RLS read.) The live two-device round-trip is a MANUAL check, gated on Simon's Supabase "Magic Link" email-template config (the same 2-7 dependency) so device-2 sign-in actually lands.
- [ ] **Task 2 — Verify AC2 + lock it with a refetch-on-focus e2e (AC: 2)** [e2e/sync.spec.ts (NEW)]
  - [ ] Confirm `app/providers.tsx` has `refetchOnWindowFocus: true` + `staleTime: 30_000` and the data queries inherit it (no override). Confirm there is NO Realtime subscription anywhere (grep `realtime`/`channel`/`subscribe`).
  - [ ] e2e proving refetch-on-focus: load the map (shared anon session); intercept the pins (or region_marks) LIST endpoint and count fetches, returning an ADDED row on later fetches; use Playwright's clock API to fast-forward past the 30s `staleTime` (avoid a real 30s wait), then dispatch a window focus / `visibilitychange`(hidden→visible); assert a refetch fires and the new row appears on the map. If the clock + focusManager interplay proves flaky, fall back to asserting (a) the config is present and (b) a full reload refetches and shows a server-side change — and note the focus-refetch as react-query's library-tested behavior. (Mirror the 2-5 interception style.)
- [ ] **Task 3 — Document the v1 sync model (AC: 1, 2)** [story Dev Notes / no code]
  - [ ] Record the model: server-of-truth + RLS-scoped reads; freshness via `refetchOnWindowFocus` + browser reload (pull-to-refresh); NO live Realtime in v1; the field-level-merge conflict model + offline-write outbox stay the documented post-v1 fast-follow (PowerSync). Note the manual two-device round-trip as the AC1 acceptance evidence (gated on the Magic-Link config).
  - [ ] No-regression: full e2e suite green; `tsc` + `lint` + `pnpm build --webpack` clean.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-06-25 — Story created (context engine + 4-agent research workflow). Verify-and-document: AC1 via 2-7 sign-in + RLS reads, AC2 via the existing refetch-on-focus config; deliverable = the documented v1 sync model + a refetch-on-focus e2e. No sync infra built (no Realtime, no migration). Closes Epic 2 for v1 (2-8 merge stays deferred).
