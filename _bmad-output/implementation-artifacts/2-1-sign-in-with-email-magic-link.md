---
baseline_commit: 83b8239
---

# Story 2.1: Sign in with email magic-link

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to sign in with a one-time email link,
so that I have an account without managing a password.

## Acceptance Criteria

1. **Enter email → magic link → signed in.** A calm sign-in surface takes an email address; submitting sends a Supabase magic link to that email, and clicking the link signs the user in. Errors (bad email, send failure) show a calm inline message, never a hard wall. [epics 2.1 AC1; architecture line 153 (Supabase Auth email magic-link)]
2. **Cookie-based SSR session that persists across reloads.** Once signed in, the session is the cookie-based @supabase/ssr session (the same mechanism the anon session already uses), so it survives reloads and SSR. After sign-in the app reflects a real (non-anonymous) user. [epics 2.1 AC2; architecture lines 80/85/94 (cookie-based SSR auth)]
3. **No regression; local-first preserved.** The anon-first flow (middleware mints an anonymous session on first load — Story 1.4) still works for not-yet-signed-in users; onboarding, map, pins, memories are unchanged. The sign-in surface is reachable but never a gate (local-first; the post-payoff "keep your map" prompt is Story 2-3). [Epic 1–4 behavior; EXPERIENCE auth placement lines 22/34]

## Tasks / Subtasks

- [x] **Task 0 — Resolve the design forks (Open Questions) + Supabase config dependency BEFORE building**
  - [x] Q1 anon-session handling (link-in-place vs plain sign-in), Q2 surface placement, Q3 the returning-vs-new-email path. These shape the implementation. ALSO: 2-1 needs Supabase dashboard config that only Simon can do (see Dev Notes "Supabase config dependency") — enable email auth + set the redirect allowlist. Build the code against it; full end-to-end needs that config live.
- [x] **Task 1 — Sign-in sheet + account button (AC: 1, 3)** [features/auth/components, mounted in the shell]
  - [x] A calm, keepsake-toned sign-in SHEET (vaul `Drawer`, matching the memory/places panels — RESOLVED Q2), opened from a quiet account button on the map surface (gate it off during onboarding like PlacesPanel). The sheet: an email input + 「寄送登入連結」 button, a sent-confirmation state (「我們寄了登入連結到 …，點開就完成登入」), calm inline errors incl. 「此信箱已有帳號」 (Q3). Build it reusable so the 2-3 post-payoff prompt can open the same sheet. Never blocks the map (local-first).
- [x] **Task 2 — Send the magic link, link-in-place (AC: 1)** [features/auth/queries or a client action]
  - [x] On submit, call `supabase.auth.updateUser({ email })` (RESOLVED Q1) to link the email to the CURRENT anon user (anon→permanent, uid + data preserved), with the email confirmation routed to the confirm route (Task 3) — set the redirect via the Supabase auth option that applies to the email-change/confirm link. On the "email already registered" error, show 「此信箱已有帳號」 and stop (defer the returning-user path to 2-3/2-4, Q3).
- [x] **Task 3 — Confirm route: exchange the link for a session (AC: 1, 2)** [app/auth/confirm/route.ts]
  - [x] Add the magic-link landing route (`app/auth/confirm/route.ts`, the @supabase/ssr pattern): read `token_hash` + `type` from the URL, call `supabase.auth.verifyOtp(...)` with the server client (sets the cookie session via the existing cookie wiring), then redirect to `/` (or `next`). Calm error redirect on an invalid/expired link.
  - [x] Confirm the cookie session persists across reload (AC2) and that `useSessionUserId()` / the app now sees a permanent (non-anonymous) user. The middleware (`lib/supabase/proxy.ts`) must NOT re-mint an anon session over a real one — verify the existing `if (!user && isDocNavigation)` guard already prevents this (it should: a signed-in user has `user`).
