---
baseline_commit: 2aa52c7
---

# Story 1.4: Durable anonymous session + marks store

Status: done

<!-- Validation optional. Run validate-create-story for a quality check before dev-story. -->

## Story

As a user,
I want my actions saved from the first tap without signing up,
so that nothing is lost before I create an account.

## Acceptance Criteria

1. **Anonymous session on load.** On a first visit, when the app loads, a Supabase **anonymous** session is established (`auth.signInAnonymously()`), persisted via the existing cookie-based SSR session so it survives reloads. A returning visitor reuses the same session (no new anon user per reload). [epics.md Story 1.4 AC1]
2. **Schema migration.** When migrations run, `profiles` and `region_marks` exist with the exact columns below, **owner-scoped RLS enabled**, and the specified indexes. [epics.md Story 1.4 AC2]
3. **RLS isolation.** When an anonymous user writes a `region_mark`, RLS scopes every row to their session (`user_id = auth.uid()`), and no other user's rows are readable or writable. [epics.md Story 1.4 AC3]
4. **Durable mark write path.** A `data/` access module can insert/select/delete a `region_mark` for the current user under RLS (no service-role, no custom REST). The write resolves only on Supabase ack (the durable-write contract); a transient failure surfaces for retry, never a silent drop. (The visible "saved" UI + tap interaction are Story 1.5; 1.4 establishes the data-layer contract.)
5. **Profile row exists for every (anon) user.** Establishing the session yields a `profiles` row for the user (so `region_marks.user_id → profiles` holds before the first mark insert).
6. **Local-first, no redirect-to-login.** Browsing the map at `/` (and marking, once 1.5 lands) never bounces an account-less visitor to `/auth/login`. The anonymous session makes them a first-class `user`. (Real-account-only gating stays an Epic 2 concern.)

## Tasks / Subtasks

- [x] **Task 1 — First migration: `profiles` + `region_marks` (AC: 2, 5)**
  - [x] Create `supabase/migrations/20260621120000_init_profiles_region_marks.sql` (first migration).
  - [x] `profiles` per architecture#Data Architecture: `id uuid PK references auth.users(id) on delete cascade`, `default_view text not null default 'world' check (default_view in ('world','country'))`, `focus_country text`, `locale text not null default 'zh-TW'`, `notif_enabled boolean not null default true`, `notif_time time not null default '19:00'`, `created_at timestamptz not null default now()`.
  - [x] `region_marks` per architecture#Data Architecture: `user_id uuid not null references profiles(id) on delete cascade`, `level text not null check (level in ('country','admin1'))`, `region_code text not null`, `country_code text not null`, `created_at timestamptz not null default now()`, **`primary key (user_id, region_code, level)`**.
  - [x] Indexes (named per convention): `idx_region_marks_user_id on region_marks(user_id)` and `idx_region_marks_user_id_country_code on region_marks(user_id, country_code)`.
- [x] **Task 2 — Owner-scoped RLS (AC: 2, 3)**
  - [x] `alter table profiles enable row level security;` and same for `region_marks`.
  - [x] `region_marks` policies named `region_marks_owner_<action>` for select/insert/update/delete, all `using (user_id = (select auth.uid()))`; insert/update add `with check (user_id = (select auth.uid()))`.
  - [x] `profiles` policies named `profiles_owner_<action>` scoped `id = (select auth.uid())` (profiles key is `id`, not `user_id`). Select/update/insert as needed; no delete policy required.
  - [x] Wrap `auth.uid()` as `(select auth.uid())` so Postgres caches it per-statement (Supabase RLS performance guidance).
- [x] **Task 3 — Auto-create `profiles` on signup via trigger (AC: 5)**
  - [x] In the same migration: `handle_new_user()` declared `security definer set search_path = ''` (Supabase hardening rule — prevents search-path hijack), body `insert into public.profiles (id) values (new.id) on conflict do nothing;` (fully schema-qualified), plus `create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();`.
  - [x] This fires for **anonymous** sign-ins too (anon sign-in creates a real `auth.users` row with `is_anonymous = true`), satisfying the `region_marks.user_id → profiles` FK ordering. **Decision rationale in Dev Notes.**
