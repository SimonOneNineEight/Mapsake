# Story 2.7: Sign in to an existing account (returning user / second device)

Status: ready-for-dev

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

- [ ] **Task 1 — Email sign-in into the existing account (AC: 1, 2)** [features/auth/components/account-sheet.tsx]
  - [ ] Add a `signInExisting` handler: `createClient().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false, emailRedirectTo: \`${window.location.origin}/auth/confirm\` } })`. Reuse the `looksLikeEmail` guard + the existing `email` state. On the call firing, transition to the existing `status:"sent"` state (the 「查收你的信箱」 surface — its copy 「我們寄了登入連結到 {email}，點開就完成登入」 fits sign-in verbatim). NOTE: this is a DIFFERENT API than `sendLink`'s `updateUser` — both end in the "sent" UI, so distinguish the two intents at call time (a separate handler; the shared "sent" UI is fine).
  - [ ] Surface a calm 「登入你的帳號」 action in the `status === "error-taken"` block (under 「此信箱已有帳號」) wired to `signInExisting`. (The email onChange already clears `status`, so editing the email correctly retracts the action — that's fine.)
  - [ ] `shouldCreateUser:false` for an UNKNOWN email: Supabase sends no mail (anti-enumeration). Keep showing the same 「查收你的信箱」 (leak nothing) — do NOT branch to a "no such account" message (enumeration). Confirm the actual response against the live project.
- [ ] **Task 2 — Google sign-in into the existing account (AC: 1, 2)** [features/auth/components/account-sheet.tsx]
  - [ ] Add a `signInGoogleExisting` handler: `createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: \`${window.location.origin}/auth/callback\` } })` (NOT `linkIdentity`). On error, reuse the calm `googleError` treatment.
  - [ ] Surface a 「用 Google 登入」 action in the `notice === "existing"` block (under the existing 「已用此信箱註冊…」 line — KEEP that copy, it's Simon's choice; just add the action) wired to `signInGoogleExisting`. This is the OAuth-bounce returning path; `signInWithOAuth` signs into the account that owns the Google identity (where `linkIdentity` failed).
- [ ] **Task 3 — Verify the routes + cache reset (AC: 1, 3)** [no change expected]
  - [ ] Confirm `app/auth/confirm/route.ts` handles the magic-link `type` (reads `type` from the URL generically → `verifyOtp` accepts `magiclink`/`email`); no change. The server redirect = a full document load, so the userId-keyed caches (`["pins",uid]`, `["regionMarks",uid]`, `["account"]`, `["sessionUserId"]`, staleTime Infinity) re-read for the new uid automatically — do NOT add an in-page uid swap. Confirm `/auth/callback` (exchangeCodeForSession) works unchanged for a fresh OAuth sign-in.
  - [ ] Confirm the anon data is untouched by the sign-in path (no cleanup/delete) — orphaned-not-destroyed (AC3). No merge code, no service role, no migration in 2-7.
- [ ] **Task 4 — Tests (AC: 1, 2)** [e2e/auth.spec.ts]
  - [ ] e2e (email returning path, intercepts — no real mail): type a taken email → 寄送登入連結 → intercept `PUT /auth/v1/user` → 422 → assert 「此信箱已有帳號」 + the 「登入你的帳號」 action appears; click it → intercept the `signInWithOtp` request (`**/auth/v1/otp**`) → assert it fired (email present) → the 「查收你的信箱」 sent state shows. (Mirror the 2-1 valid-email/taken-email intercept pattern.)
  - [ ] e2e (Google returning path): land on `/?auth_error=existing` (the notice) → click the existing-account 「用 Google 登入」 → intercept `**/authorize**` (aborted) → assert it initiates the OAuth navigation (`provider=google`, `/auth/callback`). (Mirror the 2-2 OAuth-initiate test; `signInWithOAuth` hits `/auth/v1/authorize`.)
  - [ ] No-regression: full e2e suite green; `tsc` + `lint` + `pnpm build --webpack` clean.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-06-25 — Story created (context engine + 4-agent research workflow). Split from the old 2-7 (merge → now 2-8). Scope: returning-user sign-in (signInWithOtp/signInWithOAuth) into an existing account; unblocks 2-4; orphaned anon map left for 2-8; Magic-Link email template is a Simon-gated config dependency.
