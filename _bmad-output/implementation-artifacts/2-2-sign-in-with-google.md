---
baseline_commit: 613d0ea
---

# Story 2.2: Sign in with Google

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to sign in with Google,
so that I can start fast with an account I already have.

## Acceptance Criteria

1. **Choose Google → OAuth completes → signed in.** The sign-in surface offers a Google option; choosing it runs Supabase Google OAuth and returns the user signed in (cookie SSR session). Calm error handling, never a hard wall. [epics 2.2 AC1; architecture line 153 (Google OAuth)]
2. **Two methods, no single-OAuth lock-in.** Both email magic-link (2-1) AND Google are available on the same surface — neither is the only path. [epics 2.2 AC2; architecture line 58 ("avoid single-OAuth-only")]
3. **No regression; local-first + map preserved.** Anon-first still works; onboarding/map/pins/memories unchanged. Consistent with 2-1, signing in with Google LINKS to the current anonymous user so the on-device map carries over (anon→permanent, uid kept). Never a gate. [Epic 1–4 behavior; 2-1 link-in-place precedent]

## Tasks / Subtasks

- [x] **Task 0 — Decision + Supabase/Google config dependency (Simon) BEFORE building**
  - [x] Confirm Q1 (link-in-place via `linkIdentity` vs plain `signInWithOAuth`). Config Simon must do (gated to him): create a **Google Cloud OAuth client** (Web app; Authorized redirect URI = `https://gnlatvacoqlwwabexbfm.supabase.co/auth/v1/callback`); enable **Supabase → Auth → Providers → Google** with the client id/secret; if Q1 = link-in-place, enable **Auth → Manual Linking**; add `/auth/callback` (local + deploy) to the **Redirect URLs** allow-list. Build the code against these; full round-trip needs them live.
- [x] **Task 1 — Google button on the sign-in surface (AC: 1, 2)** [features/auth/components/account-sheet.tsx]
  - [x] Add a calm 「用 Google 登入」 button to the shared `body` of the account sheet, ABOVE or beside the email form (so both methods show — AC2). It appears in BOTH layouts (desktop modal + phone sheet) since `body` is shared. Hidden/replaced by the signed-in state when already signed in. zh-TW, keepsake tone.