- [x] **Task 4 — Tests (AC: 1, 2, 3)** [e2e + unit where possible]
  - [x] e2e (surface + send): the sign-in surface renders, submitting an email calls the OTP/updateUser endpoint (intercept the Supabase auth request to assert it fired with the email + redirect) and shows the sent-confirmation state; a bad email shows the calm error. NOTE: clicking a real magic link can't be e2e'd (needs an email inbox) — cover the confirm route with a unit/integration test that hits it with a token_hash and asserts the redirect + cookie set (or document it as a manual verification step).
  - [x] No-regression: the anon-first flow + the full existing suite still pass (the shared-session harness signs in anon; this story must not break that). `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green.

## Dev Notes

### Current auth model (what exists)
- **Anon-first, cookie SSR.** `lib/supabase/proxy.ts` (middleware) calls `supabase.auth.signInAnonymously()` on a top-level GET when there's no session, writing the @supabase/ssr auth cookie. So EVERY visitor already has a durable session (anonymous) with a stable `user_id = auth.uid()`. [Source: lib/supabase/proxy.ts:60-78]
- **Session read:** `features/auth/hooks/use-session-user.ts` → `useSessionUserId()` reads the JWT `sub` via `getClaims()` (no server round-trip). RLS scopes all data to that uid. [Source: features/auth/hooks/use-session-user.ts]
- **Clients:** `lib/supabase/client.ts` (browser, `createBrowserClient`), `lib/supabase/server.ts` (server), `lib/supabase/proxy.ts` (middleware). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. [Source: lib/supabase/*]
- **No auth UI or routes yet:** `features/auth/` has only the session hook + `.gitkeep`; `app/` has no auth/confirm/callback route. Both are NEW in this story.

### The anon-first subtlety (the crux — see Q1/Q3)
Because a user is ALWAYS already in an anonymous session, "sign in" overlaps with "claim" (Story 2-3). Two Supabase paths:
- **Link-in-place** (`auth.updateUser({ email })` on the anon session) → the email is added to the SAME anon user; the uid is preserved, so all marks/pins/photos stay with the now-permanent account automatically. This is the architecture's "anon→permanent keeps uid, no migration debt" — it front-loads the core of the 2-3 claim. Fails if the email already belongs to another account (the returning/cross-device case → Q3).
- **Plain sign-in** (`auth.signInWithOtp({ email })`) → signs into (or creates) the email account, replacing the anon session with a different uid; the anon data is orphaned unless explicitly claimed (2-3). Simpler for "sign into an existing account," loses on-device anon data.
The clean v1 path for a first-time signer with on-device data is link-in-place; the returning-user-with-an-existing-account path needs plain sign-in. Q1/Q3 decide how much 2-1 handles vs defers to 2-3.

### Supabase config dependency (Simon — dashboard, gated to you)
2-1 can't be fully exercised without Supabase Auth config: (a) **Email provider enabled** + the magic-link/OTP email template; (b) **Site URL + Redirect URL allowlist** including the confirm route (e.g. `http://localhost:3000/auth/confirm` for local + the deploy URL); (c) anonymous sign-ins must stay enabled (already used); (d) if Q1 = link-in-place, confirm "manual linking"/email-change on anon users is allowed. The code lands against these; flag in Completion Notes if config isn't live yet (the send will error until it is).

### Testing reality
A real magic-link click needs an email inbox — not e2e-able against hosted Supabase. So: e2e covers the surface + that submit fires the auth request (intercept) + the sent state + error; the confirm route's token exchange is a unit/integration test or a documented manual check. The shared-session e2e harness (2026-06-25) signs in anonymously — 2-1 must not break it.

### Scope boundary (2-1 vs 2-2 / 2-3)
- **2-1 (this):** the email magic-link mechanism + sign-in surface + confirm route + cookie session persistence.
- **2-2:** Google OAuth (a second method on the same surface).
- **2-3:** the explicit claim (anon→account, "nothing lost") + the post-payoff "keep your map" prompt placement/tone. If Q1 = link-in-place, 2-1 already preserves data for the same-device case; 2-3 then owns the prompt UX + cross-device/existing-account edges.

