---
baseline_commit: 260d5ec
---

# Story 5.3: Daily scheduler + send notification

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the system,
I want to send at most one curated memory notification per user per day,
so that the re-live loop stays welcome rather than naggy.

## Acceptance Criteria

1. **A Vercel Cron trigger runs the `on-this-day` job once daily.** `vercel.json` registers a single cron hitting `GET /api/on-this-day` at a fixed Taiwan-evening hour (`0 11 * * *` UTC = 19:00 Asia/Taipei). The route is **secret-guarded** (`Authorization: Bearer ${CRON_SECRET}`) and rejects anything else with 401 — it must never be publicly triggerable. Runs on the Node.js runtime (web-push needs Node crypto), `dynamic = "force-dynamic"`, no caching. [epics 5.3 AC1; architecture 164, 257, 282, 290, 306]
2. **For each notifiable user it computes one eligible memory and sends one web-push.** Using the **service role** (RLS-bypassing, server-only) it reads users with `notif_enabled = true`, and for each: their pins (→ `MemoryCandidate[]`), their `push_subscriptions`, and their ledger (`last_notified_at`, `last_rediscovery_at`); calls Story 5-2's `selectMemoryForDay(candidates, { today, lastRediscoveryAt, pick: <random> })`; if a memory is returned, sends one web-push to **each of that user's device subscriptions** with the composed payload. [epics 5.3 AC1; architecture 168-169; Story 5-2]
3. **Hard max one per day; the chosen memory is curated, the rest hinted.** A user already notified today (`last_notified_at` is today) is skipped — the daily ceiling holds across reruns/retries. The engine already returns exactly one winner (oldest, photos tiebreaker — Story 5-2) and `othersFromThisDayCount`; the payload names the one place and carries the "N more" hint for the 5-4 landing. [epics 5.3 AC2; EXPERIENCE 129, 131-132]
4. **Copy is specific memory text, never an engagement nag.** The push body is the memory itself — "{N} 年前的今天：{name}" (anniversary), "{N} 年前加入：{name}" (created tier), "重溫：{name}" (rediscovery) — no "you haven't opened Mapsake", no invented occasions, no streaks. The notification deep-links to the pin (`data.url = /?pin={pinId}`), which Story 5-1's `notificationclick` already opens; the real fly-to/glow landing is 5-4. [epics 5.3 AC2; EXPERIENCE 116, 122-127, 130, 136]
5. **The send is recorded and dead subscriptions are pruned.** After a successful send the user's `last_notified_at` is set to now (and `last_rediscovery_at` too when the chosen tier is `rediscovery`, gating the ≈monthly cadence in 5-2). A web-push `404`/`410` (subscription gone) deletes that `push_subscriptions` row; other send errors are logged and do not abort the whole run. [EXPERIENCE 125; architecture 164; web-push semantics]

### Decisions baked in (resolved with Simon, 2026-06-25)

