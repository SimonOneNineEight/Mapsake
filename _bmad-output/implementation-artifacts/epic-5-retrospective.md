# Epic 5 Retrospective — The re-live loop (retention)

**Date:** 2026-06-25 · **Outcome:** Epic complete in code (6 stories, 6 commits on `main`); production deploy gated to Simon. This retro is grounded in an **epic-level cross-story audit** (3 dimensions × adversarial verify, 17 agents) that found what the per-story reviews structurally could not.

## What shipped

| Story | Commit | What |
|---|---|---|
| 5-1 | `53839ed` | push subscription + permission + SW push/notificationclick |
| 5-2 | `260d5ec` | tiered eligibility engine (pure, unit-tested) |
| 5-3 | `7b5b54e` | daily Vercel-Cron sender (service role, web-push, ledger) |
| 5-4 | `5205ecf` | deep-link landing (fly + glow + open memory) |
| 5-5 | `f5e9c7f` | free wandering + "N more from this day" |
| 5-6 | `469a663` | controls: mute, global off, delivery time (store-only) |

## What went well

- **The per-story adversarial review caught real bugs before commit** — across the six stories the skeptics confirmed and we fixed ~9 genuine issues (a subscribe hang, a duplicate-push window, non-constant-time cron auth, a cluster-declutter miss, a stale-listener camera fight, a chip-gating leak, two missing-test gaps) and refuted false positives. 5-6 came back clean.
- **Build-against-gated-config worked again** (the 5-1 pattern): migrations + type bridges + env placeholders land in-repo; Simon applies the production/secret steps. The loop is fully CI-green without any live secrets.
- **Reuse over reinvention:** 5-4/5-5 rode the existing `selectedPinId`/glow/`updatePin` machinery; 5-5's cohort reused 5-2's `effectiveDate`. The pure engine (5-2) stayed the single source of date logic.

## What the epic-level audit found (the value of a cross-story pass)

The per-story reviews each saw ONE story; these are the seams between them. **14 confirmed, 0 refuted.**