### Project Structure Notes
- NEW: `features/auth/components/` (sign-in surface), maybe `features/auth/queries/` (the send call), `app/auth/confirm/route.ts`. Possibly a route or entry for the surface (Q2). No Supabase schema migration (auth.users is managed; `profiles` table from the architecture isn't required for 2-1 — default-view still lives in localStorage). MapLibre untouched.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.1 + Epic 2 intro]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 80, 85, 94, 152-153, 264 (auth = magic-link + Google, cookie SSR, features/auth)]
- [Source: .../EXPERIENCE.md lines 22, 34 (auth placement after payoff, quiet keepsake tone, local-first, never a gate)]
- [Source: lib/supabase/proxy.ts; lib/supabase/client.ts; lib/supabase/server.ts; features/auth/hooks/use-session-user.ts]

### Resolved with Simon (2026-06-25)
1. **Anon-session handling:** RESOLVED — **link-in-place** via `supabase.auth.updateUser({ email })` on the current anon session, so the user's on-device map is preserved automatically (uid kept, anon→permanent). NOTE for the confirm route: verify the exact `verifyOtp` `type` Supabase sends for an anon email-link (likely `email_change` / `email`, not `magiclink`) — confirm against the actual link before finalizing Task 3.
2. **Sign-in surface:** RESOLVED — a **vaul sheet/modal** (like the memory/places panels) opened from a quiet account button on the map. Reusable: the Story 2-3 post-payoff "keep your map" prompt opens the same sheet.
3. **Returning email already taken:** RESOLVED — DEFER the full returning/cross-device path to 2-3/2-4. In 2-1, if `updateUser({ email })` fails because the email is already in use, show a calm inline message 「此信箱已有帳號」 (no fallback sign-in here).

### Review Findings

- [x] [Review][Patch] Open redirect via unvalidated `next` in the confirm route [app/auth/confirm/route.ts] — `${origin}${next}` let `next=//evil.com` escape the origin. FIXED: only same-origin relative paths (`/^\/(?![/\\])/`) are honored, else `/`.
- [x] [Review][Patch] Middleware minted a NEW anon session on /auth/confirm before verifyOtp [lib/supabase/proxy.ts] — FIXED: the anon bootstrap now skips `/auth` routes (no throwaway anon user on the confirm navigation).
- [x] [Review][Patch] Brittle "taken email" detection [features/auth/components/account-sheet.tsx] — FIXED: keys off `error.status === 422` / `error.code` first, English-message regex as fallback.
- [x] [Review][Patch] `isAnonymous` defaulting could hide a signed-in user [features/auth/hooks/use-account.ts] — FIXED: `is_anonymous === true` (explicit anon only).
- [x] [Review][Patch] e2e didn't assert the redirect [e2e/auth.spec.ts] — FIXED: the valid-email test asserts the `updateUser` request carries the `/auth/confirm` redirect.
- [x] [Review][Defer] Secure-email-change may need both token hashes [app/auth/confirm/route.ts] — deferred to Simon's manual Supabase check: if "Secure email change" (double-confirm) is ON, a single `verifyOtp` won't complete the anon→permanent link. Added to the manual-verification checklist.
- [x] [Review][Defer] `?auth_error=link` written but unread [app/auth/confirm/route.ts] — deferred: expired link lands calmly on the map (AC1 "never a hard wall" holds); surface the inline message when the auth surface expands (2-3 / 6-3).
- [x] [Review][Dismiss] Stale account cache — the confirm route full-reloads, so claims re-read fresh. Double-submit — the send button is already `disabled` while sending.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- **Link-in-place (Q1):** the sign-in sheet calls `supabase.auth.updateUser({ email }, { emailRedirectTo: <origin>/auth/confirm })` on the current anonymous user → anon→permanent, uid + map preserved automatically. On an "already registered" error it shows 「此信箱已有帳號」 and stops (returning/cross-device path deferred to 2-3/2-4, Q3).
- **Confirm route (`app/auth/confirm/route.ts`):** reads `token_hash` + `type` from the link (so it handles whatever type Supabase sends — anon email-link, magic link, etc.) and `verifyOtp`s with the server client, which writes the cookie session; redirects to `/` on success, `/?auth_error=link` on a bad/expired link. The middleware's `if (!user && isDocNavigation)` guard already prevents re-minting an anon session over a real one.
- **Surface (Q2):** `features/auth/components/account-sheet.tsx` — a vaul sheet (matching the memory/places panels) opened from a quiet account button stacked under the Places button (top-left; the MapLibre NavigationControl owns top-right). Anonymous → email form (idle/sending/sent + calm errors); signed-in → 「你的地圖已保存」 + email + a minimal 登出. `useAccount()` hook reads email/`is_anonymous` from the JWT claims. Mounted in the shell, gated off during onboarding (local-first; never a gate).
- **Tests:** `e2e/auth.spec.ts` (5) — sheet opens; invalid email → calm error; valid email → `updateUser` fires (PUT intercepted, no real mail) → 「查收你的信箱」; already-registered (422) → 「此信箱已有帳號」. Full suite green (52 passed, 1 quarantined, flakes pass on retry); the shared-anon harness is unaffected.
- **⚠️ Pending (Simon + manual):** real end-to-end (click the email link → signed in) needs the Supabase dashboard config — enable the **email provider** + add `/auth/confirm` (local + deploy URL) to the **redirect allowlist**, and confirm anon email-linking is allowed. Until that's live, `updateUser` will error (the sheet shows the calm failure). The confirm route's real token exchange + AC2 session-persistence-across-reload are verified by a **manual** check once config is live (not e2e-able — needs an inbox). No Supabase schema migration in this story (auth.users is managed).
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build` (`--webpack`) clean (confirm route builds as a dynamic server route) · e2e green.

### File List

- **NEW** `app/auth/confirm/route.ts` — magic-link/email-confirm landing (verifyOtp → cookie session → redirect)
- **NEW** `features/auth/hooks/use-account.ts` — `useAccount()` (email / isAnonymous from JWT claims)
- **NEW** `features/auth/components/account-sheet.tsx` — sign-in sheet + quiet account button
- **NEW** `e2e/auth.spec.ts` — 5 surface/send/state tests (Supabase PUT intercepted)
- **MOD** `features/memories/components/map-memory-shell.tsx` — mount `<AccountSheet/>` (gated off onboarding)

### Change Log

- 2026-06-25 — Story 2.1 implemented (email magic-link sign-in). Link-in-place anon→permanent via `updateUser({email})`; a calm reusable sign-in sheet from a quiet account button; `app/auth/confirm` route exchanges the link for the cookie SSR session. Returning-email path deferred to 2-3/2-4. No migration. Real end-to-end pending Simon's Supabase email-auth + redirect-allowlist config (manual verification). Status → review.
- 2026-06-25 — Code review: 5 patches applied (open-redirect guard on the confirm `next`; skip the anon bootstrap on /auth routes; robust 422/code-based taken-email detection; `is_anonymous === true` explicit-anon; e2e asserts the redirect), 2 deferred (secure-email-change double-token → manual check; expired-link message surfacing), 2 dismissed. tsc/lint/build clean; full e2e green (53 passed, 1 quarantined). Status → done.
- 2026-06-25 — Verified end-to-end manually (Simon): Resend SMTP + the token_hash email templates + URL config live; sent a link, clicked it, landed signed in with the anonymous map preserved, persists across reload. All 3 ACs confirmed for real.
- 2026-06-25 — UX follow-up (Simon): the sign-in surface is now responsive like the memory panel — a centered modal on desktop (≥840px), the bottom sheet on phone (the desktop bottom-sheet read as odd). e2e covers both viewports (6 auth tests). tsc/lint/build green.