- **Build now against gated config** (the 5-1 pattern). The code, the migration file, `vercel.json`, and `.env.example` placeholders land in-repo; **Simon** applies the migration, sets the secrets, and configures/deploys the cron. The real end-to-end send is verified via a gated manual checklist (it cannot run in CI: needs the service role, real VAPID keys, deployed cron, and live device subscriptions).
- **Ledger = two columns on `profiles`** (`last_notified_at`, `last_rediscovery_at`) — NOT a `notification_log` table. This satisfies the max-1/day guard and the monthly rediscovery cadence with one row per user. Rediscovery variety comes from a **random `pick`** over the older pool (Story 5-2's injected selection), not from history. A `notification_log` (audit + per-memory repeat-suppression) is the documented post-v1 upgrade — it slots in later by filtering recently-sent pins out of the candidate list, with no change to the pure engine.
- **`web-push` is a NEW dependency** (approved). `web-push@^3.6` + `@types/web-push` (dev). It is server-only; it must never be imported into client/edge code (it uses Node crypto).
- **Delivery timing = one fixed Taiwan-evening cron.** Per-user delivery time + global-off UI is Story 5-6 (`profiles.notif_time`/`notif_enabled` already exist; 5-3 honors `notif_enabled` for the on/off gate but uses the single fixed hour for v1). Locale-aware copy is post-v1 (zh-TW only now).

### Config dependencies — GATED TO SIMON (the real send can't be verified without these)

1. **Apply the ledger migration** (`supabase db push`) — adds `last_notified_at` + `last_rediscovery_at` to `profiles`. Then `supabase gen types typescript --linked` to replace the hand-added type bridge.
2. **Set the secrets** (`.env.local` + Vercel, server-only — NEVER client-exposed, NEVER committed): `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` (the public half + `.env.example` placeholder already landed in 5-1), and `CRON_SECRET` (any high-entropy string; Vercel sends it as the cron's `Authorization: Bearer`).
3. **Configure + deploy the cron:** `vercel.json` ships the schedule; confirm the Cron Job appears in the Vercel dashboard after deploy (cron runs only on deployed Vercel, not locally).
4. **Verify end-to-end:** with a subscribed device (Story 5-1) holding a dated/older pin, trigger the route manually (`curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/on-this-day`), confirm a native notification arrives, tapping it opens the pin, `last_notified_at` is set, and a second immediate trigger sends nothing (the daily ceiling).

## Tasks / Subtasks

- [x] **Task 1 — Ledger migration + type bridge (AC: 5)** [supabase/migrations/<ts>_add_notification_ledger.sql (NEW), types/supabase.ts (MOD)]
  - [x] `alter table public.profiles add column last_notified_at timestamptz, add column last_rediscovery_at timestamptz;` (both nullable, no default). No new RLS policy — only the service role writes these; the existing owner-select already covers reads. DO NOT apply (Simon pushes).
  - [x] Hand-add `last_notified_at: string | null` + `last_rediscovery_at: string | null` to `profiles` Row/Insert/Update in `types/supabase.ts` (bridge until Simon regenerates).
- [x] **Task 2 — Service-role admin client (AC: 2)** [lib/supabase/admin.ts (NEW)]
  - [x] `createAdminClient()` → `createClient<Database>(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })` from `@supabase/supabase-js`. Throw a clear error if `SUPABASE_SERVICE_ROLE_KEY` is missing. Header comment: **SERVER-ONLY, RLS-BYPASSING — never import from client/edge code; the only sanctioned use is the scheduled `on-this-day` job.** [architecture 154, 282]
- [x] **Task 3 — Admin data access (AC: 2, 5)** [data/notifications.ts (NEW)]
  - [x] Server-only module (imports the admin client). `listNotifiableUsers()` → users with `notif_enabled = true` plus their `last_notified_at`/`last_rediscovery_at`. `getUserPins(userId)` → that user's pins as `MemoryCandidate[]` (snake→camel; `hasPhotos` left undefined → the engine's `exifTakenAt != null` proxy, OR a photo-count join if cheap). `getUserSubscriptions(userId)` → `[{ endpoint, p256dh, auth }]`. `recordNotified(userId, { rediscovery })` → set `last_notified_at = now()` (+ `last_rediscovery_at = now()` when rediscovery). `deleteSubscription(endpoint)` → prune a dead device. Mirrors the snake↔camel boundary rule; these are the ONLY all-users reads in the app and they live behind the service role.
- [x] **Task 4 — Push payload builder (AC: 3, 4)** [features/notifications/lib/push-copy.ts (NEW)]
  - [x] PURE `buildPushPayload(memory: EligibleMemory): { title: string; body: string; url: string }` — `title = "Mapsake"`; `body` by tier (anniversary `${yearsAgo} 年前的今天：${name}`; created `${yearsAgo} 年前加入：${name}`; rediscovery `重溫：${name}`); append a "N more" hint when `othersFromThisDayCount > 0` (draft: `（這天還有 ${n} 個回憶）`); `url = "/?pin=" + pinId`. zh-TW drafts, native pass in 6-1. NO i18n lib, NO Date — pure string composition (the one CI-testable unit).
- [x] **Task 5 — web-push send wrapper (AC: 2, 5)** [lib/push/send.ts (NEW)]
  - [x] Server-only wrapper over `web-push`: configure VAPID once (`webpush.setVapidDetails("mailto:<contact>", NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)`); `sendPush(sub, payloadJson)` → `webpush.sendNotification({ endpoint, keys: { p256dh, auth } }, payloadJson)`. Return a discriminated result `{ ok: true } | { ok: false, stale: boolean }` where `stale = statusCode === 404 || 410` (caller prunes); rethrow/log other errors without aborting the run. Add `web-push` + `@types/web-push` to package.json (pnpm).
- [x] **Task 6 — Orchestration (AC: 2, 3, 5)** [features/notifications/lib/on-this-day.ts (NEW)]
  - [x] `runOnThisDay({ today, now, random })` (deps injected for purity at the edges): for each `listNotifiableUsers()` user, skip if `last_notified_at` is already `today` (the ceiling); build candidates + subscriptions; `selectMemoryForDay(candidates, { today, lastRediscoveryAt, pick: randomPick(random) })`; if null, continue; else `buildPushPayload`, `sendPush` to each subscription (prune on `stale`), and if at least one send succeeded `recordNotified(userId, { rediscovery: memory.tier === "rediscovery" })`. Return a summary `{ usersConsidered, notified, pushesSent, pruned }`. Per-user try/catch so one failure doesn't sink the batch.
- [x] **Task 7 — Cron route (AC: 1)** [app/api/on-this-day/route.ts (NEW), vercel.json (NEW), .env.example (MOD)]
  - [x] `export const runtime = "nodejs"; export const dynamic = "force-dynamic";` (+ `maxDuration` if needed). `GET(req)`: reject unless `req.headers.get("authorization") === "Bearer " + process.env.CRON_SECRET` (401; also 401 if `CRON_SECRET` unset, so it's never open). Compute `today`/`now` from the server clock (UTC date) + a real RNG, call `runOnThisDay`, return `NextResponse.json(summary)`. `vercel.json`: `{ "crons": [{ "path": "/api/on-this-day", "schedule": "0 11 * * *" }] }`. Add `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` (server-only) to `.env.example`.
- [x] **Task 8 — Tests + validation (AC: 3, 4)** [e2e/push-copy.spec.ts (NEW)]
  - [x] Unit (rollup pattern, Node): `buildPushPayload` for each tier (anniversary/created/rediscovery) — correct body text, `yearsAgo` interpolation, the `othersFromThisDayCount > 0` hint vs none, and `url === "/?pin=" + pinId`. (The service-role reads, web-push send, cron auth, and the daily ceiling need the gated manual checklist — dev SW off, service role, deployed cron.)
  - [x] No-regression: `tsc` + `lint` + `pnpm build` clean with the type bridge + the new dep; full `pnpm test:e2e` green. The admin client / web-push must not be pulled into any client bundle (build stays clean; route is server-only).

## Dev Notes

### Security — the secret-heavy story (read carefully)
- **Service role bypasses RLS.** `lib/supabase/admin.ts` is the ONLY place it is used, behind the cron route. Never import it from a client component, an anon `data/*` module, or edge code. `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET` are server-only — never `NEXT_PUBLIC_*`, never committed, only in `.env.local` + Vercel. [architecture 154, 282; standing security constraint]
- **The cron route must be unauthenticated-proof.** Vercel sends `Authorization: Bearer ${CRON_SECRET}` for cron invocations; the handler 401s anything else, INCLUDING when `CRON_SECRET` is unset (fail closed). Without this the job is a public "spam every user" button. [Vercel Cron security model]
- The route reads ALL users — this is the one place that legitimately does. It is gated by the secret and runs server-side only.

### Reuse, don't reinvent
- **Story 5-2's engine is the brain** — `selectMemoryForDay` already does tier selection, mute exclusion, the oldest+photos tiebreaker, and the rediscovery cadence (given `lastRediscoveryAt`). 5-3 only FEEDS it (candidates + today + lastRediscoveryAt + a random `pick`) and ACTS on its output. Do not re-implement tier logic. [Source: features/notifications/lib/eligibility.ts]
- **Story 5-1's pieces:** `push_subscriptions` (endpoint/p256dh/auth) is the send target; the SW `push`+`notificationclick` handlers already render the payload and open `data.url`; the VAPID public key + `VAPID_PRIVATE_KEY` placeholder already exist. 5-3's payload `{ title, body, url }` MUST match the SW's contract (`app/sw.ts` reads `payload.title/body`, `data.url`). [Source: app/sw.ts, data/push.ts, supabase/migrations/...init_push_subscriptions.sql]
- **Route convention:** plain `export async function GET` returning `NextResponse` (see `app/auth/confirm/route.ts`). The data-boundary rule (snake↔camel in `data/*`) holds for the admin reads too — put them in `data/notifications.ts`, not inline in the route. [Source: app/auth/confirm/route.ts; architecture 188, 282]

### web-push specifics (current)
- `web-push@^3.6`. `setVapidDetails(subject, publicKey, privateKey)` once per process; `sendNotification(subscription, payload)` where `subscription = { endpoint, keys: { p256dh, auth } }` and `payload` is a JSON string. On failure it throws `WebPushError` with `.statusCode`: **404/410 = gone → prune**; 429 = backoff (log for v1); 413 = payload too big (keep copy short). Node runtime required (Node crypto). [web-push README]
- Vercel Cron: declared in `vercel.json` `crons[]`; Hobby allows daily schedules and a small number of jobs — one daily evening job fits. Cron invocations only happen on the deployed Vercel project, not `next dev`/`next start` locally — hence the gated manual trigger via `curl`. [Vercel Cron docs]

### Delivery time / timezone
- v1: a single fixed UTC cron (`0 11 * * *`) ≈ 19:00 Asia/Taipei (zh-TW audience, UTC+8) — the "quiet couch re-live" evening (EXPERIENCE 133). The engine compares UTC calendar dates (Story 5-2 note). Per-user `notif_time` + tz is Story 5-6; `profiles.notif_time` already exists but 5-3 does not read it yet. [Source: EXPERIENCE 133; profiles schema; Story 5-2 tz note]

### Scope guardrails (what NOT to do)
- NO fly-to/glow/open-memory landing or "N more" rendering — that's 5-4 (5-3 only emits `url` + the hint count). NO free wandering (5-5). NO mute UI / delivery-time picker / global-off UI (5-6; 5-3 only READS `notif_enabled` as the gate). NO `notification_log` table. NO per-user timezone. NO i18n/en copy.

### Project Structure Notes
- NEW: `supabase/migrations/<ts>_add_notification_ledger.sql`, `lib/supabase/admin.ts`, `data/notifications.ts`, `features/notifications/lib/push-copy.ts`, `lib/push/send.ts`, `features/notifications/lib/on-this-day.ts`, `app/api/on-this-day/route.ts`, `vercel.json`, `e2e/push-copy.spec.ts`. MOD: `types/supabase.ts` (bridge), `.env.example` (service-role + CRON_SECRET), `package.json` (web-push). Migration apply + secrets + cron deploy + end-to-end verify gated to Simon.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3 (lines 383-387)]
- [Source: architecture.md lines 154 (service role server-side only), 157 (serverless scheduler/push send), 164 (Vercel Cron + web-push + VAPID + per-device subs), 168-169 (eligibility tiers), 257 (`/api/on-this-day/route.ts`), 282 (API routes only for secret/scheduled work), 290, 306]
- [Source: EXPERIENCE.md lines 116-136 (max 1/day, oldest+photos tiebreak, specific memory text never a nag, evening default, deep-link to map+memory)]
- [Source: features/notifications/lib/eligibility.ts (5-2 engine signature), app/sw.ts (payload contract), data/push.ts + push_subscriptions migration (5-1), app/auth/confirm/route.ts (route convention), lib/supabase/server.ts (client pattern)]

### Dependencies / handoffs
- **From 5-2:** `selectMemoryForDay`, `MemoryCandidate`, `EligibleMemory`, `REDISCOVERY_*` constants.
- **From 5-1:** `push_subscriptions`, the SW payload contract, the VAPID public key.
- **To 5-4:** the notification's `data.url = /?pin={pinId}` + `othersFromThisDayCount` are what 5-4 consumes to fly-to/glow/open + render "N more from this day".

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `pnpm build` first failed: Next 16 with `cacheComponents` enabled rejects an explicit `export const runtime` on a route handler. Removed `runtime`/`dynamic` segment configs — route handlers default to the Node.js runtime (web-push's Node crypto works), and reading the `Authorization` header makes the handler inherently dynamic (built as `ƒ /api/on-this-day`). Rebuilt clean.
- `tsc`/`lint` clean; full `pnpm test:e2e`: 94 passed, 1 skipped (pre-existing), 1 flaky (`memory.spec.ts:130`, an optional-date timing flake unrelated to 5-3 — passed on retry; 5-3 adds no browser behavior).
- `web-push@3.6.7` + `@types/web-push@3.6.4` installed (Simon-approved dependency).

### Completion Notes List

- **Secret surface, contained.** The service role lives only in `lib/supabase/admin.ts` (throws if the key is missing) and is reached only by `data/notifications.ts` → the orchestration → the cron route. `web-push` is reached only by `lib/push/send.ts`. The build registers the route as a server-only dynamic function; nothing leaks into a client bundle.
- **Fail-closed auth.** The route 401s unless `Authorization` equals `Bearer ${CRON_SECRET}`, AND when `CRON_SECRET` is unset — so it's never publicly triggerable.
- **Engine reuse.** No tier logic re-implemented: the loop feeds `selectMemoryForDay` (5-2) candidates + today + `lastRediscoveryAt` + a *random* `pick` (rediscovery variety without a history table) and acts on the single result. Max-1/day is a ledger-date skip + the engine's single return.
- **Resilience.** Per-user try/catch (one failure never sinks the batch); `last_notified_at` is stamped only when a push actually went out (a user with only dead devices is retried next run, not silently marked done); web-push 404/410 prunes the dead subscription.
- **Pure edges.** `buildPushPayload` is pure + unit-tested (7 cases); the clock/RNG enter only at the route and are injected into the orchestration.
- **GATED TO SIMON (reported at close — the real send cannot run in CI):** apply `20260625130000_add_notification_ledger.sql` + regenerate types (replaces the bridge); set server-only `SUPABASE_SERVICE_ROLE_KEY` + `VAPID_PRIVATE_KEY` + `CRON_SECRET` (+ optional `VAPID_SUBJECT`) in `.env.local`/Vercel; deploy so the `vercel.json` cron registers; verify end-to-end (`curl -H "Authorization: Bearer $CRON_SECRET" .../api/on-this-day` → native notification, ledger stamped, second trigger sends nothing).

### File List

- `supabase/migrations/20260625130000_add_notification_ledger.sql` (NEW)
- `types/supabase.ts` (MOD — profiles ledger columns bridge)
- `lib/supabase/admin.ts` (NEW)
- `data/notifications.ts` (NEW)
- `features/notifications/lib/push-copy.ts` (NEW)
- `lib/push/send.ts` (NEW)
- `features/notifications/lib/on-this-day.ts` (NEW)
- `app/api/on-this-day/route.ts` (NEW)
- `vercel.json` (NEW)
- `.env.example` (MOD — service-role + CRON_SECRET + optional VAPID_SUBJECT)
- `package.json` / `pnpm-lock.yaml` (MOD — web-push + @types/web-push)
- `e2e/push-copy.spec.ts` (NEW)

### Change Log

- 2026-06-25 — Story created (context engine; grounded in epics 5.3 + architecture 164/257/282 + EXPERIENCE 116-136 + the live 5-1/5-2 code). Scope: the daily cron sender — service-role read of all notifiable users, per-user call into 5-2's engine, one web-push each, ledger record + stale-subscription prune. Ledger = two `profiles` columns (per Simon). New dep `web-push` (approved). Migration apply, secrets (service role / VAPID private / CRON_SECRET), cron deploy, and the end-to-end send are gated to Simon.
- 2026-06-25 — Dev-story complete. 8 tasks: ledger migration + bridge, admin client, admin data access, pure payload builder (7 tests), web-push wrapper, orchestration, cron route + vercel.json + env. tsc/lint/build clean; full e2e green (94 passed). Status → review.
- 2026-06-25 — Adversarial review (3 dimensions × skeptic verify, security-weighted): 0 false positives, 2 confirmed findings, both fixed. Re-validated tsc/lint/build/e2e green. Status → done.

## Senior Developer Review (AI)

**Reviewed:** 2026-06-25 · **Outcome:** Changes Requested → both addressed · 3 dimensions (security/secret-containment, send-loop correctness, integration/config), each finding hand-traced by an independent skeptic. 0 false positives. Security dimension confirmed clean: service role + web-push reachable only server-side, the build registers `/api/on-this-day` as a server function, no secret is `NEXT_PUBLIC_`/committed, and the route fails closed.

### Action Items
- [x] **[Med] Transient send error aborted a user's remaining devices and skipped the ledger stamp → same-day duplicate-push window.** `sendPush` rethrew any non-404/410 error, escaping the per-device loop before the `if (anySent)` stamp; a cron retry then re-sent to the already-notified device. **Fixed:** `sendPush` now returns `{ ok:false, stale }` for every failure (never throws on a send error; logs transient ones); the orchestration sends to all devices, stamps the ledger if any succeeded, then prunes dead endpoints — so neither a flaky device nor a prune write can skip the stamp.
- [x] **[Low] Cron auth used non-constant-time `!==`.** Fail-closed logic was already correct; hardened to `crypto.timingSafeEqual` with a length check, keeping the `!secret` short-circuit so an unset secret still 401s before any compare.
