---
baseline_commit: c5b0b319b54703464637f4d6d2e1d8ff342fa193
---

# Story 2.3: Claim your map (link anon session to account)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my pre-signup map to become my account's map,
so that nothing I built is lost when I sign up.

## Acceptance Criteria

1. **In-place claim — nothing lost (first-time account).** Given an anonymous session with marks/pins/photos, when I create an account (email magic-link OR Google), that data becomes my account's with **none lost** — because sign-in LINKS in place (same `auth.uid()`, no migration). [epics 2.3 AC1; architecture line 153; Story 1.4 "Claim seam"]
   - This path is **already delivered** by 2-1 (`updateUser({email})`, verified end-to-end 2026-06-25) and 2-2 (`linkIdentity({provider:'google'})`, pending Simon's Google config). **2-3 must NOT re-implement linking** — it verifies the guarantee still holds (no regression) once the prompt is wired.

2. **Post-payoff "keep your map" prompt (the focus of this story).** Given the onboarding payoff has landed (the freshly colored map after the 4-4 hand-off), a quiet prompt appears **once** inviting me to keep my map across devices. It reads as a keepsake guarantee, **never a gate or a nag**: the map stays fully visible and usable behind it, it is dismissible, it carries no progress/meter/"incomplete" signal, it is **not shown to already-signed-in users**, and it does **not reappear** once dismissed or seen (persisted suppression). [epics 2.3 AC2; EXPERIENCE.md "Account/auth placement & tone" line 22 + IA row line 34; Voice & Tone lines 45–49 (banned: nags/scolds)]

### Scope boundary (decided with Simon, 2026-06-25)

- **Returning-user / second-device merge is CARVED OUT to a new story (2.7).** The case where you sign in with an email/Google that **already belongs to an account** (typically a second device) — where link-in-place is impossible (`email_exists` / `identity_already_exists`) — is NOT built here. 2-3 keeps the **calm "sign back in" message already shipped in 2-2** (`?auth_error=existing` → 「已用此信箱註冊，使用信箱登入回到你的地圖。」) as the floor: never a hard wall, and the on-device anon data is **not destroyed** (the anon rows persist under their uid). The actual sign-into-the-existing-account path + the cross-account row/photo merge (the app's first service-role/SECURITY-DEFINER surface) is **Story 2.7** (see sprint-status). Rationale: the first-time path already satisfies "none lost" with zero new code; the second device rarely holds local work; and the merge is the highest-risk code in the app, poor risk/reward for v1's rare edge.

## Tasks / Subtasks

- [x] **Task 1 — Post-payoff prompt trigger, once, after the payoff (AC: 2)** [features/memories/components/map-memory-shell.tsx]
  - [x] Triggered in `finishHandoff` (the 4-4 hand-off dismiss → `setOnboarding(null)`), so it follows the payoff and fires only for the user who just finished onboarding this run — a returning user loads with `onboarding` already `null` and never calls `finishHandoff`, so no prompt. The 4-4 card is untouched.
  - [x] Skips if signed in: `const signedIn = !account.isAnonymous && Boolean(account.email)` (via `useAccount()`); the trigger is gated `if (!signedIn && !readAccountPromptSeen())`.
  - [x] Show-once flag `mapsake.accountPromptSeen` added to `features/onboarding/lib/onboarding-prefs.ts` (`read/writeAccountPromptSeen`), written when the prompt fires. Never shows twice (and onboarding doesn't replay on reload anyway, since the default view is stored).
- [x] **Task 2 — Open the existing AccountSheet from the prompt (AC: 2)** [features/auth/components/account-sheet.tsx]
  - [x] Added a minimal one-shot `autoOpen?: boolean` prop (default false). A guarded effect (`autoOpened` ref, setState via a named fn to satisfy the set-state-in-effect lint, mirroring the notice effect / `useIsWide`) opens the sheet once when `autoOpen` is true. The persistent account-button trigger + Esc + vaul `onOpenChange` are unchanged; closing stays closed.
  - [x] Reuses the existing signed-out `body` verbatim (「保存你的地圖」 + 「登入後，你的地圖就能在不同裝置上保存。」 + Google + email). No new sheet UI; the softer-headline variant was not added (reuse-verbatim, as defaulted).
- [x] **Task 3 — Verify AC1 (no regression) + returning-user floor unchanged (AC: 1)** [no new linking code]
  - [x] No linking code touched — `sendLink`/`signInGoogle`/callback/confirm are unchanged, so the in-place claim (same uid) still holds. The 2-1 email link is the manually-verified path; the `updateUser` PUT-intercept e2e still passes.
  - [x] Returning-user message unchanged: the `?auth_error=existing` "existing" notice e2e (auth.spec) still passes. No real sign-in-to-existing-account / merge added (that's Story 2.7).
- [x] **Task 4 — Tests (AC: 1, 2)** [e2e/account-prompt.spec.ts]
  - [x] e2e (new `e2e/account-prompt.spec.ts`, drives onboarding via the world path 看整個世界→完成→開始探索): prompt opens once after the payoff; map visible/usable behind it; both methods offered; dismiss via × closes; reload does NOT re-show (seen flag + onboarding doesn't replay); a returning user gets no auto-prompt.
  - [x] The signed-in-user-no-prompt path is enforced by the `!signedIn` gate in the shell; not e2e-asserted because the shared test harness is anon-only (no permanent session) — covered by code + the returning-user test.
  - [x] No-regression: `tsc` + `lint` + `pnpm build --webpack` clean; full e2e **60 passed, 1 skipped** (the pre-existing quarantined note-persist test).

## Review Findings

_Code review 2026-06-25 (3 adversarial layers + triage): 1 patch, ~8 dismissed/noted, 0 decision-needed._

- [x] [Review][Patch] `autoOpen` prompt not guarded against a confirmed signed-in user (AC2 "not shown to signed-in users") [features/auth/components/account-sheet.tsx] — FIXED: hoisted `signedIn` and added it to the `autoOpen` effect guard (`if (!autoOpen || autoOpened.current || signedIn) return`). The shell already guards `!signedIn`, but its `useAccount` query can be unsettled at `finishHandoff` (defaults to anon); the sheet's own effect shares the `["account"]` cache and runs after the fast `getClaims`, so it closes the race. (blind+edge+auditor)
- [x] [Review][Note] Seen-flag written at trigger, not at "shown" — ACCEPTED. `writeAccountPromptSeen()` runs in `finishHandoff` one tick before the sheet opens; a tab-close in that sub-frame would suppress the prompt. Impact negligible (the persistent 帳號 button is the fallback; for a signed-in user suppressing is correct). Not worth coupling the prefs write into the reusable sheet.
- [x] [Review][Dismiss] `openOnce` "dead indirection" — false positive: it's the required idiom to satisfy `react-hooks/set-state-in-effect` (same as the notice effect / `useIsWide`); inlining `setOpen(true)` fails lint.
- [x] [Review][Dismiss] sticky `promptAccount` → remount re-fire — unreachable: onboarding is forward-only and never returns to non-null after `finishHandoff`, so `<AccountSheet>` does not remount. `signedIn` derivation / silent localStorage catch / StrictMode / hydration concerns also dismissed (match shipped patterns; trigger is event-driven, not render-time).

## Dev Notes

### What is ALREADY done — do not rebuild
- **AC1 first-time claim = link-in-place, shipped in 2-1/2-2.** `account-sheet.tsx sendLink` calls `supabase.auth.updateUser({ email }, { emailRedirectTo: <origin>/auth/confirm })`; `signInGoogle` calls `linkIdentity({ provider: 'google' })`. Both convert the SAME `auth.users` row anon→permanent, so the uid never changes and every RLS row (`pins`, `region_marks`, `photos`, all keyed `user_id = auth.uid()`) stays owned — **nothing moves, nothing is lost, no migration**. [Source: features/auth/components/account-sheet.tsx; Story 1.4 "Claim seam"]
- **The sign-in surface exists and is reusable.** AccountSheet is responsive (desktop modal ≥840px / phone vaul sheet), with the signed-out body, the "sent" state, and the signed-in state (「你的地圖已保存」). Its header comment already names the 2-3 prompt as a consumer. [Source: features/auth/components/account-sheet.tsx lines 9–13]
- **The returning-user calm message exists.** `/auth/callback` maps `email_exists`/`identity_already_exists` → `/?auth_error=existing`; the account sheet's load-effect reads the query flag and shows 「已用此信箱註冊，使用信箱登入回到你的地圖。」. 2-3 leaves this as the floor. [Source: app/auth/callback/route.ts; account-sheet.tsx notice effect]

### The onboarding hand-off seam (where the prompt hooks in)
- The 4-4 hand-off is the `step === "handoff"` card in `features/onboarding/components/onboarding.tsx` — one gentle line + 「開始探索」 (→ `onDismiss`). It deliberately carries NO account nudge so the filled map is the clean payoff. **Do not add the account prompt to this card.** [Source: onboarding.tsx lines 30–63]
- The shell wires `onDismiss` → `finishHandoff = () => setOnboarding(null)` (`map-memory-shell.tsx` line 58), then renders `{!onboarding && <AccountSheet />}` (line 81). The prompt should fire on the `finishHandoff` transition (the moment onboarding clears via the hand-off), so it follows the payoff and never precedes it. A returning user loads with `onboarding` already `null` (their effect at line 41 leaves it null because `readDefaultView() !== null`) and must NOT get the prompt — so key the trigger off the hand-off transition, not off `onboarding === null`. [Source: features/memories/components/map-memory-shell.tsx lines 37–58, 81]

### UX / tone (AC2)
- Placement + tone are owned by EXPERIENCE.md: the prompt sits "right after the onboarding payoff", tone = "a quiet keepsake guarantee ('keep your map safe across your devices'), never a gate or a nag." Banned list: never nags, never scolds; invites, never commands. Local-first before it (the no-account user keeps full marking/browsing). [Source: EXPERIENCE.md lines 22, 34, 45–49]
- Reuse the existing body copy verbatim (it is already the keepsake guarantee). Keep it skippable: overlay-click / × / Esc (desktop) and vaul drag/overlay (phone) already close the sheet.

### Data model (context only — 2-3 writes none of this)
- User content: `profiles` (1:1 with `auth.users`, seeded by the `handle_new_user` SECURITY DEFINER trigger incl. anon), `region_marks` (PK `(user_id, region_code, level)`), `pins`, `photos` (+ private `pin-photos` bucket, path `{user_id}/{pin_id}/{photo_id}.webp`). All RLS-scoped `user_id = (select auth.uid())`. Because link-in-place keeps the uid, none of this is touched by 2-3. [Source: supabase/migrations/2026062*; data/{pins,region-marks,photos}.ts]

### Why the merge is NOT here (carved to Story 2.7)
- Re-parenting rows across uids is blocked by RLS (a client session can only write its own uid), so a cross-account merge needs the app's first **SECURITY DEFINER RPC / service-role** path (a gated migration), PLUS moving Storage objects between `{uid}/` folders (non-atomic), PLUS conflict rules (`region_marks` composite PK; pins/photos have no natural key), PLUS a userId-keyed TanStack cache reset on uid change. Highest-risk code in the app; deferred deliberately. [Source: architecture RLS analysis; deferred-work.md "Returning-user sign-in + map merge"]

### Cache note (relevant if anything ever changes the uid)
- Query keys `["pins", userId]`, `["regionMarks", userId]`, `["sessionUserId"]`, `["account"]` have `staleTime: Infinity`. The shipped link-in-place flow side-steps staleness by doing a full `window.location` reload after confirm/sign-out. 2-3's prompt does not change the uid, so no cache action is needed — but do NOT introduce a uid change without a reload/invalidation. [Source: features/pins/queries/pins-queries.ts; features/auth/components/account-sheet.tsx signOut]

### Project Structure Notes
- MOD: `features/memories/components/map-memory-shell.tsx` (prompt trigger on `finishHandoff` + show-once flag + skip-if-signed-in), `features/auth/components/account-sheet.tsx` (minimal controlled-open affordance). Likely a tiny pref helper alongside `features/onboarding/lib/onboarding-prefs.ts` for the `accountPromptSeen` flag (or reuse that module's pattern). NEW: an e2e spec (or additions to `e2e/auth.spec.ts`). No schema migration, no new dependency, no new linking code.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.3 (AC1 claim, AC2 prompt)]
- [Source: _bmad-output/planning-artifacts/architecture.md lines 55, 153 (claim model = link-in-place; conflict model note)]
- [Source: _bmad-output/planning-artifacts/ux-designs/EXPERIENCE.md lines 22, 34, 45–49 (prompt placement + tone + banned list)]
- [Source: features/auth/components/account-sheet.tsx; features/memories/components/map-memory-shell.tsx; features/onboarding/components/onboarding.tsx; features/onboarding/lib/onboarding-prefs.ts]
- [Source: Story 2-1 + 2-2 (link-in-place precedent, the returning-user message); deferred-work.md (merge carve-out)]
- [Source: Stories 1.4 "Claim seam (do NOT build)"; supabase/migrations]

### Resolved with Simon (2026-06-25)
1. **Merge scope:** RESOLVED — 2-3 ships the post-payoff prompt + the verified in-place claim + the calm returning-user message. The full returning-user sign-in + cross-account map merge is **carved to Story 2.7** (a new Epic 2 story; the app's first service-role/SECURITY-DEFINER surface). 2-3 introduces no service-role path and no migration.

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

### Completion Notes List

- **Post-payoff prompt (AC2):** the keep-your-map prompt opens the existing account sheet once, right after the 4-4 hand-off is dismissed. Trigger lives in `map-memory-shell.tsx finishHandoff`, gated on `!signedIn && !readAccountPromptSeen()`, and sets a new `autoOpen` prop on `<AccountSheet>`. It reuses the sheet's signed-out body verbatim (the copy already IS the keepsake guarantee), never gates the map, is dismissible, and never re-nags (localStorage `mapsake.accountPromptSeen` + onboarding not replaying on reload). Not shown to returning or signed-in users.
- **AccountSheet (AC2):** added a minimal one-shot `autoOpen?: boolean` prop + a guarded effect (`autoOpened` ref; setState via a named fn to satisfy `react-hooks/set-state-in-effect`, same idiom as the notice effect). The persistent account button, the `?auth_error` notice effect, Esc, and vaul plumbing are all unchanged.
- **AC1 (in-place claim) — verified, not rebuilt:** no linking code touched. The first-time claim still works because sign-in keeps the same uid (2-1/2-2). The returning-user "existing" message is unchanged. The cross-account merge is Story 2.7 (carved).
- **Validation:** `pnpm exec tsc --noEmit` clean · `pnpm lint` clean · `pnpm build --webpack` clean · full e2e **60 passed, 1 skipped** (3 new account-prompt tests; all onboarding + auth tests still green — no regression from `autoOpen`).
- **Not e2e-tested:** the signed-in-user-no-prompt branch (the shared harness is anon-only); enforced by the `!signedIn` gate + the returning-user test.

### File List

- **MOD** `features/onboarding/lib/onboarding-prefs.ts` — `read/writeAccountPromptSeen` (show-once flag)
- **MOD** `features/auth/components/account-sheet.tsx` — one-shot `autoOpen` prop + guarded open effect
- **MOD** `features/memories/components/map-memory-shell.tsx` — post-payoff prompt trigger in `finishHandoff` (gated on anon + not-seen), passes `autoOpen` to `<AccountSheet>`
- **NEW** `e2e/account-prompt.spec.ts` — 3 tests (opens once after payoff; skippable + no re-nag on reload; returning user no auto-prompt)

### Change Log

- 2026-06-25 — Code review (3 layers + triage): 1 patch applied (guard the `autoOpen` prompt against a signed-in user — AC2), rest dismissed/noted. tsc/lint clean, auth + account-prompt e2e green. Status → done.
- 2026-06-25 — Implemented the post-payoff "keep your map" prompt (AC2): opens the existing account sheet once after the onboarding payoff via a new one-shot `autoOpen` prop, gated to anon-and-not-seen, suppressed by a localStorage flag, never a gate/nag. AC1 in-place claim verified (no linking code changed); returning-user message unchanged; cross-account merge remains Story 2.7. tsc/lint/build clean, 60 e2e passed. Status → review.
- 2026-06-25 — Story created (context engine + 4-agent research workflow). Scoped per Simon's decision: prompt + verified in-place claim now; cross-account merge → Story 2.7.