- [x] **Task 4 — Anonymous session bootstrap (AC: 1, 6)**
  - [x] **Prerequisite (Supabase dashboard):** enable **Authentication → Sign In / Providers → User Signups → Allow anonymous sign-ins**. **(DONE — Simon enabled it 2026-06-22; verified `signInAnonymously()` succeeds.)**
  - [x] Rework `lib/supabase/proxy.ts` `updateSession`: when env vars are set and `getClaims()` returns no user, call `supabase.auth.signInAnonymously()` (it sets the auth cookies via the existing `setAll` wiring) **instead of** redirecting `/`-and-friends to `/auth/login`. Result: every visitor has a (anon) session from first load.
  - [x] Preserve the cookie/`getClaims()` ordering warnings already in the file (do not insert code between `createServerClient` and the claims/sign-in call beyond what's required). Guard so an existing session is never replaced.
  - [x] Keep `/auth/*` reachable; leave real-account gating of `/protected/*` for Epic 2 (note, don't rebuild). Confirm the Story 1.3 tiles/`.pmtiles` matcher exclusion in root `proxy.ts` still holds.
- [x] **Task 5 — `data/` access module for region marks (AC: 4)**
  - [x] `data/region-marks.ts` — the ONLY module importing the Supabase client for `region_marks` (architecture data-boundary rule). Functions: `listRegionMarks()`, `addRegionMark({ level, regionCode, countryCode })`, `removeRegionMark({ regionCode, level })`. snake_case↔camelCase mapping at this boundary.
  - [x] Writes go through the anon-key client under RLS (no service-role, no custom `app/api` route). `user_id` is set from `auth.uid()` server-side / via the session — never trusted from the client payload.
  - [x] Document the durable-write contract in code: the function resolves on Supabase ack; callers (Story 1.5) treat "saved" as ack-gated and retain-on-failure. No optimistic persistence here.
- [x] **Task 6 — Generated DB types (AC: 2)**
  - [x] Regenerated `types/supabase.ts` via `supabase gen types typescript --linked` — replaces the hand-authored stand-in with the real generated `Database` type; tsc + lint green against it.
- [x] **Task 7 — Verify (AC: 1-6)**
  - [x] Migration applied to the linked project via `supabase db push`; `profiles` + `region_marks` confirmed present.
  - [x] RLS isolation verified (integration script, 2 anon sessions): A inserts a mark; B cannot read it (sees 0), cannot delete it (0 rows), and cannot forge a row as A (with-check rejects). A reads back its own mark; trigger-created `profiles` row confirmed. **7/7 checks PASS.**
  - [x] Reload check (browser): anon session established on load (`is_anonymous: true`), same `auth.uid()` (`78693fbf…`) after reload — cookie session durable, no fresh user.
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` green; build green. **(tsc 0, lint 0, build 0; re-verified against generated types 2026-06-22)**

### Review Findings (code review 2026-06-22)

Acceptance Auditor: all 6 ACs met; schema/RLS/data-boundary/scope all correct. Findings below are interaction effects + hardening, not AC violations.

- [x] [Review][Decision] Starter real-account scaffolding now inconsistent with local-first + a data-loss trap — With the anon session live: (a) `app/protected/page.tsx` gated only on `getClaims()`, so anon users saw the "protected" page; (b) `components/sign-up-form.tsx`'s `auth.signUp()` (with an active anon session) created a SEPARATE user and STRANDED the anon marks — silent data loss. **RESOLVED (option A, 2026-06-22):** deleted the starter `app/auth/*` + `app/protected/*` routes, the `{login,sign-up,forgot-password,update-password}-form.tsx` + `auth-button`/`logout-button` components, and `components/tutorial/`. Verified no kept file imported or linked them; build green (routes now just `/`). Mapsake's real auth + the in-place anon→account upgrade is Epic 2 (Story 2.3). (edge)
- [x] [Review][Patch] Anon bootstrap runs too broadly — now gated to top-level GET document navigations (skips prefetch/sub-resource requests) so they don't each mint orphan `auth.users`+`profiles` rows. (`/auth/*` exclusion moot — those routes deleted.) [lib/supabase/proxy.ts] (blind+edge)
- [x] [Review][Patch] `signInAnonymously()` wrapped in try/catch — a thrown network error logs + falls through instead of breaking the middleware request. [lib/supabase/proxy.ts] (blind)
- [x] [Review][Patch] `listRegionMarks` null-safety — `(data ?? [])` so a null `data` can't throw in `.map`. [data/region-marks.ts] (blind)
- [x] [Review][Patch] `addRegionMark` now returns `void` (dropped the fabricated client-clock `createdAt`); the ack is the contract and `listRegionMarks` is the source of truth. [data/region-marks.ts] (blind)
- [x] [Review][Defer] Offline/error mid-request hardening — if anon bootstrap fails open (Supabase unreachable / toggle off), marks then fail closed with no client-side re-bootstrap; `getUser()` per mark adds an auth round-trip vs `getClaims()`. Fits the offline/error-state work. [lib/supabase/proxy.ts, data/region-marks.ts] — deferred (edge)
- [x] [Review][Defer] `removeRegionMark` defense-in-depth — add `.eq("user_id", user.id)` so a future RLS misconfig can't widen the delete (RLS already scopes it correctly today). [data/region-marks.ts] — deferred (blind)

Dismissed (verified non-issues): cookie-flush after `signInAnonymously` (the `setAll` wiring updates `supabaseResponse`; proven by the live reload test — same uid persists); the `handle_new_user` trigger "amplifies orphan spray" (trigger is correct; root cause is the bootstrap breadth → the patch above); Auditor's two notes (implicit-RLS delete filter + `createdAt` approximation) — correct patterns, the latter folded into the patch.

## Dev Notes

### Scope boundary — what 1.4 does and does NOT do
- **DOES:** anon session bootstrap, first migration (`profiles` + `region_marks` + RLS + indexes + new-user trigger), the `data/region-marks.ts` access module, generated types, RLS-isolation + reload verification.
- **Does NOT:** the tap-to-mark UI / fill animation / optimistic-then-ack "saved" affordance (**Story 1.5**); visited roll-up rendering via feature-state (**Story 1.6**); `pins`/`photos` tables (**Epic 3**); account claim/upgrade (**Epic 2**). [architecture#Data Architecture; epics.md 1.5/1.6/3.x]
- **"A+ multi" pivot:** the core memory unit is a named pin within an admin-1 region; visited *rolls up* from pins + explicit marks with **no downward cascade**. 1.4 stores ONLY explicit `region_marks`; roll-up is computed client-side later. Do NOT persist rolled-up/derived country state. [architecture#Core-unit pivot]

### Data model (authoritative — from architecture#Data Architecture)
```
profiles(id uuid PK→auth.users, default_view text['world'|'country'] default 'world',
         focus_country text NULL, locale text default 'zh-TW',
         notif_enabled bool default true, notif_time time default '19:00',
         created_at timestamptz default now())

region_marks(user_id uuid→profiles, level text['country'|'admin1'],
             region_code text, country_code text, created_at timestamptz,
             PRIMARY KEY(user_id, region_code, level))   -- idx (user_id),(user_id,country_code)
```
- **Region identity = ISO codes, never dataset IDs.** `region_code` = ISO 3166-1 alpha-2 for countries (`JP`, `US`) or ISO 3166-2 for admin-1 (`JP-26`, `US-CA`); `country_code` = alpha-2 (`JP`, `US`). These are exactly the `iso`/`country` props baked into the Story 1.2 tiles, so the client (which knows the feature under the tap via MapLibre) sends both codes — **no server-side point-in-polygon.** [architecture#Data Architecture; Story 1.2 tile props]
- `level` discriminates `'country'` vs `'admin1'` so Story 1.6 can tell an explicit country mark from a rolled-up one. The composite PK `(user_id, region_code, level)` makes a re-tap a no-op upsert (Story 1.5 relies on this).
- A bare mark is a complete entry (PRD FR15) — never modeled as "incomplete."

### Anonymous session (architecture + EXPERIENCE local-first)
- **Mechanism:** Supabase native anonymous auth — `supabase.auth.signInAnonymously()` creates a real `auth.users` row with `is_anonymous = true`, so RLS `auth.uid()` works uniformly for anon and (later) real accounts. [architecture#local-first; epics.md 1.4 AC1]
- **Durability:** the same cookie-based SSR session the starter already uses (`@supabase/ssr` `createServerClient` + `cookies.getAll/setAll` in `lib/supabase/{server,proxy}.ts`; `proxy.ts` refreshes via `getClaims()`). NOT localStorage, NOT a custom device id. Story 2.1 reuses this exact session for real accounts. [verified in repo files]
- **Claim seam (Epic 2, do NOT build):** Story 2.3 links the anon session to a real account in place (Supabase `linkIdentity`/`updateUser` on the same `auth.users` row), so existing `region_marks.user_id` rows are preserved with no migration. Keep `user_id = auth.uid()` as the single ownership key so the upgrade "just works." [epics.md Story 2.3]

### Files being modified — current state (read before editing)
- `lib/supabase/proxy.ts` — `updateSession()` currently **redirects any non-`/`, non-`/auth`, non-`/login` request without a user to `/auth/login`** (lines 50-60). `/` is already exempt, so the map home loads. **Task 4 reworks this** to establish an anon session instead of redirecting, so account-less users are first-class. Preserve the documented `createServerClient`→`getClaims()` ordering and the cookie return contract. Must not break the Story 1.3 root-`proxy.ts` matcher that exempts `tiles`/`.pmtiles`.
- `lib/supabase/client.ts` — browser client, exports `createClient()` (`createBrowserClient`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). Use for client-side reads/writes via `data/`.
- `lib/supabase/server.ts` — server client, exports `createClient()` (`createServerClient` + `cookies()`). Use in Server Components / Server Actions.
- Env var name is `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (NOT the legacy `..._ANON_KEY`). `.env.local` has real keys (Story 1.1 / Simon's checklist).

### Data-access boundary + sync contract (architecture#Frontend/Data)
- `data/` is the ONLY place that imports the Supabase client for queries and does snake_case↔camelCase mapping. Features import from `data/`, never raw Supabase. CRUD = UI → (TanStack Query hook, Story 1.5+) → `data/` → Supabase (RLS-enforced). **No custom REST surface for CRUD**; `app/api/` is only for secret/scheduled work (none here). Never the service-role key on the client. [architecture data-boundary rules]
- **Durable-write contract (v1):** UI shows "saved" only after server ack; **online writes only**; offline = read-only cached shell + calm "viewing only — reconnect to add" banner; reads refetch-on-focus / pull-to-refresh; **NO Realtime, NO offline outbox** (both documented fast-follow). On transient failure: retain the edit + calm retry, never an "unsaved"/loss message. [architecture#Frontend; EXPERIENCE.md Saving/sync + Offline rows]. 1.4 encodes the ack-gated path in `data/`; the visible affordance is Story 1.5.
- "No data loss is the cardinal sin" — PRD NFR1 + counter-metric (target zero). The anon session's durability is the Epic 1 down-payment on **FR2** ("persists durably; survives logout, reinstall, device change").

### Migrations & types
- Location `supabase/migrations/` (first migration — dir has only `.gitkeep`). Plain SQL, Supabase CLI naming. Applied via Supabase CLI in CI. After applying, regenerate types into `types/` (source of truth for DB shapes). [architecture#supabase tree]

### Decisions made in authoring (flag if you disagree)
1. **`profiles` creation = DB trigger** (`handle_new_user` on `auth.users` insert), not app-side upsert — the `region_marks → profiles` FK requires the profile to exist before the first mark, and the trigger fires automatically for anon sign-ins. (Architecture leaves this unspecified.)
2. **Anon sign-in location = `lib/supabase/proxy.ts` middleware** (replace the login redirect), so "session established when the app loads" (AC1) holds before any write, guarded against replacing an existing session. (Alternative: lazy on first write — rejected; weaker AC1 guarantee.)
3. **Scope excludes `pins`/`photos`** — epics AC names only `profiles` + `region_marks`.

### Likely external gate (like 1.1 deploy / 1.2 global tiles)
Applying the migration + generating types + the RLS-isolation check need the **Supabase CLI** and the **linked project** (or `supabase start` locally). Plus the **"Allow anonymous sign-ins" dashboard toggle** (Task 4 prerequisite). If the CLI/link/toggle aren't set up, code can be authored + typechecked, but AC1/AC2/AC3 live-verification is gated on Simon. Note in Completion Notes if gated.

### Conventions (from architecture + prior stories)
- Flat repo, NO `src/` (architecture tree shows `src/*`; real paths are `/data`, `/features`, `/lib`, `/app`, `/types`). snake_case DB, plural tables, `created_at`, RLS `<table>_owner_<action>`. Tailwind v3, light-only, zh-TW primary. No Co-Authored-By in commits; pnpm.

### Project Structure Notes
- New: `supabase/migrations/<ts>_init_profiles_region_marks.sql`, `data/region-marks.ts`, `types/supabase.ts` (generated). Modified: `lib/supabase/proxy.ts` (anon bootstrap). Possibly `data/profiles.ts` if a profile read is needed.

### Testing standards
- RLS isolation is the headline test (two anon sessions, cross-read denied). Reload-durability check (same `auth.uid()` after reload). Keep DB-touching checks out of the unit suite if no DB in CI; document the manual/integration result. tsc + lint + build green.

### References
- [Source: epics.md#Epic 1 › Story 1.4]
- [Source: architecture.md#Data Architecture; #Frontend Architecture; #local-first; #supabase tree]
- [Source: PRD FR2/FR6/FR7/FR15, NFR1/NFR3]
- [Source: EXPERIENCE.md#State Patterns (Saving/sync, Offline); #Foundation (account placement/tone)]
- [Source: 1-1 (Supabase clients, env var name); 1-2 (tile ISO props); 1-3 (proxy matcher)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context) — dev-story

### Debug Log References

- **Validation (2026-06-21):** initially blocked (the Bash safety classifier was temporarily unavailable) — code was authored but unvalidated. Once it recovered, ran `pnpm exec tsc --noEmit` (exit 0), `pnpm lint` (exit 0), `pnpm build` (exit 0, 14 routes, middleware compiled). Code Tasks 1–5 + the Task 7 static-check subtask checked; DB-apply/RLS/reload + the dashboard toggle + CLI type-regen remain gated (Task 4 prereq, Tasks 6/7).
- **Anon sign-in in middleware:** replaced the starter's redirect-to-`/auth/login` with `supabase.auth.signInAnonymously()` guarded by `!user`. Wrapped so a disabled "Allow anonymous sign-ins" toggle logs + falls through (serves the page anonymously) rather than throwing/redirect-looping.

### Completion Notes List

- **Authored (NOT yet validated):**
  - `supabase/migrations/20260621120000_init_profiles_region_marks.sql` — `profiles` + `region_marks` (composite PK `(user_id, region_code, level)`), 2 indexes, owner-scoped RLS (`(select auth.uid())`), and a `security definer set search_path = ''` `handle_new_user()` trigger that seeds a profile on every (incl. anonymous) signup. [Tasks 1-3]
  - `lib/supabase/proxy.ts` — anon-session bootstrap replacing the login redirect (local-first). [Task 4]
  - `data/region-marks.ts` — list/add/remove under RLS, casing boundary, ack-gated durable-write contract; add upserts (re-mark = no-op). [Task 5]
  - `types/supabase.ts` — hand-authored `Database` type matching the migration; **must be regenerated** via `supabase gen types typescript --linked` once the project is reachable. [Task 6]
- **Validation — PASSED:** tsc 0, lint 0, build 0 (14 routes, `Proxy (Middleware)` compiled); re-verified after type regen.
- **Gate CLEARED (2026-06-22):** Simon enabled "Allow anonymous sign-ins"; CLI installed; `supabase init` + `supabase link` + `supabase db push` applied the migration to the linked project; `types/supabase.ts` regenerated. Tables confirmed present.
- **Live verification — ALL PASS:** RLS-isolation integration script 7/7 (anon sessions distinct, insert under RLS, B cannot read/delete/forge A's rows, trigger profile created). Browser reload check: anon session on load + same `auth.uid()` after reload (durable cookie session). Every AC (1-6) verified end-to-end.
- **Setup added:** `supabase/config.toml` + `supabase/.gitignore` (from `supabase init`). The dev server was restarted on a clean `.next` (the earlier prod build had rewritten it).
- Story → **review** (all tasks complete, all ACs verified).

### Change Log

- 2026-06-21 — Story 1.4 context created (ready-for-dev): durable anonymous session + `profiles`/`region_marks` store with owner-scoped RLS. Ultimate context engine analysis completed — comprehensive developer guide created.
- 2026-06-21 — Dev pass: authored migration + anon-session bootstrap + `data/` module + types (Tasks 1-6).
- 2026-06-22 — Gate cleared + verified: anon sign-ins enabled, migration pushed to the linked project, types regenerated; RLS-isolation (7/7) + reload-durability verified live. All ACs met. Story → review.
- 2026-06-22 — Code review: 1 decision + 4 patches applied. Deleted the starter auth scaffolding (`/auth/*`, `/protected/*`, the auth forms + tutorial) that clashed with local-first and could strand anon marks on sign-up; hardened the anon bootstrap (nav-only + try/catch); `listRegionMarks` null-safety; `addRegionMark` → `void`. 2 deferred. tsc/lint/build green; anon session re-verified. Story → done.

### File List

**Added**
- `supabase/migrations/20260621120000_init_profiles_region_marks.sql` — first migration: profiles + region_marks, RLS, indexes, new-user trigger
- `data/region-marks.ts` — region-marks data-access module (list/add/remove under RLS)
- `types/supabase.ts` — generated `Database` types (`supabase gen types --linked`)
- `supabase/config.toml`, `supabase/.gitignore` — from `supabase init` (CLI project config)

**Modified**
- `lib/supabase/proxy.ts` — anon-session bootstrap replacing the login redirect (local-first)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 1.4 → review

**Removed**
- `data/.gitkeep`, `types/.gitkeep`, `supabase/migrations/.gitkeep` (real files now present)
- **Starter auth scaffolding (code review):** `app/auth/**`, `app/protected/**`, `components/{login,sign-up,forgot-password,update-password}-form.tsx`, `components/{auth-button,logout-button}.tsx`, `components/tutorial/**` — clashed with local-first; Mapsake's real auth is Epic 2.
