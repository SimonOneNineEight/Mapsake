---
baseline_commit: ed2da4e
---

# Story 2.7: Sign in to an existing account (returning user / second device)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a returning user (typically a second device) whose email/Google already has an account,
I want to actually sign INTO that account,
so that I reach my existing map instead of hitting a dead-end message.

## Acceptance Criteria

1. **Real sign-in into the EXISTING account (not link-in-place).** When the entered email/Google already belongs to an account, the user is signed INTO it — email via `signInWithOtp({ email, options: { shouldCreateUser: false } })`, Google via `signInWithOAuth({ provider: "google" })` — and lands on that account's existing map with the cookie SSR session (persists across reload). The uid switches from the anon user to the existing account. [epics 2.7 AC1; architecture auth lines]
2. **The calm notices lead to a real action, never a dead-end.** The two returning-user states each gain a sign-in action: the email `status:"error-taken"` (「此信箱已有帳號」) gets a 「登入你的帳號」 that re-issues `signInWithOtp` to the typed address → the existing 「查收你的信箱」 sent state; the OAuth `notice:"existing"` (「已用此信箱註冊，使用信箱登入回到你的地圖。」) gets a 「用 Google 登入」 that calls `signInWithOAuth`. Never a hard wall. [epics 2.7 AC2]
3. **On-device anon data left in place (orphaned, NOT destroyed).** Signing in switches uid; the device's anon `region_marks`/`pins`/`photos` are NOT deleted, re-parented, or merged — they remain owned by the anon uid (recoverable for Story 2-8). The explicit merge is Story 2-8 (deferred). [epics 2.7 AC3; 2-3 floor]

### Decisions baked in (from the 4-agent context analysis, 2026-06-25)

- **Orphaned-map UX = silently switch; say NOTHING about the device's local map at sign-in.** A device-2 returning user is almost always near-empty locally (they came to reach the map they built elsewhere). A "we'll bring your local map along" note would over-promise the deferred 2-8; a "left behind" warning would imply loss and break the calm/never-nag voice. The orphaned-local-map conversation belongs entirely to 2-8's one-time "add this device's map?" offer. So: no local-map copy in 2-7.
- **Sign-in calls are SEPARATE from 2-1/2-2's link calls.** 2-7 uses `signInWithOtp({shouldCreateUser:false})` / `signInWithOAuth` (session-replacing, new uid); it must NOT reuse `updateUser`/`linkIdentity` (anon→permanent, same uid — they throw `email_exists`/`identity_already_exists` for a returning user).
- **No new infra, no service role.** The routes (`/auth/confirm` verifyOtp, `/auth/callback` exchangeCodeForSession), the open-redirect guards, the proxy `/auth` bootstrap-skip, and the cache-reset-via-full-reload all already exist. 2-7 is almost entirely a client change in `account-sheet.tsx`. The MERGE (service-role/SECURITY DEFINER) is Story 2-8.

### Config dependency (Simon — gated to you, for the real round-trip)

- The email sign-in fires Supabase's **"Magic Link" email template** (a DIFFERENT template than the 2-1 "Confirm signup"/"Change Email Address" ones). If left default it points at Supabase's own `/verify`, not our route, so the SSR session never lands. Set **Authentication → Emails → Templates → "Magic Link"** body link to:
  `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink&next=/">Log In</a>`
  (Go template syntax `{{ .TokenHash }}`; keep the 2-1 templates as-is.) The Google returning-user path reuses the 2-2 Google provider config (still pending). Verify `shouldCreateUser:false` (no account created for an unknown email) against the live project. Like 2-1/2-2, the real round-trip is a manual check.

## Tasks / Subtasks

- [x] **Task 1 — Email sign-in into the existing account (AC: 1, 2)** [features/auth/components/account-sheet.tsx]
  - [x] Added `signInExisting`: `signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: <origin>/auth/confirm } })`, reusing `looksLikeEmail` + the existing `email` state, transitioning to the shared `status:"sent"` (「查收你的信箱」). Distinct handler from `sendLink`'s `updateUser`; the shared sent UI is fine.
  - [x] Surfaced 「登入你的帳號」 in the `status === "error-taken"` block (under 「此信箱已有帳號」). The email onChange clears `status`, so editing the email retracts the action — correct.
  - [x] Unknown-email anti-enumeration: `signInWithOtp` sends nothing for an unknown email and returns no error → we still show 「查收你的信箱」 (leak nothing). On a transient error → the calm 「無法寄送…」. (Verify the exact response against the live project — manual.)
