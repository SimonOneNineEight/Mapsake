---
baseline_commit: 84ddac6
---

# Story 5.1: Push subscription & permission

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to enable memory notifications,
so that my places can resurface.

## Acceptance Criteria

1. **Grant permission → a VAPID web-push subscription is stored per device.** On an explicit tap of an enable affordance, request OS notification permission; on grant, `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID public> })` and persist the subscription (endpoint UNIQUE, p256dh, auth) per device in `push_subscriptions`, RLS-scoped to the user. [epics 5.1 AC1; architecture AR9, data-model lines 139-140]
2. **The service worker handles incoming push and shows a native OS notification.** `app/sw.ts` gains a `push` listener that parses the payload and calls `showNotification`, plus a BASIC `notificationclick` (open the app). The real deep-link landing is Story 5-4. [epics 5.1 AC2; architecture line 290]
3. **iOS requires the installed PWA (Epic 4).** On iOS not running standalone, the affordance routes to the install path (reuse the 4-5 nudge) instead of a broken subscribe; web push needs the home-screen PWA on iOS 16.4+. [epics 5.1 AC3; architecture line 44]

### Decisions baked in (from the 4-agent context analysis, 2026-06-25)

- **RLS insert via `data/push.ts`, NOT a service-role route.** Storing your OWN subscription is an owner-scoped insert under the anon key (the data-boundary pattern, like `pins`/`marks`/`photos`). NO `app/api/push/subscribe` route, NO service role in 5-1. The service role + `web-push` lib enter only in **Story 5-3** (the cron reads ALL subscriptions to send). (Corrects an over-specification in the analysis.)
- **Scope = subscribe + store + the SW receive/show half ONLY.** OUT: sending (5-3, Vercel Cron + `web-push` + VAPID private key), eligibility (5-2), the notificationclick deep-link fly-to/glow/open-memory (5-4 — 5-1's `notificationclick` is a basic open), free wandering (5-5), mute/delivery-time/global-off (5-6). 5-1 produces NO user-visible resurfacing yet.
- **Affordance in the account sheet's signed-in body** (beside 2-6 export + 登出), decoupled via a `features/notifications` hook so Settings (6-3) re-mounts it. Signed-in only (a subscription must attach to a durable account). **Capability-gated:** iOS-not-standalone → the 4-5 install line; no Push API → omit; granted → calm confirmed state; denied → calm "enable in browser settings" (never re-prompt, never scold). Ask OS permission ONLY on the explicit tap (never on load).

### Config dependencies — GATED TO SIMON (the real round-trip can't be verified without these)

1. **Apply the new migration** (`supabase db push` to the hosted project) — a production schema change. The agent writes `supabase/migrations/<ts>_init_push_subscriptions.sql` in-repo; Simon pushes it.
2. **Regenerate types** after the migration: `supabase gen types typescript --linked` → `types/supabase.ts` (strip the trailing PostHog telemetry line after the final `} as const`). 5-1 hand-adds the `push_subscriptions` type to `types/supabase.ts` as a BRIDGE so the code compiles now; Simon's regen replaces it with the authoritative version (they must match the migration).
3. **Generate + set VAPID keys:** `npx web-push generate-vapid-keys` → put `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` in `.env.local` (and Vercel). The agent adds placeholders to `.env.example`. The private key is server-only (for 5-3); only the public key is client-exposed.
4. **Verify on a production build + installed PWA:** the SW is DISABLED in dev (`next.config` `disable: NODE_ENV==="development"`), so the subscribe flow + the `push` handler only work under `pnpm build --webpack && pnpm start`. Test by installing the PWA, tapping enable, granting, then firing a test push (DevTools Application → Service Workers → Push, or a throwaway `web-push` call) and confirming a native notification. iOS needs the home-screen PWA.

## Tasks / Subtasks

- [x] **Task 1 — `push_subscriptions` migration + type bridge (AC: 1)** [supabase/migrations/<ts>_init_push_subscriptions.sql (NEW), types/supabase.ts (MOD)]
  - [x] NEW migration modeled on `20260622120000_init_pins.sql`: `push_subscriptions` (`id uuid pk default gen_random_uuid()`, `user_id uuid not null references public.profiles(id) on delete cascade`, `endpoint text not null unique`, `p256dh text not null`, `auth text not null`, `created_at timestamptz not null default now()`). Enable RLS + the four owner policies `push_subscriptions_owner_{select,insert,update,delete}` using `user_id = (select auth.uid())`. Index on `user_id`. (Per-device = one row per endpoint.) DO NOT apply it — Simon pushes (gated).
  - [x] Hand-add the `push_subscriptions` Row/Insert/Update to `types/supabase.ts` (bridge so `data/push.ts` compiles before the migration is applied); matches the migration columns. Note: Simon's `supabase gen types --linked` replaces this after applying.
- [x] **Task 2 — `data/push.ts` boundary (AC: 1)** [data/push.ts (NEW)]
  - [x] `upsertPushSubscription({ endpoint, p256dh, auth })`: `getUser()` for `user_id` (never trust a client uid), `supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" })` (re-subscribe / key rotation overwrites the same device row), throw on error. Snake↔camel mapping, mirroring `data/pins.ts`/`data/region-marks.ts`. RLS-scoped (anon key, owner insert) — NO service role.
- [x] **Task 3 — VAPID key util (AC: 1)** [lib/push/vapid-key.ts (NEW)]
  - [x] `urlBase64ToUint8Array(base64url: string): Uint8Array` — the standard converter (replace `-`→`+`, `_`→`/`, pad `=`, `atob`, fill a `Uint8Array`). Pure, unit-tested (the one CI-testable piece). `applicationServerKey` needs a `Uint8Array`, NOT the raw string (the most common silent failure). (Returns `Uint8Array<ArrayBuffer>` so it satisfies the TS 5.7 `applicationServerKey` BufferSource type.)
- [x] **Task 4 — Subscribe hook (AC: 1, 3)** [features/notifications/hooks/use-push-subscribe.ts (NEW)]
  - [x] `"use client"` hook (modeled on `use-export.ts` + the mode union from `use-install-prompt.ts`). Exposes `state: unsupported | ios-needs-install | default | granted | denied | loading` + `enable()` + `isPending`/`isError` (pending/error via the mutation rather than baked into the union). On the enable gesture: `Notification.requestPermission()`; not-granted → calm `denied`/`default` (no throw); `navigator.serviceWorker.ready` → `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(NEXT_PUBLIC_VAPID_PUBLIC_KEY) })` → `sub.toJSON()` → `upsertPushSubscription(...)` → `granted`. Capability + current `Notification.permission` resolved on mount (never asks there); iOS-not-standalone (Push API absent) → `ios-needs-install`.
- [x] **Task 5 — SW push + basic notificationclick (AC: 2)** [app/sw.ts (MOD)]
  - [x] Added `self.addEventListener("push", ...)` → `self.registration.showNotification(payload.title ?? "Mapsake", { body, icon: "/icons/icon-192.png", badge, data: { url } })` reading `event.data?.json()` (text fallback); and a BASIC `notificationclick` (`close()` + `clients.openWindow(data?.url ?? "/")`). Coexists with `serwist.addEventListeners()`. Payload contract `{ title, body, url }` documented for 5-3/5-4.
- [x] **Task 6 — Enable affordance in the account sheet (AC: 1, 3)** [features/auth/components/account-sheet.tsx (MOD), .env.example (MOD), features/notifications/components/enable-notifications.tsx (NEW)]
  - [x] Extracted the affordance into `EnableNotifications` (so Settings 6-3 re-mounts it) and rendered it in the `signedIn` body between export and 登出. Renders the mode states (loading/unsupported → null; ios-needs-install → install line; granted/denied → calm copy; default → the enable link with pending/error). Quiet terracotta-link styling. Added `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + a server-only `VAPID_PRIVATE_KEY` placeholder (noting it's the 5-3 sender's) to `.env.example`. zh-TW drafts as specified (native pass in 6-1).
- [x] **Task 7 — Tests + validation (AC: 1, 2, 3)** [e2e/push.spec.ts (NEW)]
  - [x] Unit (Node, the rollup pattern): `urlBase64ToUint8Array` decodes 5 hand-verified cases — plain, URL-safe `_`, URL-safe `-` + one `=`, two `=` padding, and the Uint8Array-instance/length contract.
  - [x] No-regression: `tsc` + `lint` + `pnpm build --webpack` (SW bundled) all clean with the type bridge; full e2e green (73 passed, 1 pre-existing skip), the new push.spec included. The account-sheet affordance left the anon body + auth/export/sync tests untouched.

## Dev Notes

### Storage = RLS insert, not a route (the corrected design)
- `data/push.ts upsertPushSubscription` writes the user's own row under RLS via the anon client (`getUser()` for `user_id`, `upsert onConflict: "endpoint"`), exactly like `addPin`/`addRegionMark`. NO `app/api/push/subscribe` route and NO service role — those aren't needed to store your own subscription. The service role + `web-push` belong to Story 5-3's cron sender (which reads ALL users' subscriptions). [Source: data/pins.ts, data/region-marks.ts; architecture lines 112, 281]

### Service worker (extend Serwist, don't replace)
- `app/sw.ts` is the Epic-4 Serwist worker (`self` typed `ServiceWorkerGlobalScope`, ends in `serwist.addEventListeners()`). Add the `push` + `notificationclick` listeners alongside — Serwist owns fetch/install/activate; these native events are independent. The `notificationclick` is a basic open in 5-1; the real deep-link (fly-to + glow + open-memory) is 5-4 (same file — flag for sequencing). The SW is excluded from the root tsconfig and built via `@serwist/next` (`--webpack`). [Source: app/sw.ts; next.config; architecture line 290]
- **SW disabled in dev:** `next.config` `disable: NODE_ENV==="development"`, so `navigator.serviceWorker.ready` never resolves under `next dev`. The enable flow + push only work on a production build. The affordance must fail calmly (not hang) when no active SW exists.

### iOS gate (Epic 4 dependency)
- iOS Safari has Push only in an installed home-screen PWA on 16.4+; `PushManager` is absent in a normal tab. Reuse `features/onboarding/lib/use-install-prompt.ts`'s iOS/standalone detection: iOS-not-standalone → show the 4-5 install line, don't attempt subscribe. [Source: use-install-prompt.ts; architecture line 44; Story 4-5]

### Permission UX (calm, gesture-only)
- EXPERIENCE.md: the push-enable is a quiet rider on a user-initiated moment, "never a gate or a nag" (line 22); "No engagement nags ever … A notification is a real memory resurfacing" (line 130); evening default (line 133); global off lives in Settings (line 135, → 5-6/6-3). Ask `Notification.requestPermission()` ONLY from the tap. Denied is calm + self-serve (never re-prompt). [Source: EXPERIENCE.md lines 22, 45-48, 116-136]

### Project Structure Notes
- NEW: `supabase/migrations/<ts>_init_push_subscriptions.sql`, `data/push.ts`, `lib/push/vapid-key.ts`, `features/notifications/hooks/use-push-subscribe.ts`, a pure test. MOD: `types/supabase.ts` (bridge), `app/sw.ts` (push handlers), `features/auth/components/account-sheet.tsx` (affordance), `.env.example` (VAPID placeholders). No new runtime dependency in 5-1 (`web-push` is 5-3). Migration apply + VAPID + prod-build verify are gated to Simon.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1; AR9 line 74; data-model lines 139-140]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 44, 112, 154, 164, 222, 257, 276, 281, 282, 290, 297]
- [Source: _bmad-output/planning-artifacts/ux-designs/.../EXPERIENCE.md lines 22, 45-48, 67, 116-136]
- [Source: app/sw.ts; next.config; app/manifest.ts; features/onboarding/lib/use-install-prompt.ts; features/auth/components/account-sheet.tsx; data/{pins,region-marks}.ts; features/settings/hooks/use-export.ts]
- [Source: Stories 4-5 (Serwist SW + install nudge), 2-6 (account-sheet affordance pattern + hook decoupling)]

### Resolved with Simon (2026-06-25)
1. **Scope = subscribe + store + SW receive only;** RLS insert (no service-role route — that's 5-3's sender). Affordance in the account sheet (decoupled for 6-3). The migration apply, VAPID keys, type regen, and the prod-build/installed-PWA round-trip are gated to Simon (the code lands against them; the manual checklist verifies).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `tsc --noEmit`: one error — TS 5.7 makes `Uint8Array` generic over its buffer, and `applicationServerKey` wants `Uint8Array<ArrayBuffer>` (not `<ArrayBufferLike>`, which admits `SharedArrayBuffer`). Fixed at the source by annotating `urlBase64ToUint8Array`'s return as `Uint8Array<ArrayBuffer>` (the `new Uint8Array(len)` it builds is already fresh-buffer-backed). Re-ran clean.
- `pnpm build --webpack`: clean; Serwist re-bundled `/sw.js` with the new push/notificationclick listeners (SW tsconfig accepts `self.registration`/`self.clients`/`event.notification`).
- `pnpm test:e2e`: 73 passed, 1 skipped (pre-existing), incl. the 5 new `push.spec.ts` cases.

### Completion Notes List

- **Storage is an RLS owner insert, not a route** (`data/push.ts upsertPushSubscription`, anon client, `getUser()` for `user_id`, `upsert onConflict:"endpoint"`). No `app/api/push/subscribe`, no service role — those are Story 5-3's sender.
- **Permission asked only on the tap.** The hook resolves capability + existing `Notification.permission` on mount (a named `detect()` call inside the effect to avoid the `set-state-in-effect` lint) but never prompts there. Denied/dismissed is a calm terminal state, not an error (no throw, no re-prompt).
- **Affordance decoupled** into `features/notifications/components/enable-notifications.tsx` so Settings (6-3) can re-mount the exact surface; the account sheet just renders `<EnableNotifications />` in the signed-in body.
- **iOS gate:** iOS Safari (not a home-screen PWA) has no `PushManager`, so the support guard would read "unsupported"; the hook checks iOS-Safari-not-standalone FIRST and returns `ios-needs-install` → the install line, not a dead end.
- **The `pushManager.getSubscription()` "already subscribed → granted" reflection was not separately needed:** `Notification.permission === "granted"` already drives the granted state on mount, and a re-tap upserts the same endpoint row idempotently. Left out to keep the mount path free of an extra `serviceWorker.ready` await that never resolves under the dev SW.
- **GATED TO SIMON (cannot verify the real round-trip without these — reported at story close):**
  1. `supabase db push` to apply `20260625120000_init_push_subscriptions.sql` (production schema change).
  2. `supabase gen types typescript --linked` to replace the hand-added `push_subscriptions` type bridge in `types/supabase.ts` with the authoritative version (strip the trailing PostHog line).
  3. `npx web-push generate-vapid-keys` → set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + (server-only) `VAPID_PRIVATE_KEY` in `.env.local` and Vercel.
  4. Prod-build + installed-PWA verification (dev SW is disabled): install, tap enable, grant, fire a test push (DevTools → Service Workers → Push, or a throwaway `web-push` call), confirm a native notification. iOS needs the home-screen PWA on 16.4+.

### File List

- `supabase/migrations/20260625120000_init_push_subscriptions.sql` (NEW)
- `types/supabase.ts` (MOD — `push_subscriptions` type bridge)
- `data/push.ts` (NEW)
- `lib/push/vapid-key.ts` (NEW)
- `features/notifications/hooks/use-push-subscribe.ts` (NEW)
- `features/notifications/components/enable-notifications.tsx` (NEW)
- `app/sw.ts` (MOD — push + notificationclick listeners)
- `features/auth/components/account-sheet.tsx` (MOD — renders `<EnableNotifications />`)
- `.env.example` (MOD — VAPID placeholders)
- `e2e/push.spec.ts` (NEW)

### Change Log

- 2026-06-25 — Story created (context engine + 4-agent research workflow), first story of Epic 5. Scope: client subscribe (RLS via data/push.ts, no service route) + the SW push/show handler. Migration + VAPID + prod-build verify gated to Simon. Corrected the analysis's service-role over-spec; confirmed no push_subscriptions migration exists yet.
- 2026-06-25 — Dev-story complete. All 7 tasks implemented; tsc/lint/build/e2e green (73 passed). Affordance extracted to `features/notifications/components/enable-notifications.tsx` (decoupled for 6-3). Status → review.
- 2026-06-25 — Adversarial code review (4 dimensions × skeptic verify): 0 false positives, 2 confirmed findings, both fixed in `use-push-subscribe.ts`. Re-validated tsc/lint/build/e2e green.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Changes Requested → both addressed · 4 review dimensions (web-push correctness, security/data-boundary, requirements/scope, React/Next lifecycle), each finding adversarially verified by an independent skeptic (default-refute). 0 false positives surfaced.

### Action Items
- [x] **[Med] subscribe mutation hung forever when `serviceWorker.ready` never resolves** (dev SW off, or a stalled prod registration). `"serviceWorker" in navigator` is true in dev, so the capability gate passed, permission was granted, then `await navigator.serviceWorker.ready` never settled → `isPending` stuck, the calm `isError` retry unreachable. Violated the "fail calmly, not hang" guardrail. **Fixed:** raced `serviceWorker.ready` against a 5s timeout that rejects → the existing `isError` path.
- [x] **[Low] OS permission requested before the VAPID public key was validated.** With an unset `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the `.env.example` placeholder, a prod-only path), `urlBase64ToUint8Array("")` → empty array → `subscribe` throws after the irreversible grant was already consumed. **Fixed:** `detect()` now resolves to `unsupported` (affordance hidden) when no key is configured, so the prompt is never shown on a structurally-impossible subscribe.