- [x] **Task 2 — Start Google OAuth, link-in-place (AC: 1, 3)** [account-sheet]
  - [x] On click, call `supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: \`${origin}/auth/callback\` } })` (RESOLVED Q1 default = link-in-place, preserves the anon map; parallel to 2-1's `updateUser`). This redirects to Google. On an "identity already linked / in use" error (returning/cross-device Google account), show a calm message and stop — defer that path to 2-3/2-4 (mirrors 2-1 Q3). If Q1 = plain sign-in instead, use `signInWithOAuth({ provider: "google", options: { redirectTo } })`.
- [x] **Task 3 — OAuth callback route (AC: 1, 3)** [app/auth/callback/route.ts]
  - [x] NEW route handling the OAuth return: read `code` from the URL, `supabase.auth.exchangeCodeForSession(code)` with the server client (writes the cookie session), redirect to `/` (or a same-origin `next`, with the SAME open-redirect guard as `/auth/confirm`). Calm error redirect (`/?auth_error=oauth`) on failure. This is SEPARATE from `/auth/confirm` (email uses `verifyOtp` + `token_hash`; OAuth uses `exchangeCodeForSession` + `code`). The proxy already skips the anon bootstrap on `/auth` routes (2-1 fix), so `/auth/callback` is covered.
- [x] **Task 4 — Tests (AC: 1, 2, 3)** [e2e where possible]
  - [x] e2e: the Google button renders on the sign-in surface alongside the email form (AC2, both viewports). Clicking it initiates the OAuth redirect — assert it attempts navigation to the Google/Supabase auth URL (intercept the `linkIdentity`/authorize request, or assert the navigation target), WITHOUT completing a real Google login (not e2e-able). The callback `exchangeCodeForSession` is a manual verification step (documented), like 2-1's confirm route.
  - [x] No-regression: full e2e suite + the 2-1 email tests still pass; `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green.

## Review Findings

_Code review 2026-06-25 (3 adversarial layers + triage): 0 decision-needed, 1 patch, 1 defer, ~11 dismissed as noise._

- [x] [Review][Patch] Google button lacks in-flight guard / throw-safety / stale-error reset [features/auth/components/account-sheet.tsx] — FIXED: added a `googleBusy` flag (button `disabled` + 「前往 Google…」 label, stays disabled through the success redirect to prevent double-submit), wrapped `linkIdentity` in `try/catch` → calm error, and reset `googleError` when the account sheet opens. Brings Google to parity with the email `status` machine. (blind+edge)
- [x] [Review][Defer] OAuth error feedback unconsumed + already-linked copy is generic [app/auth/callback/route.ts; account-sheet.tsx] — deferred, pre-existing. `?auth_error=oauth` is never read/rendered (identical to 2-1's accepted `?auth_error=link`), and all `linkIdentity` errors collapse to one "暫時無法使用，請稍後再試" which misrepresents the *permanent* already-linked case. Per spec the already-linked resolution is explicitly Story 2-3/2-4; surfacing the auth_error message is already on the deferred backlog. (blind+edge+auditor)

## Dev Notes

### Builds directly on 2-1
- The account sheet (`features/auth/components/account-sheet.tsx`) already renders a responsive surface (desktop modal / phone sheet) with a shared `body`, the email form, and the signed-in state via `useAccount()`. 2-2 ADDS the Google button to that `body` + a second callback route. Reuse, don't duplicate. [Source: features/auth/components/account-sheet.tsx]
- `app/auth/confirm/route.ts` (2-1) is the EMAIL path (`verifyOtp`). 2-2 adds `app/auth/callback/route.ts` for OAuth (`exchangeCodeForSession`) — keep them separate (different params/exchange). Reuse the same-origin `next` guard from confirm. [Source: app/auth/confirm/route.ts]
- `lib/supabase/proxy.ts` already skips the anon bootstrap on `/auth/*` (2-1 review fix), so the OAuth callback won't mint a throwaway anon user. [Source: lib/supabase/proxy.ts]
- `lib/supabase/server.ts` server client (cookie-writing) is used by the callback route, same as confirm. [Source: lib/supabase/server.ts]

### Link-in-place for OAuth (the crux — Q1)
To keep 2-1's promise (your anonymous map carries over when you sign in), use `linkIdentity({ provider: "google" })` on the current anon session → Google identity is linked to the SAME uid (anon→permanent), map preserved. This is the OAuth parallel of 2-1's `updateUser({ email })`. **Requires "Manual Linking" enabled** in Supabase Auth (config dependency). The alternative, `signInWithOAuth`, creates/enters a separate Google account (new uid) and orphans the anon map until the 2-3 claim — only choose it if Manual Linking can't be enabled.

### Config dependency (Simon — gated to you)
Google Cloud OAuth client (redirect URI = the Supabase callback `https://gnlatvacoqlwwabexbfm.supabase.co/auth/v1/callback`) → Supabase Google provider (client id + secret) → Manual Linking ON (for link-in-place) → `/auth/callback` in the redirect allow-list. The code lands against these; the round-trip can't be verified until they're live.

### Testing reality
A real Google login can't run in e2e (third-party consent screen). So e2e asserts the button exists + clicking initiates the OAuth navigation; the callback `exchangeCodeForSession` + the linked-identity + map-preservation are a MANUAL check once config is live (like 2-1). The shared-anon e2e harness must stay green.

### Scope boundary (2-2 vs 2-3)
- **2-2 (this):** the Google method on the sign-in surface + OAuth callback + link-in-place.
- **2-3:** the explicit claim + the post-payoff "keep your map" prompt; the returning/already-linked-account edges (calm-message-and-stop in 2-2) get full handling there.

### Project Structure Notes
- NEW: `app/auth/callback/route.ts`. MOD: `features/auth/components/account-sheet.tsx` (Google button + linkIdentity). No new component files needed; no Supabase schema migration (auth is managed). No new dependency (supabase-js v2 has `linkIdentity`/`signInWithOAuth`/`exchangeCodeForSession`).

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 58, 152-153, 264, 302]
- [Source: features/auth/components/account-sheet.tsx; app/auth/confirm/route.ts; lib/supabase/proxy.ts; lib/supabase/server.ts; features/auth/hooks/use-account.ts]
- [Source: Story 2-1 (link-in-place precedent, the resolved auth decisions)]

### Resolved with Simon (2026-06-25)
1. **Link-in-place:** RESOLVED — use `supabase.auth.linkIdentity({ provider: "google" })` so Google attaches to the current anon user (same uid, map preserved), consistent with 2-1. Simon to enable **Auth → Manual Linking** in Supabase (config dependency). Returning/already-linked Google account → calm message + stop, full handling deferred to 2-3/2-4.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Completion Notes List

- **Google button (AC1/AC2):** added 「用 Google 登入」 to the shared sign-in `body` in `account-sheet.tsx`, above the email form with an 「或」 divider — so both Google and magic-link show on the same surface (no single-OAuth lock-in). Renders in both layouts (desktop modal + phone sheet) since `body` is shared.
- **Link-in-place (Q1, AC3):** the button calls `supabase.auth.linkIdentity({ provider: "google", options: { redirectTo: <origin>/auth/callback } })` → Google links to the current anon user (same uid, map preserved), the OAuth parallel of 2-1's `updateUser`. On error (e.g. identity already linked) it shows a calm 「Google 登入暫時無法使用，請稍後再試」 and stops — returning/cross-device path deferred to 2-3/2-4.
- **Callback route (`app/auth/callback/route.ts`):** `exchangeCodeForSession(code)` with the server client → cookie session → redirect to `/` (same-origin `next` guard, same as `/auth/confirm`); `/?auth_error=oauth` on failure. Separate from the email confirm route. The proxy's `/auth` bootstrap-skip (2-1) covers it.
- **Tests:** `e2e/auth.spec.ts` — both methods offered (AC2); clicking Google initiates the OAuth navigation to `…/identities/authorize?provider=google&redirect_to=…/auth/callback` (route intercepted + aborted, no real Google login). Full suite green (56 passed, 1 quarantined).
- **⚠️ Pending (Simon + manual):** the real Google round-trip needs the config in the manual checklist below — Google Cloud OAuth client, Supabase Google provider, **Manual Linking ON** (required for `linkIdentity`), and `/auth/callback` in the redirect allow-list. The callback's `exchangeCodeForSession` + linked-identity + map-preservation are a manual check once live (not e2e-able — third-party consent screen). No schema migration; no new dependency.
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build` (`--webpack`) clean (callback builds as a dynamic route) · e2e green.

### File List

- **NEW** `app/auth/callback/route.ts` — OAuth code exchange → cookie session
- **MOD** `features/auth/components/account-sheet.tsx` — Google button + `linkIdentity` + googleError state
- **MOD** `e2e/auth.spec.ts` — 2 Google tests (both-methods-offered, OAuth-initiate)

### Change Log

- 2026-06-25 — Code review (3 layers + triage): 1 patch applied (Google button in-flight guard + throw-safety + stale-error reset, parity with the email status machine), 1 defer (auth_error message surfacing + already-linked copy → 2-3/2-4), ~11 dismissed. tsc/lint clean, 8/8 auth e2e green. Status → done. Real Google round-trip still pending Simon's config (manual checklist).
- 2026-06-25 — Story 2.2 implemented (Google sign-in). 用 Google 登入 on the shared sign-in surface alongside email (no single-OAuth lock-in); `linkIdentity` attaches Google to the current anon user (link-in-place, map preserved); `app/auth/callback` exchanges the OAuth code for the cookie session. Returning/already-linked path deferred to 2-3/2-4. No migration. Real round-trip pending Simon's Google + Supabase Manual-Linking config (manual checklist). Status → review.

## Manual verification checklist — Story 2.2 (needs Simon's config, then a real Google login)

1. **Google Cloud Console:** create an OAuth client (Web app); Authorized redirect URI = `https://gnlatvacoqlwwabexbfm.supabase.co/auth/v1/callback`; copy Client ID + Secret. Configure the consent screen (app name "Mapsake", your support email; testing mode + your account as a test user is fine).
2. **Supabase → Auth → Providers → Google:** enable, paste Client ID + Secret.
3. **Supabase → Auth → Manual Linking:** turn ON (required for `linkIdentity`).
4. **Supabase → Auth → URL Configuration → Redirect URLs:** add `http://localhost:3000/auth/callback` (+ the deploy URL later).
5. **Test:** color a region anonymously → open the account sheet → 用 Google 登入 → complete Google → you land signed in, the colored region is still there (same uid), and a reload keeps you signed in.