- [x] **Task 2 — Google returning path (AC: 2) — RESCOPED: email is the universal recovery; Google one-click fast-path DEFERRED** [features/auth/components/account-sheet.tsx]
  - [x] Did NOT add a `signInWithOAuth` button under `notice === "existing"`. Reason (a subtlety the research under-weighted): `signInWithOAuth(google)` only works if the account was CREATED via Google (has a Google identity). If the account is email-created (the common `email_exists` case), a Google sign-in would try to provision a new user for that email and **loop** back to `email_exists`. `signInWithOtp` (Task 1) is the UNIVERSAL recovery — a magic link to the email signs into the account whether it was made with email OR Google (both carry the email). So `notice === "existing"` keeps Simon's copy 「已用此信箱註冊，使用信箱登入回到你的地圖。」 (which already steers to the email form), and the email error-taken → 「登入你的帳號」 path is the action. A Google one-click fast-path (for Google-created accounts) is a documented follow-up: it needs `/auth/callback` to distinguish `identity_already_exists` (→ offer Google) from `email_exists` (→ email), which it doesn't today (both → `?auth_error=existing`).
- [x] **Task 3 — Verify the routes + cache reset (AC: 1, 3)** [no change — verified]
  - [x] `/auth/confirm` reads `type` from the URL generically and `verifyOtp`s — accepts the magic-link `type` with no change; its server redirect = a full document load → the userId-keyed caches reset for the new uid (no in-page swap added). `/auth/callback` unchanged. Anon data untouched by the sign-in path (no cleanup/delete) — orphaned-not-destroyed. No merge code, no service role, no migration.
- [x] **Task 4 — Tests (AC: 1, 2)** [e2e/auth.spec.ts]
  - [x] e2e (intercepts, no real mail): type a taken email → 寄送登入連結 → `PUT /auth/v1/user` 422 → 「登入你的帳號」 appears → click → intercepts `**/auth/v1/otp**` (proves `signInWithOtp` fired, not `updateUser`, with the email) → 「查收你的信箱」 shows.
  - [x] The Google-returning e2e was dropped with Task 2 (no Google button added). The Google fast-path is the documented follow-up.
  - [x] No-regression: `tsc` + `lint` + `pnpm build --webpack` clean; full e2e **67 passed, 1 skipped**.

## Review Findings

_Code review 2026-06-25 (3 adversarial layers + triage): 1 patch, rest dismissed/accepted; auditor verified all 3 ACs + scope clean._

- [x] [Review][Patch] No double-fire guard on 「登入你的帳號」 [features/auth/components/account-sheet.tsx] — FIXED: added `if (status === "sending") return` at the top of `signInExisting`, so a sub-frame double-click can't fire two OTP sends (which would trip Supabase's per-email OTP rate limit). The `disabled` approach didn't apply (the button unmounts when status→sending); the function guard is robust. (blind+edge)
- [x] [Review][Dismiss] Unknown-email anti-enumeration (rated HIGH) — NOT reachable: 「登入你的帳號」 renders only in `status==="error-taken"`, which `sendLink` sets ONLY on `updateUser` `email_exists` (the email is provably registered). So `signInExisting` always fires on a known account → success; the unknown-email error branch can't be hit through the UI. (The enumeration leak the agent described requires invoking it on an unknown email, which the flow prevents.)
- [x] [Review][Accept] `notice==="existing"` (Google-return) has no one-click action — it steers to the email form, where the universal `signInWithOtp` path lives. Auditor confirmed this is NOT a dead-end / not an AC2 violation; the Google one-click fast-path is the documented deferral (needs `/auth/callback` to distinguish `email_exists` vs `identity_already_exists`). (edge+auditor, advisory)
- [x] [Review][Accept] Orphaned anon map + a possible dangling `email_change` on the abandoned anon user (from the prior `updateUser` 422) — cosmetic/deferred residue; the cache reset via the `/auth/confirm` full reload holds (confirmed). Both are 2-8 territory. (edge, Low)

## Dev Notes

