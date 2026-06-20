---
baseline_commit: NO_VCS
---

# Story 1.1: Project scaffold, tokens & deploy pipeline

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As the builder (Simon),
I want the project initialized on the chosen stack, themed to the design tokens, and deploying through CI,
so that every later story builds on a consistent, live, conventions-enforcing foundation.

## Acceptance Criteria

1. **Scaffold runs locally.** Running `pnpm create next-app --example with-supabase mapsake` produces a Next.js 16 (App Router, TypeScript, Turbopack) + Tailwind + Supabase-auth app that starts with `pnpm dev` and renders without errors.
2. **Design tokens wired.** The DESIGN.md light-theme tokens (palette, radii, spacing) are available as Tailwind theme values + CSS variables, and the four fonts (Newsreader, Nunito Sans, Noto Serif TC, Noto Sans TC) load via `next/font` with the mixed-script stacks (Latin-first, Noto-TC fallback). A throwaway sample page shows a parchment background, a Newsreader/Noto-Serif-TC title, and a terracotta primary button using the tokens.
3. **Foundational structure + conventions in place.** The feature-first folder skeleton from the architecture exists (`src/app`, `src/features/`, `src/components/ui`, `src/data`, `src/lib/supabase`, `src/types`, `supabase/`, `messages/`), with TypeScript `strict`, ESLint, and Prettier configured. `shadcn/ui` is initialized and themed to the tokens (one sample primitive imported to prove theming).
4. **Supabase project linked.** A Supabase project exists and is wired via env vars (`.env.local` from `.env.example`); `lib/supabase/{browser,server}.ts` clients work; **no secrets are committed** (`.env.local` gitignored; only `.env.example` is tracked).
5. **CI + deploy live.** Pushing to GitHub runs CI (typecheck + lint) and the app deploys to Vercel with a reachable URL; env vars are configured in Vercel.

## Tasks / Subtasks

> Local build complete and verified. **Two account-gated subtasks (Supabase project creation, Vercel/GitHub connect) remain for Simon** — see Dev Agent Record › Handoff Checklist. Story stays `in-progress` until those land (AC4/AC5 not fully met by an agent).

- [x] **Task 1 — Scaffold the app (AC: 1)**
  - [x] Ran `pnpm create next-app --example with-supabase` (installed Next.js **16.2.9**, React 19, Node 25 local / CI pinned 20) and merged to repo root.
  - [x] `pnpm dev` runs; clean scaffold committed as the baseline.
  - [x] `pnpm` is the package manager (pnpm-lock.yaml; no npm/yarn locks).
- [x] **Task 2 — Design tokens → Tailwind theme + CSS variables (AC: 2)**
  - [x] DESIGN.md **light** palette ported to `:root` in `app/globals.css` (canvas, surface, region-visited, region-border, text-primary/muted, terracotta-text, accent-glow). **No dark/Lamplight tokens** added.
  - [x] Mapped into the Tailwind theme (semantic + brand tokens) + radii (8px default). _Note: the official example ships **Tailwind v3**, not v4 — wired the v3 config accordingly (see Deviations)._
  - [x] Fonts via `next/font`: Newsreader + Nunito Sans (Latin), Noto Serif TC + Noto Sans TC (CJK), mixed-script stacks (Latin-first, Noto-TC fallback) exposed as `--font-*` vars; CJK loaded with `preload:false`.
  - [x] Sample page (`app/page.tsx`) proves parchment bg, Newsreader + Noto Serif TC title, the terracotta primary button, and a token-swatch row. **Verified live via screenshot.**
