# Story 2.3: Claim your map (link anon session to account)

Status: ready-for-dev

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

- [ ] **Task 1 — Post-payoff prompt trigger, once, after the payoff (AC: 2)** [features/memories/components/map-memory-shell.tsx]
  - [ ] After the 4-4 hand-off is dismissed (`finishHandoff` → `setOnboarding(null)`), surface the "keep your map" prompt **once** — but ONLY for the user who just FINISHED onboarding this run, NOT a returning user who loads with `onboarding` already `null`. `finishHandoff` is the clean transition signal; trigger the prompt there (not on every mount). Do NOT touch the 4-4 hand-off card itself (it deliberately stays account-free so the payoff lands clean — Story 4.4 Dev Notes).
  - [ ] Skip entirely if the user is already signed in (`useAccount().signedIn` / `!isAnonymous && email`).
  - [ ] Persist a show-once flag so the prompt never re-nags across reloads (e.g. `mapsake.accountPromptSeen` in localStorage, mirroring the `onboarding-prefs` pattern in `features/onboarding/lib/`). Set it when the prompt is shown OR dismissed. Never show twice.
- [ ] **Task 2 — Open the existing AccountSheet from the prompt (AC: 2)** [features/auth/components/account-sheet.tsx]
  - [ ] AccountSheet is the intended reusable surface (its own header comment: "the Story 2-3 post-payoff prompt opens this same surface"). Today `open` is purely internal state. Add a minimal **controlled-open** affordance so the shell can open it once — e.g. an optional `open?: boolean` + `onOpenChange?` prop, OR a one-shot `autoOpen?: boolean` prop. Keep the persistent account-button trigger working unchanged. Prefer the smallest change that doesn't fork the open/close plumbing (the desktop-modal Esc effect + vaul `onOpenChange` must still work).
  - [ ] The prompt reuses the existing signed-out `body` verbatim — title 「保存你的地圖」 + 「登入後，你的地圖就能在不同裝置上保存。」 + the Google button + 「或」 + the email form. That copy already IS the keepsake guarantee, so **no new sheet UI is required**. (Optional, only if it reads better as a one-time invitation than the persistent panel: a softer headline variant — confirm copy with Simon before adding; default is reuse-verbatim.)
- [ ] **Task 3 — Verify AC1 (no regression) + returning-user floor unchanged (AC: 1)** [no new linking code]
  - [ ] Confirm the in-place claim still works: an anon user with marks/pins who signs in (email link) keeps the SAME uid and all data (manual/e2e as feasible — the email PUT-intercept pattern from `e2e/auth.spec.ts` covers the send; the real link is the 2-1 manual check). Do not modify `sendLink`/`signInGoogle`/the callback/confirm routes for the claim — they already do link-in-place.
  - [ ] Confirm the returning-user message (`?auth_error=existing` → the "existing" notice) still renders and is unchanged. 2-3 does NOT add the real sign-in-to-existing-account or any merge (that's 2.7).
- [ ] **Task 4 — Tests (AC: 1, 2)** [e2e/auth.spec.ts or a new e2e/account-prompt.spec.ts]
  - [ ] e2e: completing onboarding (answer the view question → backfill → hand-off dismiss) surfaces the keep-your-map prompt once; the map is visible/usable behind it; dismissing closes it; a reload does NOT re-show it (suppression flag). Use the existing onboarding-driving helpers / `bypassOnboarding` patterns as references; this test must DRIVE onboarding (not bypass it) to hit the trigger.
  - [ ] e2e: a signed-in (non-anon) user does NOT get the prompt. (May be simulated via the shared-session storageState or a forced flag — see test harness notes.)
  - [ ] No-regression: full e2e suite green; `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build --webpack` clean.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-06-25 — Story created (context engine + 4-agent research workflow). Scoped per Simon's decision: prompt + verified in-place claim now; cross-account merge → Story 2.7.
