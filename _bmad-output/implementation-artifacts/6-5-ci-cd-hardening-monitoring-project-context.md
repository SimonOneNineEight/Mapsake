---
baseline_commit: 5f08c2030d9991529c0ec9990fa04e10da4399bb
---

# Story 6.5: CI/CD hardening, monitoring, project-context (code-side)

Status: done

## Story

As the maintainer,
I want CI to run e2e, the app to report runtime errors, a project-context doc for the dev agent, and the flaky note test back in the suite,
so that launch-ready ops are in place (the parts that need no production secrets), with secret/DSN wiring left to Simon.

## Scope split (explicit)

This story builds ONLY the code-side of Epic-6.5. The ops actions that need production secrets or platform toggles stay with **Simon** (his explicit call):

- **Simon (ops, NOT in this story):** create the Sentry project + set `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT` in Vercel; add `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as GitHub Actions secrets and flip the `E2E_ENABLED` repo variable to `true`; confirm Vercel's Git auto-deploy (CD) posture.
- **This story (code):** the four items below land and stay green WITHOUT any of those secrets. Each is wired so it activates the moment Simon drops the secrets in.

## Acceptance Criteria

1. **Sentry is wired for Next 16 App Router** (client + server + edge init, `instrumentation.ts` register + `onRequestError`, `app/global-error.tsx`), `next.config.ts` wrapped with `withSentryConfig` outermost. With no DSN and no auth token, `tsc`/`lint`/`build` stay green and Sentry no-ops at runtime; with the DSN set, it reports. [epics 6.5 monitoring]
2. **CI runs e2e.** A Playwright job is added to `.github/workflows/ci.yml`; it stays green (skipped) until Simon sets the Actions secrets and the `E2E_ENABLED` repo variable, then runs the real suite. The existing typecheck/lint/build job is unchanged. [epics 6.5 CI/CD]
3. **`project-context.md` exists** at repo root with the stack, layering/naming conventions, subsystem map, build/test specifics, and security posture — so `create-story`/`dev-story` auto-load it (`**/project-context.md`). [epics 6.5 project-context]
4. **The quarantined note test is re-enabled** (`e2e/memory.spec.ts` `test.fixme` → `test`) and passes in a full-suite run. The fix waits for the note's own durable write (`PATCH /rest/v1/pins`) before reloading; `clickPin` is left at baseline. (The original dev-overlay/DOM-dispatch theory was disproven during dev — see Dev Notes.) [epics 6.5; carry-forward from 6-2 test-infra]

## Tasks / Subtasks

- [x] **Task 1 — Sentry wiring (AC: 1)** [instrumentation-client.ts (NEW), sentry.server.config.ts (NEW), sentry.edge.config.ts (NEW), instrumentation.ts (NEW), app/global-error.tsx (NEW), next.config.ts (MOD), package.json (MOD)]
  - [x] `pnpm add @sentry/nextjs@^10.57.0` — the `cacheComponents: true` prerender fix (getsentry/sentry-javascript#21351) shipped in 10.57.0; earlier versions break `next build` with cacheComponents on.
  - [x] Client/server/edge `Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, … })` — `dsn` undefined ⇒ Sentry no-ops, build/runtime safe.
  - [x] `instrumentation.ts`: `register()` imports the right runtime config; `export const onRequestError = Sentry.captureRequestError`.
  - [x] Wrap `next.config.ts`: `withSentryConfig(withSerwist(withNextIntl(nextConfig)), { silent: !token, sourcemaps: { disable: !token }, … })` so builds without `SENTRY_AUTH_TOKEN` skip source-map upload and stay green/quiet.
- [x] **Task 2 — e2e in CI (AC: 2)** [.github/workflows/ci.yml (MOD)]
  - [x] Add an `e2e` job gated on `if: vars.E2E_ENABLED == 'true'` (repo variable available at job-level `if`; skipped job = green check). Installs deps + `playwright install --with-deps chromium`, runs `pnpm test:e2e` with the Supabase public vars from Actions secrets.
- [x] **Task 3 — project-context.md (AC: 3)** [project-context.md (NEW)]
  - [x] Distill the existing codebase into the dev-agent context doc (no new facts invented).
- [x] **Task 4 — re-enable the note test (AC: 4)** [e2e/memory.spec.ts (MOD)]
  - [x] Wait for the note's own `PATCH /rest/v1/pins` (`waitForResponse`) before the reload, instead of the shared `已儲存` (which is `addPin.isSuccess` and lingers after `dropPin` — a false positive). `clickPin` left at baseline. Flip `test.fixme` → `test`. (The original dev-overlay / DOM-dispatch hypothesis was disproven and reverted.)
- [x] **Task 5 — Validation (AC: all)** [no new behavior beyond the above]
  - [x] `tsc --noEmit` + `pnpm lint` + `pnpm build` clean with NO Sentry secrets present (proves the no-DSN/no-token path stays green). Run the full `pnpm test:e2e` green INCLUDING the re-enabled note test.

## Dev Notes

- **Sentry version is load-bearing:** `cacheComponents: true` + Sentry < 10.57.0 throws `next-prerender-current-time` during `next build`. Pin `>= 10.57.0`. [research: getsentry/sentry-javascript#21333, #21351]
- **Build path is `next build --webpack`** (Serwist needs webpack). Sentry's webpack source-map plugin is the well-supported path; `withSentryConfig` outermost so it sees Serwist's + next-intl's output. [next.config.ts]
- **No-secret safety:** `dsn: undefined` ⇒ `Sentry.init` is a no-op; `sourcemaps.disable` + `silent` gated on `SENTRY_AUTH_TOKEN` ⇒ no upload attempt, green build. This is what keeps the story shippable before Simon wires the DSN. [research: build options]
- **e2e/CD already partly exist:** `ci.yml` runs typecheck/lint/build; Vercel auto-deploys `main` (CD). The gap is e2e-in-CI; gate it on a repo VARIABLE (not a secret — secrets aren't readable in job-level `if`) so the check is green-skipped until enabled. [.github/workflows/ci.yml, playwright.config.ts]
- **Flaky note test root cause (corrected during dev):** NOT the click/overlay. The card opens fine with the baseline `page.mouse.click`; the failing runs showed the card OPEN with the note absent (the "＋ 寫筆記" button instead of the textarea). The shared `已儲存` indicator is `addPin.isSuccess` (the create; MapCanvas.tsx:471), which lingers after `dropPin`, so asserting it after the note blur is a false positive that never waits for the note's own write — under load the reload beat the note `PATCH /rest/v1/pins` and lost it. Even the original `page.mouse.click` failed ~3/4 under repeat, confirming the click was never the cause. Fix: `waitForResponse` on the note PATCH before reload. [e2e/memory.spec.ts, features/pins/queries/pins-queries.ts, features/map/components/MapCanvas.tsx]

### References
- [Source: epics.md#Story-6.5; architecture ops; 6-2 test-infra carry-forward; deferred-work.md]
- Sentry Next.js manual setup, build options; getsentry/sentry-javascript#21351 (cacheComponents fix in 10.57.0).

## Dev Agent Record

### Agent Model Used

claude-opus-4-8[1m]

### Debug Log References

- `tsc --noEmit` + `pnpm lint` clean. `pnpm build` (`next build --webpack`) clean with NO Sentry env (`DSN=unset TOKEN=unset`): "Cache Components enabled", `/` stays `○` static (Sentry didn't make it dynamic), Serwist SW still bundles, no Sentry log noise. Installed `@sentry/nextjs 10.62.0` (satisfies `>=10.57.0`).
- Full `pnpm test:e2e` (workers=1, retries=2): **107 passed, 0 failed** in 1.4m, including the re-enabled note test. The re-enabled note test also passed **6/6 with retries=0** in isolation after the fix (17.6s).

### Completion Notes List

- **Sentry (AC1):** added `@sentry/nextjs@10.62.0` + 5 wiring files (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts` with `register()`+`onRequestError`, `app/global-error.tsx` with a zh-TW fallback). `next.config.ts` wraps `withSentryConfig` OUTERMOST around `withSerwist(withNextIntl(...))`, with `silent` + `sourcemaps.disable` gated on `SENTRY_AUTH_TOKEN` so token-less builds stay green/quiet. DSN unset ⇒ `Sentry.init` no-ops. Pinned `>=10.57.0` (the cacheComponents prerender fix).
- **CI e2e (AC2):** added a gated `e2e` job to `ci.yml` (`if: vars.E2E_ENABLED == 'true'`). Skipped = green until Simon sets the two Supabase Actions secrets + flips the repo variable. `verify` job unchanged.
- **project-context.md (AC3):** distilled the codebase into a root dev-agent doc (stack, layering, conventions, build/test specifics, secrets posture). Auto-loaded by create-story/dev-story via `**/project-context.md`.
- **Re-enabled note test (AC4) — corrected diagnosis:** the old quarantine blamed the dev-overlay eating the post-reload click. Empirically FALSE: the original `page.mouse.click` opens the card fine; the failures showed the card open with the note ABSENT. Real cause: the shared "已儲存" indicator is `addPin.isSuccess` (the create, MapCanvas.tsx:471), which stays visible after `dropPin`, so asserting it after the note blur is a FALSE POSITIVE that never waits for the note's own write — under load the reload beat the note PATCH and lost it. Fix: wait for the note's own `PATCH /rest/v1/pins` (`waitForResponse`) before reloading; `clickPin` left as the original (my earlier DOM-dispatch/verify-retry experiments were reverted as unnecessary — surgical). Flipped `test.fixme` → `test`.
- No production secrets touched. Ops (Sentry project + DSN/auth-token in Vercel, Actions secrets + `E2E_ENABLED` variable) remain with Simon.

### File List

- `package.json` (MOD — `@sentry/nextjs` dep), `pnpm-lock.yaml` (MOD)
- `next.config.ts` (MOD — `withSentryConfig` wrap, token-gated)
- `instrumentation-client.ts` (NEW), `sentry.server.config.ts` (NEW), `sentry.edge.config.ts` (NEW), `instrumentation.ts` (NEW), `app/global-error.tsx` (NEW)
- `.github/workflows/ci.yml` (MOD — gated `e2e` job)
- `project-context.md` (NEW)
- `e2e/memory.spec.ts` (MOD — note test: wait for the note PATCH before reload; re-enabled `test.fixme`→`test`; clickPin unchanged from baseline)

### Change Log

- 2026-06-26 — Story created (code-side of 6.5; ops gated to Simon).
- 2026-06-26 — Dev-story complete. Sentry wired (no-secret-safe, cacheComponents-safe), e2e-in-CI gated on `E2E_ENABLED`, project-context.md generated, note test re-enabled by fixing the real root cause (note-write-vs-reload race, not the click). tsc/lint/build clean; full e2e 107 passed. Status → review.
</content>
