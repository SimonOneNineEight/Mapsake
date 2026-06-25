---
baseline_commit: f5e9c7f
---

# Story 5.6: Notification controls

Status: done

<!-- Note: One scope decision is flagged below (delivery-time depth). Confirm with Simon before
     dev-story; the Task breakdown assumes the recommended option (store-only). -->

## Story

As a user,
I want to control notifications,
so that they stay on my terms.

## Acceptance Criteria

1. **Mute a memory / its place → it never resurfaces via notification (still on the map).** From an open memory, a quiet toggle sets `pins.muted`; a muted pin is excluded from the re-live engine (already honored by Story 5-2 `selectMemoryForDay` + 5-3's read) but still renders on the map and opens normally. Unmuting restores it. [epics 5.6 AC1; EXPERIENCE 134]
2. **Turn notifications fully off — no dark patterns.** A global off switch sets `profiles.notif_enabled = false`; the sender (5-3 `listNotifiableUsers`) only sends to `notif_enabled = true`, so off means off, end to end. Plain, honest, reversible — no friction, no guilt copy. [epics 5.6 AC2; EXPERIENCE 135]
3. **Set delivery time.** A delivery-time control writes `profiles.notif_time`. (Depth is the open decision below.) [epics 5.6 AC2; EXPERIENCE 133]

### ⚠️ Scope decision — RESOLVED with Simon (2026-06-25): Option B, store-only

The delivery-time picker persists `profiles.notif_time`; the cron honoring per-user time (5-3 currently uses a fixed Taiwan-evening hour and does not read `notif_time`) is a **documented fast-follow**, logged to deferred-work. This meets "I can set delivery time" while keeping 5-6 a clean controls story (5-3 is not re-opened). Mute + global-off have NO fork (both columns exist and are already honored). Placement default (no fork): the global-off + time controls live in the account sheet's signed-in notifications area (beside the Story 5-1 `EnableNotifications`), decoupled so Settings (6-3) re-mounts them.

### Decisions baked in

- **Reuse existing columns + honoring.** `pins.muted` (engine already excludes it), `profiles.notif_enabled` (sender already gates on it), `profiles.notif_time` (exists). NO migration unless profiles' RLS lacks an owner self-update (verify — gated to Simon if missing).
- **Client-side profile access is NEW** (`data/profile.ts`, anon/RLS owner) — distinct from the service-role `data/notifications.ts`. Mute extends `updatePin` (it already owns the pin write).

## Tasks / Subtasks  (Option B confirmed: store-only delivery time)

- [x] **Task 1 — Mute toggle (AC: 1)** [data/pins.ts (MOD), features/pins/queries/pins-queries.ts (MOD), features/memories/components/memory-card.tsx (MOD)]
  - [x] Extend `updatePin` + `UpdatePinInput` to accept `muted?: boolean` (write it like note/memoryDate; optimistic patch in `useUpdatePin`). A muted pin must still render on the map (the `pins` source/layers don't filter on `muted` — confirm no change needed there).
  - [x] A quiet toggle in the memory card — mute: 「讓這個地方少出現」, unmuted state shows it's on; muted shows 「已靜音 · 點選恢復」 (drafts, 6-1 pass). Calm, reversible, no warning chrome.
- [x] **Task 2 — Client profile data + hook (AC: 2, 3)** [data/profile.ts (NEW), features/notifications/queries/profile-queries.ts (NEW)]
  - [x] `data/profile.ts` (anon client, RLS owner): `getProfileSettings()` → `{ notifEnabled, notifTime }` from the user's `profiles` row; `updateProfileSettings({ notifEnabled?, notifTime? })`. snake↔camel here. Verify the owner SELECT/UPDATE RLS on `profiles` permits this (if not, a gated migration adds the policy).
  - [x] `useProfileSettings()` query + `useUpdateProfileSettings()` mutation (optimistic, ack-gated, calm retry — mirror the pins pattern). Keyed by userId.
- [x] **Task 3 — Notification settings UI (AC: 2, 3)** [features/notifications/components/notification-settings.tsx (NEW), features/auth/components/account-sheet.tsx (MOD)]
  - [x] A `NotificationSettings` component (signed-in only, decoupled for 6-3): a global-off switch (notif_enabled) + [Option B] a delivery-time picker (notif_time, a `<input type="time">`), both calm; writes via the hook. Render it in the account sheet's signed-in body beside `EnableNotifications`. zh-TW drafts: 「接收回憶通知」(toggle) / 「傍晚送達時間」(time).
- [x] **Task 4 — Tests + validation (AC: 1, 2, 3)** [e2e + unit]
  - [x] Mute exclusion is already unit-tested (5-2 `selectMemoryForDay` excludes muted). Add: an e2e that mutes an open memory and asserts the pin still renders + the toggle reflects state; the profile settings round-trip is signed-in-only (not e2e-coverable with the anon harness) → a manual note, OR a pure mapper unit for `data/profile.ts` snake↔camel. tsc/lint/build clean; full e2e green.

## Dev Notes

### What's already honored (don't rebuild)
- **Mute:** `selectMemoryForDay` drops `muted` candidates (Story 5-2), and `data/notifications.getUserPins` carries `muted` to the sender (5-3). So toggling `pins.muted` is honored end to end the moment the column flips. The map render is independent of `muted` (pins layers filter on clustering/zoom, not mute) — a muted pin stays visible. [features/notifications/lib/eligibility.ts; data/notifications.ts]
- **Global off:** `listNotifiableUsers()` filters `notif_enabled = true` (Story 5-3). Setting it false stops the sends. [data/notifications.ts]
- **`profiles` already has** `notif_enabled` + `notif_time` (+ the 5-3 ledger columns). No new column needed; verify the owner RLS allows the user to update their own row.

### Wiring
- Mute rides the existing pin write: `updatePin` (`data/pins.ts`) + `useUpdatePin` optimistic cache patch (`features/pins/queries/pins-queries.ts`). Add `muted` to the input/patch only. [data/pins.ts:100-120; pins-queries.ts:103-126]
- The notifications UI lives in the account sheet's signed-in body (where `EnableNotifications` is, Story 5-1). Keep it a separate `features/notifications` component so Settings (6-3) re-mounts it. [features/auth/components/account-sheet.tsx signed-in body; features/notifications/components/enable-notifications.tsx]
- Client profile access is NEW and anon/RLS (NOT the service-role `data/notifications.ts`). [architecture data-boundary 282]

### Scope guardrails
- NO Settings SCREEN (that's 6-3 — these controls live in the account sheet for now, decoupled). NO region-level mute (per-memory `pins.muted` only). NO change to the sender unless Option C is chosen. NO new dependency.

### References
- [Source: epics.md#Story-5.6 (lines 401-405); EXPERIENCE.md 133-135 (delivery time, per-memory mute, global off, no dark patterns)]
- [Source: features/notifications/lib/eligibility.ts (muted exclusion), data/notifications.ts (notif_enabled gate + muted read), data/pins.ts + pins-queries.ts (updatePin), account-sheet.tsx + enable-notifications.tsx (5-1 notifications area), types/supabase.ts (profiles columns)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- Verified `profiles` already has `profiles_owner_{select,insert,update}` RLS (20260621120000_init) → no migration needed for client read/update.
- `relive.spec.ts`: 6/6 (incl. the new mute test — toggle flips, pin stays on the map). tsc/lint/build clean; full e2e 104 passed, 1 pre-existing skip, no flakes.

### Completion Notes List

- **Mute** rides the existing pin write: `updatePin`/`useUpdatePin` gained a `muted` field (optimistic, ack-gated, same as note/date). A quiet card toggle flips it; a muted pin stays on the map (the pin layers don't filter on `muted`) and is already excluded from re-live by 5-2/5-3. Hidden offline (it's a write).
- **Global off** + **delivery time** via a NEW client profile layer: `data/profile.ts` (anon, RLS owner — distinct from the service-role `data/notifications.ts`) + `useProfileSettings`/`useUpdateProfileSettings` (optimistic, rollback on error). `notif_enabled=false` is honored end to end by 5-3's `listNotifiableUsers`. `NotificationSettings` renders in the account sheet's signed-in body beside `EnableNotifications`, decoupled for Settings 6-3.
- **Delivery time = store-only (Simon's call).** The `<input type="time">` persists `notif_time`; the cron honoring a per-user time is logged to deferred-work (5-3 uses a fixed evening hour). The picker shows only when notifications are enabled.
- No migration (profiles RLS already allows owner self-update), no secrets, no new dep. The profile-settings UI is signed-in-only, so it's not e2e-coverable with the anon harness (the recurring signed-in gap) — manual verification; mute IS e2e-covered.

### File List

- `data/pins.ts` (MOD — `updatePin` accepts `muted`)
- `features/pins/queries/pins-queries.ts` (MOD — `UpdatePinInput.muted` + optimistic patch)
- `features/memories/components/memory-card.tsx` (MOD — mute toggle)
- `data/profile.ts` (NEW — client profile settings read/update, RLS owner)
- `features/notifications/queries/profile-queries.ts` (NEW — settings query + mutation)
- `features/notifications/components/notification-settings.tsx` (NEW — global off + delivery time)
- `features/auth/components/account-sheet.tsx` (MOD — renders `NotificationSettings`)
- `e2e/relive.spec.ts` (MOD — mute e2e)
- `_bmad-output/implementation-artifacts/deferred-work.md` (MOD — delivery-time cron-honoring fast-follow)

### Change Log

- 2026-06-25 — Story created (context engine; grounded in epics 5.6 + EXPERIENCE 133-135 + the live 5-1/5-2/5-3 wiring). Mute + global-off are fully honorable today (reuse existing columns + sender/engine). One open scope decision flagged (delivery-time depth) for Simon before dev. No migration unless profiles owner-RLS is missing.
- 2026-06-25 — Scope resolved with Simon: delivery-time = store-only (Option B).
- 2026-06-25 — Dev-story complete. Mute toggle (updatePin), client profile layer (data/profile.ts + queries), NotificationSettings in the account sheet; delivery-time stored, cron-honoring deferred. tsc/lint/build clean; full e2e 104 passed (mute e2e green). Status → review.
- 2026-06-25 — Adversarial review (3 dimensions × skeptic verify): 0 findings — clean. Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Approve · 3 dimensions (mute write/render, the profile-settings layer + RLS + time round-trip, global-off honoring + UI gating), each hand-traced by a skeptic. No findings — the mute partial-update is safe, the profile layer is anon/RLS-owner with a safe optimistic rollback, the `HH:MM`→time-column round-trip is sound, and `notif_enabled=false` is honored by the 5-3 sender. No action items.
