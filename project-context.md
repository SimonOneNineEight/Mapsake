# Project Context — Mapsake (travel-map)

Dev-agent guardrails for the BMM `create-story` / `dev-story` loop. Distilled from the codebase; when this
doc and the code disagree, the code wins — fix this doc. Keep it short.

## What it is

Mapsake is a private, web-first, **zh-TW-primary** travel-memory keepsake map (light theme only in v1). You
mark regions you've visited and drop named **point pins** ("memories") inside them; an opt-in daily web-push
"re-live" loop resurfaces an old memory ("一年前的今天…"). Single user per account; anonymous-first, claimable.

## Stack

- **Next.js 16** App Router, **React 19**, **TypeScript**. `cacheComponents: true` is ON.
- **Tailwind v3** (not v4) + a small shadcn-style `components/ui` set; `class-variance-authority` + `tailwind-merge`.
- **Supabase** — Postgres + Auth (anonymous + email magic-link + Google) + Storage; `@supabase/ssr` cookie sessions; **RLS on every table**.
- **MapLibre GL JS 5** + **pmtiles** (admin-1 boundary tiles built by `scripts/`); dynamic-imported client-side only.
- **@tanstack/react-query v5** for client data; **vaul** for drawers/sheets; **lucide-react** icons.
- **next-intl 4** single-locale (zh-TW). **Serwist** service worker (PWA/offline). **web-push** (server-only) for notifications. **@sentry/nextjs** for monitoring.
- Package manager is **pnpm** only. Never `npm`.

## Layering & where things go

- `app/` — App Router routes, `layout.tsx`, `providers.tsx`, `sw.ts` (Serwist SW source), `api/*/route.ts` (e.g. the cron `on-this-day`), and `global-error.tsx` (the Sentry error boundary). The Sentry `instrumentation*.ts` + `sentry.*.config.ts` live at the **repo root** (Next requires them there), not under `app/`.
- `features/<domain>/` — domain UI + logic, grouped `components/`, `hooks/`, `lib/` (pure), `queries/` (react-query). Domains: `auth, map, memories, notifications, onboarding, pins, places, pwa, regions, settings`.
- `data/*.ts` — the data-access layer: typed reads/writes against Supabase (RLS-scoped to the caller). Client mutations flow through react-query in `features/*/queries`.
- `lib/` — cross-cutting: `lib/supabase/{client,server,admin}.ts`, `lib/i18n/request.ts`, `lib/push/*`, `lib/utils.ts`.
- `messages/zh-TW.json` — the i18n catalog (namespaced). `components/ui/` — shared primitives. `supabase/migrations/` — SQL. `e2e/` — Playwright.

## Conventions that bite if ignored

- **i18n + cacheComponents:** `lib/i18n/request.ts` `getRequestConfig` returns a **hardcoded** `zh-TW` and must NOT read `requestLocale`/`headers()` — a dynamic read would make every translated page dynamic and break the static route table. User-facing strings live in `messages/zh-TW.json` via `useTranslations`; a few server/lib strings are intentionally hardcoded zh-TW (push copy, "其他").
- **Build path:** `next dev` runs Turbopack (SW disabled); production is **`next build --webpack`** because Serwist compiles the SW via webpack. The empty `turbopack: {}` in `next.config.ts` is load-bearing — don't remove it.
- **cacheComponents rules:** no `Date.now()` / `Math.random()` / `headers()` / uncached fetches inside cached (default) render paths; a route that reads request headers (e.g. the cron auth) is inherently dynamic — don't add `export const runtime`/`dynamic` (Next 16 rejects `runtime` here).
- **Secrets posture:** `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN` are **server-only — never `NEXT_PUBLIC_`**. Only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `NEXT_PUBLIC_SENTRY_DSN` are public. The service-role admin client (`lib/supabase/admin.ts`) is used ONLY in cron/service paths, never in user requests.
- **Migrations are gated production writes** — applied by Simon (`supabase db push`), not by the agent. Hand-add a type bridge if a story needs new columns before types are regenerated; note it for the gated `supabase gen types`.

## Testing

- Playwright e2e in `e2e/`, run `pnpm test:e2e`. **Shared anonymous session**: `auth.setup.ts` signs in once → `storageState` (`e2e/.auth/anon.json`); `fixtures.ts` deletes the anon user's own rows before each test (RLS-safe, never service-role) for a clean slate without per-test sign-in (dodges the rate limit).
- `playwright.config.ts`: **`workers: 1`** + **`retries: 2`** + SwiftShader WebGL flag (`--enable-unsafe-swiftshader`) — MapLibre needs a real WebGL context and 2 concurrent software-rendered maps starve each other. Don't raise workers.
- The e2e `clickPin` helper zooms to z15, waits for the `pins-marker` feature, projects its coordinate, and clicks via `page.mouse.click` over the `map-canvas` bbox. A 6-5 investigation disproved the "Next dev-overlay eats the pin click" theory: the old note-test flake was actually a write-vs-reload race — the shared `已儲存` is `addPin.isSuccess` and lingers after a create, so wait for an edit's own `PATCH /rest/v1/pins` before asserting persistence across a reload.

## Monitoring (Story 6.5)

Sentry is wired (`instrumentation*.ts`, `sentry.*.config.ts`, `app/global-error.tsx`, `withSentryConfig` outermost in `next.config.ts`). With `NEXT_PUBLIC_SENTRY_DSN` unset it **no-ops**; source-map upload is gated on `SENTRY_AUTH_TOKEN`, so token-less builds stay green. Pin `@sentry/nextjs >= 10.57.0` (the `cacheComponents` prerender fix).

## House rules

Simplicity first (minimum code that solves it; no speculative abstraction). Surgical changes (touch only what the story needs; match surrounding style). zh-TW for all user-facing copy. Commits go to `main`, **no Co-Authored-By lines**, pnpm only.