### HIGH
1. **Tier-2 "EXIF anniversary" is dead in production.** Nothing writes `pins.exif_taken_at` — the photo pipeline writes `photos.taken_at` per-photo (Epic 3) but never rolls it up to the pin, and the optimistic pin hard-codes it null. The 5-2 engine reads `exif_taken_at` for tier-2 and the photos tiebreaker, so both are inert: a user who adds old-trip photos without typing a date falls to tier-3 ("N 年前加入", the pin-creation date) instead of the intended tier-2 ("N 年前的今天", the photo's travel date). An **Epic-3 ↔ Epic-5 dependency gap** — 5-2's unit tests inject `exifTakenAt` directly, so the isolated review couldn't see the missing upstream denormalization. **Fix:** denormalize `MIN(photos.taken_at)` → `pins.exif_taken_at` on photo insert/delete (data layer or a DB trigger), or have the sender read it. → **Epic 6 / fast-follow.**
2. **VAPID public key is build-time inlined.** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` freezes into the client bundle at `next build`; if it isn't set in Vercel BEFORE the build, the "enable" affordance silently never renders (no error). A key rotation needs a rebuild, not just an env edit. → **deploy runbook.**

### MEDIUM
3. **"N more" count can disagree between push and landing.** The push body count (`othersFromThisDayCount`) requires a true anniversary (`yearsAgo ≥ 1`); the landing chip's `memoriesSharingDay` matches month-day with NO year constraint. A pin dated this year on today's month-day inflates the chip but not the push. → decide whether the cohort is anniversary-only, or pass the count through the deep link.
4. **A rediscovery push can show a false "這天還有 N 個回憶" chip.** A tier-4 rediscovery is day-less and carries no tier through `/?pin={id}`; the landing is tier-blind and always builds a same-day cohort on the *rediscovered* pin's month-day (not today). → carry the tier/flag through the link, or only build the cohort when the target is an anniversary of today.
5. **Two notification controls can contradict.** `EnableNotifications` (device permission, "開啟回憶通知") and `NotificationSettings` (`notif_enabled`, default true) sit adjacently; a signed-in user who never granted OS permission sees "enable" AND an already-"on" toggle. → derive a single coherent state (notif_enabled AND subscribed AND granted).
6. **A mismatched VAPID pair (403) retries forever, silently.** `sendPush` treats only 404/410 as stale; a 403 (wrong key pair) is "transient" → not pruned, `anySent` stays false → ledger never stamps → the same failing send retries daily with only console output. → document the same-pair requirement; consider treating 403 as loud.
7. **Type regen must run AFTER the two migrations.** `supabase gen types` against a DB missing them drops `push_subscriptions` + the ledger columns → broken build. → pin the order in the runbook.
8. **`CRON_SECRET` must be in the Production scope.** The route fails closed; a missing/preview-only secret 401s every cron with no app-level signal. → set in Production, verify with one manual Bearer call.

### LOW / INFO
9. (LOW) The count-rule mismatch (#3) seen from the contracts lens.
10. (LOW) Rediscovery cadence is effectively **31 days, not 30** — `last_rediscovery_at` is stamped at ~11:00 UTC but compared against a midnight `today` date-string, so `daysBetween` floors to N-1. → slice to date before comparing.
11. (INFO) **Payload + both type bridges verified consistent end-to-end** — `{title,body,url:/?pin=}` round-trips exactly across 5-3 → SW → 5-4; the hand-added `push_subscriptions`/ledger types match the migrations. Clean.
12. (INFO) Stale `usePin` docstring (says a dedicated `getPin` is needed for re-live; 5-4 correctly uses the list cache); the `?pin=` scrub runs before the pin resolves, so a cold-start fetch error has no retry path.
13. (INFO) **Complete gated-deploy runbook assembled** (see below).
14. (INFO) `notif_enabled` defaults true, so the sender's all-users scan includes every anonymous profile; harmless (device-less profiles `continue`), but `usersConsidered` inflates. A future scale optimization joins on `push_subscriptions`.

## Process learnings

- **Siloed reviews miss seams.** Every per-story review was clean-ish, yet the loop has a dead tier (#1), two count/cohort mismatches (#3/#4), and a UI contradiction (#5) — all at story boundaries. **Carry forward: run an epic-level cross-story audit before declaring an epic done**, not just per-story reviews.
- **"Denormalized" assumptions need a real writer.** 5-2's comment and the Epic-3 schema both assumed a `photos → pins.exif_taken_at` bridge; nobody built it. When a story depends on an upstream field, verify the field is actually populated, not just declared.
- **`NEXT_PUBLIC_` + gated config is a silent-failure trap** (#2): build-time inlining means env-then-build ordering matters and failures are invisible. Deploy runbooks must encode ordering.

## Gated-deploy runbook (do in this order)

1. **Apply both Epic-5 migrations** to the linked Supabase project: `20260625120000_init_push_subscriptions`, then `20260625130000_add_notification_ledger` (both reference `profiles`, FK-safe).
2. **THEN regenerate types:** `supabase gen types typescript --linked` → replaces the hand-added bridges in `types/supabase.ts` (strip the trailing PostHog line). Reversing 1↔2 breaks the build.
3. **Set Production env (Vercel, never `NEXT_PUBLIC_` for secrets):** `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the EXACT pair from one `npx web-push generate-vapid-keys`), `CRON_SECRET` (Production scope).
4. **THEN trigger a fresh production build/deploy** (the public VAPID key must be present at build time, step 3 before this).
5. **Verify:** `curl -H "Authorization: Bearer $CRON_SECRET" https://<app>/api/on-this-day` → expect `200` + summary JSON. On an installed PWA: enable → grant → fire a test push → confirm a native notification → tap → land on the memory.

## Carry-forward action items (prioritized)

- **[HIGH] Build the `photos.taken_at` → `pins.exif_taken_at` denormalization** so tier-2 fires — an Epic 6 (launch-ready) story or pre-launch fast-follow.
- **[MED] Reconcile the rediscovery/cohort day semantics** (#3 + #4): carry tier/count through the deep link so the landing chip never lies.
- **[MED] Reconcile the two notification controls** (#5) — fold into Settings (6-3).
- **[MED/LOW] Robustness:** treat web-push 403 as loud (#6); fix the 31-vs-30 cadence (#10).
- **[INFO] Adopt the deploy runbook above**; update the stale `usePin` docstring (#12).
- All logged to `deferred-work.md`.

These do not block the epic's completion (the loop runs end to end via tiers 1/3/4 + mute + global-off); they are quality + launch-readiness items, several of which fit Epic 6 naturally.
