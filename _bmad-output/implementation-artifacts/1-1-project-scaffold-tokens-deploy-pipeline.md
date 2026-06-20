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

- [ ] **Task 1 — Scaffold the app (AC: 1)**
  - [ ] Run `pnpm create next-app --example with-supabase mapsake` (verify Next.js resolves to 16.2.x at run time; Node 20+).
  - [ ] Confirm `pnpm dev` runs; commit the clean scaffold as the first commit.
  - [ ] Set `pnpm` as the package manager (no `npm`/`yarn` lockfiles).
- [ ] **Task 2 — Design tokens → Tailwind theme + CSS variables (AC: 2)**
  - [ ] Port the DESIGN.md **light** palette to CSS custom properties on `:root` in `globals.css` (canvas-bg `#F2E8D5`, surface `#FBF4E4`, region-visited-fill `#B5663E`, region-border `#96835E`, text-primary `#3A2E22`, text-muted `#6F5C40`, terracotta-text `#9E4F2B`, accent `#C8893B`). **Do NOT add the dark/Lamplight tokens** (Phase 2, no v1 toggle).
  - [ ] Map them into the Tailwind v4 theme (semantic names), plus the radii (`8px` default) and spacing scale from DESIGN.md.
  - [ ] Load fonts via `next/font`: Newsreader + Nunito Sans (Latin), Noto Serif TC + Noto Sans TC (CJK). Define CSS variables for the **mixed-script stacks** (Latin font FIRST, Noto-TC fallback) per DESIGN.md typography. CJK line-height floor ~1.4; Latin-only letter-spacing/uppercase is for map labels only (not relevant yet).
  - [ ] Build a temporary `/sample` page proving: parchment bg, a Newsreader title that also renders a Chinese string in Noto Serif TC, and a terracotta primary button (`bg = terracotta-text #9E4F2B`, cream text). (Delete or keep behind a dev flag.)
- [ ] **Task 3 — Folder skeleton + conventions (AC: 3)**
  - [ ] Create the structure: `src/app/` (with `[locale]/` placeholder), `src/features/` (empty `map/ regions/ pins/ memories/ auth/ onboarding/ notifications/ settings/` dirs as features land — create as needed, not all upfront), `src/components/ui/`, `src/components/`, `src/data/`, `src/lib/{supabase,i18n,push}/`, `src/lib/utils.ts`, `src/types/`, `supabase/migrations/`, `messages/zh-TW.json`, `scripts/`, `e2e/`.
  - [ ] Enable TypeScript `strict`; configure ESLint + Prettier (match Next defaults + repo conventions).
  - [ ] `pnpm dlx shadcn@latest init`; set its CSS variables to the tokens so primitives read as Mapsake; import one primitive (e.g. Button) into `components/ui/` to prove theming. (Full chrome + the Vaul Drawer come with their feature stories.)
- [ ] **Task 4 — Supabase project + clients + secrets (AC: 4)**
  - [ ] Create the Supabase project; copy URL + anon key into `.env.local` (from `.env.example`). Keep the **service-role key out of any client path** (server-only; not needed yet).
  - [ ] Verify `lib/supabase/browser.ts` and `lib/supabase/server.ts` (from the starter) connect. Add `service-role.ts` stub marked server-only for later stories.
  - [ ] Confirm `.gitignore` covers `.env*.local`; commit only `.env.example` with placeholder keys.
- [ ] **Task 5 — CI + Vercel deploy (AC: 5)**
  - [ ] Add `.github/workflows/ci.yml`: install (pnpm), typecheck (`tsc --noEmit`), lint, build. (Tests run here once they exist.)
  - [ ] Connect the repo to Vercel; set the Supabase env vars in Vercel; confirm a preview + production deploy with a live URL.
- [ ] **Task 6 — Smoke verification**
  - [ ] App builds and deploys; sample page renders tokens/fonts correctly on desktop and a phone viewport; CI green on a test PR.

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

(to be filled by dev-story)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed — comprehensive developer guide created.

### File List