### Almost entirely a client change — the infra is already built
- **Routes unchanged.** `/auth/confirm` reads `type` from the link generically and `verifyOtp`s (handles `magiclink` as well as 2-1's `email_change`); `/auth/callback` does `exchangeCodeForSession`. Both write the cookie session server-side and redirect (a full reload). The proxy skips the anon bootstrap on `/auth`. [Source: app/auth/confirm/route.ts; app/auth/callback/route.ts; lib/supabase/proxy.ts]
- **The pivot points exist.** The anon body of `account-sheet.tsx` already renders the two returning-user states: `status === "error-taken"` (「此信箱已有帳號」, from `sendLink`'s `email_exists` branch) and `notice === "existing"` (「已用此信箱註冊…」, from the `/auth/callback ?auth_error=existing` redirect read by the on-load notice effect). 2-7 adds the ACTION behind each — the detection + surface + tone are done. [Source: features/auth/components/account-sheet.tsx]
- **Cache reset = the existing full-reload.** `signOut` does `window.location.assign("/")`; the email/Google sign-in round-trips through `/auth/confirm`/`/auth/callback` (server redirect = full document load), which rebuilds the QueryClient so the uid-keyed caches refetch under the new uid. Do NOT introduce an in-page uid swap (the `staleTime:Infinity` `["account"]` query would keep the stale anon identity — 2-3's cache note). [Source: account-sheet.tsx signOut; features/auth/hooks/use-account.ts]

### Why these calls (not 2-1/2-2's)
- `signInWithOtp({shouldCreateUser:false})` signs into the EXISTING email account and refuses to create one; `signInWithOAuth` signs into the account owning the Google identity. 2-1's `updateUser`/2-2's `linkIdentity` attach to the CURRENT anon user (same uid) and throw `email_exists`/`identity_already_exists` for a returning user — the dead-end 2-7 fixes. [Source: architecture analysis; 2-1/2-2]

### Orphaned anon data (AC3)
- Sign-in creates a session for a DIFFERENT uid; nothing in the path deletes/re-parents the anon uid's rows. They persist under the anon uid (RLS just stops the new session reading them) — exactly the state Story 2-8's service-role re-parent needs. 2-7 adds NO cleanup. (Caveat for 2-8, not 2-7: confirm Supabase's anonymous-user retention so a days-later merge still finds them.) [Source: architecture analysis; deferred-work.md]

### Scope boundary
- 2-7 = the returning-user SIGN-IN (unblocks Story 2-4 cross-device). 2-8 = the cross-account MERGE (service-role/SECURITY DEFINER — deferred). 2-7 ships NO merge UI, NO service role, NO migration.

### Project Structure Notes
- MOD: `features/auth/components/account-sheet.tsx` (the two sign-in handlers + the two actions). VERIFY-ONLY: `app/auth/confirm/route.ts`, `app/auth/callback/route.ts`, `features/auth/hooks/use-account.ts`. MOD: `e2e/auth.spec.ts` (2 returning-sign-in tests). No new dependency, no migration, no server route.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.7]
- [Source: _bmad-output/planning-artifacts/architecture.md (auth: signInWithOtp/signInWithOAuth, cookie SSR, RLS); ux-designs/EXPERIENCE.md lines 22, 34 (keepsake tone, never a gate)]
- [Source: features/auth/components/account-sheet.tsx; app/auth/{confirm,callback}/route.ts; features/auth/hooks/{use-account,use-session-user}.ts; lib/supabase/{client,server,proxy}.ts]
- [Source: Stories 2-1 (updateUser + /auth/confirm + sent state), 2-2 (linkIdentity + /auth/callback + ?auth_error=existing notice), 2-3 (the orphaned-rows floor)]

### Resolved with Simon (2026-06-25)
1. **Scope = the sign-in half only;** the anon-map merge is the deferred Story 2-8. Orphaned-map UX = silent switch (no copy, don't over-promise 2-8). Config dependency: the Supabase "Magic Link" email template (gated to Simon) for the real email round-trip; Google reuses the pending 2-2 config.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

### Completion Notes List

- **Returning-user sign-in = `signInWithOtp({shouldCreateUser:false})` (universal):** the email error-taken state now offers 「登入你的帳號」, which signs INTO the existing account via a magic link (lands on the unchanged `/auth/confirm` → cookie session → full-reload uid switch). Works whether the account was created via email or Google, since both carry the email. This is what unblocks Story 2-4 (you can now be your existing account on device 2).
- **Google one-click fast-path deferred (deliberate):** a `signInWithOAuth(google)` button under the existing-account notice would loop for email-created accounts (`email_exists` → new-user attempt → `email_exists`). Email-OTP is universal, so I shipped that and deferred the Google fast-path (it needs `/auth/callback` to distinguish `email_exists` vs `identity_already_exists`). Documented in Task 2 + deferred-work.
- **No new infra:** routes/session/proxy/cache-reset all unchanged; the merge stays Story 2-8; anon data orphaned-not-destroyed. The real email round-trip needs Simon's **"Magic Link" email template** config (gated to him; see the story's Config dependency).
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build --webpack` clean · full e2e **67 passed, 1 skipped** (1 new returning-sign-in test).

### File List

- **MOD** `features/auth/components/account-sheet.tsx` — `signInExisting` (signInWithOtp shouldCreateUser:false) + 「登入你的帳號」 action in the error-taken state
- **MOD** `e2e/auth.spec.ts` — returning-user sign-in test (taken email → 登入你的帳號 → signInWithOtp → sent)

### Change Log

- 2026-06-25 — Code review (3 layers + triage): 1 patch (double-fire guard on the sign-in action), rest dismissed/accepted (the HIGH anti-enumeration finding is unreachable — the action only appears for a known-registered email). tsc/lint clean, auth e2e green. Status → done.
- 2026-06-25 — Implemented the returning-user sign-in (Story 2.7): the existing-account email state offers 「登入你的帳號」 → `signInWithOtp({shouldCreateUser:false})` into the existing account (universal — email or Google-created), unblocking 2-4. Google one-click fast-path + the anon-map merge stay deferred (2-8). Routes/session unchanged; real email round-trip pending Simon's Magic-Link template config. tsc/lint/build clean, 67 e2e passed. Status → review.
- 2026-06-25 — Story created (context engine + 4-agent research workflow). Split from the old 2-7 (merge → now 2-8). Scope: returning-user sign-in into an existing account; unblocks 2-4; orphaned anon map left for 2-8; Magic-Link email template is a Simon-gated config dependency.