- [x] **Task 3 — Folder skeleton + conventions (AC: 3)**
  - [x] Created feature-first skeleton at repo root: `features/{map,regions,pins,memories,auth,onboarding,notifications,settings}`, `data/`, `lib/{supabase,i18n,push}/`, `messages/zh-TW.json`, `supabase/migrations/`, `scripts/`, `e2e/`. _(Root layout, not `src/` — the example's convention; see Deviations.)_
  - [x] TypeScript `strict` (from starter); ESLint configured (fixed the example's missing react-hooks plugin + ignored non-app dirs).
  - [x] shadcn/ui **already initialized by the example** (components.json + ui primitives); re-themed via the token CSS variables so primitives read as Mapsake. (Vaul Drawer comes with Epic 3.)
- [~] **Task 4 — Supabase project + clients + secrets (AC: 4)** — _local parts done; project creation pending Simon_
  - [ ] **(Simon)** Create the Supabase project; paste URL + publishable/anon key into `.env.local`.
  - [x] Supabase clients (`lib/supabase/client.ts` browser, `server.ts`, `proxy.ts`) load and compile; app boots in pre-Supabase mode with env empty. (service-role client added when a server route needs it — Story 1.3+.)
  - [x] `.gitignore` covers `.env*.local`; only `.env.example` is tracked. Verified `.env.local` is git-ignored (no secrets committed).
- [~] **Task 5 — CI + Vercel deploy (AC: 5)** — _CI authored; deploy pending Simon_
  - [x] Added `.github/workflows/ci.yml`: pnpm install + `tsc --noEmit` + `pnpm lint` (build gated on Vercel / once secrets added).
  - [ ] **(Simon)** Push to GitHub + connect Vercel; set Supabase env vars in Vercel; confirm a live deploy URL.
- [x] **Task 6 — Smoke verification (local)**
  - [x] `pnpm build` succeeds (all 14 routes prerender). Typecheck + lint green. Sample page renders tokens/fonts correctly (screenshot captured). _CI-green-on-PR confirms once the GitHub repo exists (Simon)._

## Dev Notes

### Stack & versions (verified June 2026 — confirm at run time)
- **Next.js 16.2.x** (App Router, Turbopack default, Node 20+). [Source: architecture.md#Foundation Decisions; #Starter Template Evaluation]
- **Tailwind CSS v4**; **TypeScript strict**. [Source: architecture.md#Starter Template Evaluation]
- **Supabase** (Postgres BaaS) — auth/storage/realtime/RLS; cookie-based SSR auth from the `with-supabase` example. [Source: architecture.md#Foundation Decisions]
- **shadcn/ui** (Radix + Tailwind, copy-in) supports Tailwind v4 + Next.js 16; theme to DESIGN.md tokens. **Vaul Drawer** (bottom sheet) arrives with Epic 3, not here. [Source: architecture.md#Implementation Patterns › UI component strategy]
- **pnpm** is the package manager (global rule). **Hosting** = Vercel (frontend + Cron) + Supabase. [Source: architecture.md#Foundation Decisions]
- Deferred to their own stories (do NOT build here): schema/RLS (Story 1.3), anon auth (1.3), map/tiles (1.2), Serwist PWA (4.5), next-intl full wiring (6.1), push (Epic 5).

### Conventions the dev MUST follow [Source: architecture.md#Implementation Patterns]
- **Casing boundary (critical):** snake_case lives ONLY in SQL + Supabase generated types; convert to camelCase in the `src/data/` layer. No snake_case above the data layer. (No DB yet, but establish the `data/` directory + the rule now.)
- **Files:** components `PascalCase.tsx`; other modules `kebab-case.ts`. Routes/segments kebab-case.
- **Structure:** feature-first; Server Components by default, `'use client'` only where interactive. `components/ui/` = shadcn; `src/data/` is the only importer of the Supabase client for queries; **service-role key server-only**.
- **Tokens, not hardcoded values:** all color/spacing/type come from the theme/tokens; never hardcode hex in components. `accent #C8893B` is non-text only.
- **Anti-patterns:** snake_case in React code; hardcoded colors; committing secrets; adding the dark theme; pulling future-story deps into the scaffold.

### Visual identity source of truth
- DESIGN.md (`ux-designs/ux-travel-map-2026-06-16/DESIGN.md`) frontmatter holds the exact token values + typography stacks. v1 is **light-only**. Mockup reference for later screens: `mockups/key-screens-pins.html` (current, pin model). [Source: DESIGN.md; EXPERIENCE.md#Foundation]

### Project Structure Notes
- Matches `architecture.md#Project Structure & Boundaries` exactly. Create feature subfolders lazily (only as a story needs them) per the "tables/dirs only when needed" rule, but the top-level skeleton + `data/`, `lib/supabase/`, `components/ui/`, `messages/` should exist now so conventions are enforced from story 1.
- `[locale]/` segment is created as a placeholder; full next-intl wiring is Story 6.1. zh-TW is the default locale.

### Testing standards
- Playwright e2e in `e2e/` (scaffold the config; first real e2e arrives with interactive stories). Co-locate unit tests `*.test.ts(x)`. CI runs typecheck + lint + build now; tests as they appear. [Source: architecture.md#Implementation Patterns › Structure; #Infrastructure]

### References
- [Source: epics.md#Epic 1 › Story 1.1]
- [Source: architecture.md#Foundation Decisions]
- [Source: architecture.md#Starter Template Evaluation]
- [Source: architecture.md#Implementation Patterns & Consistency Rules]
- [Source: architecture.md#Project Structure & Boundaries]
- [Source: DESIGN.md (tokens, typography, light-only)]
- [Source: EXPERIENCE.md#Foundation (zh-TW primary, PWA)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — dev-story

### Debug Log References

- ESLint: example pinned `eslint-config-next@15.3.1` against Next 16 and was missing `eslint-plugin-react-hooks` → installed the plugin (kept 15.3.1 to match the flat-config wrapper; bumping to 16 broke FlatCompat).
- ESLint scanned BMAD planning dirs → added `ignores` for `_bmad/`, `_bmad-output/`, `.claude/`, `design-artifacts/`, `docs/`.
- `tailwind.config.ts` used `require()` → converted to ESM import (no-require-imports).
- Dev server crashed on boot: the auth proxy/middleware threw `Invalid supabaseUrl` because the example's placeholder env (`your-project-url`) is truthy-but-invalid. Set `.env.local` values **empty** so `hasEnvVars` is false → proxy skips → app boots pre-Supabase.

### Completion Notes List

- Scaffolded Next.js 16.2.9 + Supabase (`with-supabase`) at repo root; themed entirely to DESIGN.md light tokens; dual-script fonts via `next/font`; dark mode removed (light-only v1). **Verified:** `pnpm build` (14 routes prerender), typecheck + lint green, and the running app screenshotted (parchment + terracotta + Newsreader/Noto Serif TC all correct).
- **Deviations from the story (all reasonable, documented):**
  1. **Tailwind v3**, not v4 — the official `with-supabase` example ships Tailwind 3.4.x. Tokens wired into the v3 config + CSS variables. (Upgrading to v4 is a separate, optional task; not needed for v1.)
  2. **Root layout, not `src/`** — the example places `app/`, `lib/`, `components/` at the repo root. Followed the scaffold's convention (and its `@/*` path aliases) rather than fighting it; created `features/`, `data/`, etc. at root. Architecture's `src/`-prefixed paths map 1:1 to root paths.
  3. **Supabase client filenames** — example uses `lib/supabase/client.ts` (browser) + `server.ts` + `proxy.ts`, not `browser.ts`. Kept the example's names.
  4. shadcn/ui was **already initialized** by the example (no separate init needed).
- **Not built (correctly deferred):** schema/RLS + anon auth (1.3), map/tiles (1.2), real auth flows (Epic 2), Serwist PWA (4.5), next-intl wiring (6.1), push (Epic 5).

### Handoff Checklist (Simon — completes AC4 & AC5)

1. **Supabase project:** create a project at app.supabase.com → Settings > API → paste `NEXT_PUBLIC_SUPABASE_URL` and the publishable/anon key into `.env.local`. Re-run `pnpm dev`; the auth pages then work against the project.
2. **GitHub:** create a repo and push (`git remote add origin … && git push -u origin main`). CI (`.github/workflows/ci.yml`) runs typecheck + lint on push.
3. **Vercel:** import the repo, add the two `NEXT_PUBLIC_SUPABASE_*` env vars, deploy → live URL. (Optional: uncomment the `pnpm build` step in CI once the secrets are in GitHub Actions too.)

Once 1–3 are done, AC4 + AC5 are satisfied → run `bmad-code-review`, which marks the story done.

### Change Log

- 2026-06-20 — Story 1.1 implemented (local scaffold). Next.js 16 + Supabase + DESIGN.md tokens + dual-script fonts + light-only + feature skeleton + CI workflow + git baseline. Build/typecheck/lint green; running app verified by screenshot. Account-gated AC4/AC5 steps handed to Simon (checklist above).

### File List

**Added**
- `.github/workflows/ci.yml`
- `features/{map,regions,pins,memories,auth,onboarding,notifications,settings}/.gitkeep`
- `data/.gitkeep`, `lib/i18n/.gitkeep`, `lib/push/.gitkeep`, `supabase/migrations/.gitkeep`, `scripts/.gitkeep`, `e2e/.gitkeep`
- `messages/zh-TW.json`
- _(plus the full Next.js + Supabase scaffold at repo root: `app/`, `components/`, `lib/`, `package.json`, configs, etc.)_

**Modified**
- `app/globals.css` — replaced shadcn neutral theme with DESIGN.md light palette + brand tokens; removed `.dark` block.
- `tailwind.config.ts` — tokens via `var(--x)`, brand colors, dual-script `fontFamily`, ESM plugin import, removed `darkMode`/chart.
- `app/layout.tsx` — four `next/font` families + mixed-script vars; removed `next-themes`/ThemeProvider (light-only); `lang="zh-Hant"`.
- `app/page.tsx` — replaced starter demo with the Mapsake token/font sample.
- `app/protected/layout.tsx` — removed ThemeSwitcher usage.
- `eslint.config.mjs` — ignore non-app dirs.
- `package.json` — added `eslint-plugin-react-hooks` (+ kept `eslint-config-next@15.3.1`).
- `.env.local` — emptied Supabase vars (gitignored) so the app boots pre-Supabase.
- `.gitignore` — ignore the local screenshot + `.playwright-mcp/`.

**Removed**
- `components/theme-switcher.tsx` (dark-mode toggle; light-only v1).
