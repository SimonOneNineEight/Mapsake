---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-06-20'
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-06-16/prd.md
  - _bmad-output/planning-artifacts/prds/prd-travel-map-2026-06-16/addendum.md
  - _bmad-output/planning-artifacts/briefs/brief-travel-map-2026-06-16/brief.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-06-16/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-travel-map-2026-06-16/reconcile-sources.md
workflowType: 'architecture'
project_name: 'travel-map'
user_name: 'Simon'
date: '2026-06-17'
---

# Architecture Decision Document — Mapsake (travel-map)

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:** 21 FRs in 5 groups.
- **Accounts & Durability (FR1–4):** auth, durable persistence surviving logout/reinstall/device-change, cross-device sync, data export. → real backend with reliable cloud storage, backups, and a sync model.
- **The Map (FR5–8):** one continuous zoomable world→country→admin-1 map over shared data, binary visited marking at country + admin-1, visited rendered filled, default-view landing. → vector map rendering + worldwide admin-1 boundary dataset + per-user visited-state store.
- **Place Memories (FR9–13):** photos, note, optional date, per-place memory view, "add details later" (a bare mark is complete). → media storage + a flexible per-place record where all detail fields are optional.
- **Onboarding (FR14–17):** default-view choice, rapid tap-to-mark backfill, change later, PWA install nudge.
- **Retention / Re-live (FR18–21):** "on this day" detection, memory-text push notification, map+memory deep-link landing, free wandering. → daily scheduler + web push (service worker, VAPID, per-device subscriptions).

**Non-Functional Requirements:**
- NFR1 Durability (top bar, zero data loss) · NFR2 Privacy-by-design · NFR3 Sync consistency (no conflicting states that drop data) · NFR4 Map/photo performance · NFR5 Web-first, mobile-ready (API-first, no web-only lock-in) · NFR6 Photo durability at viewing resolution.

**Scale & Complexity:**
- Primary domain: full-stack web — PWA frontend + API-first backend, with a spatial/map subsystem and a scheduled web-push subsystem.
- Complexity level: medium.
- Estimated architectural components: frontend PWA (map render + memory UI + offline shell), API backend, datastore, media/object storage, boundary-dataset/tile pipeline, push scheduler + service worker, auth.

### Technical Constraints & Dependencies
- API-first backend (a future native mobile client reuses it); avoid web-only-coupled choices.
- PWA required with a real offline-capable shell; web push needs an installed PWA on iOS 16.4+.
- Worldwide admin-1 boundary dataset (Natural Earth / GADM-class), with an explicit stance on disputed borders/labels (Taiwan etc.); Chinese (zh-TW) labels where available.
- zh-TW-primary i18n: externalized strings, layouts tolerant of CJK and English.
- Durable cloud storage + backups + user export; reliable cross-device sync.

### Cross-Cutting Concerns Identified
Durability & backup · cross-device sync & conflict-avoidance · privacy (owner-only visibility) · i18n (zh-TW first) · offline shell & cache · map-render performance · photo/object storage · web-push delivery & per-device subscriptions · accessibility (WCAG AA) · auth/session.

### Architectural Risks & Must-Hold Invariants
_Surfaced via Advanced Elicitation (Assumption Audit · Pre-mortem · First Principles · Cascading Failure · Inversion). These are the yardstick for every technology decision that follows._
1. **Durable-write contract:** UI shows "saved" only after server-acked durable persistence. Offline edits queue in a local outbox and reconcile; never lost. Backups + point-in-time recovery + export.
2. **Sync conflict model required:** single-user/multi-device offline edits need an explicit reconciliation rule (field-level merge, not silent last-write-wins that drops a note).
3. **Map performance is an architecture problem:** admin-1 geometry must be pre-simplified per zoom (vector tiles / simplified topology), not raw polygons. Target smooth pan/zoom on mid-range phones.
4. **Media decoupled from core data:** a photo-store outage must not block marking or reading notes.
5. **No login single-point-of-failure:** avoid single-OAuth-only; cache sessions; degrade gracefully.
6. **Offline shell caches the base map**, not just the app shell.
7. **Retention delivery is gated on PWA install + push permission:** monitor; lean on the EXIF/rediscovery eligibility model + a prominent install nudge.
8. **Map labels & Taiwan stance need a data-source decision:** zh-TW admin-1 labels likely require a gazetteer beyond the boundary dataset; the disputed-border stance is explicit and Taiwan-audience-respecting.
9. **Photo pipeline cost/UX:** resize-to-viewing-resolution, durable store, CDN; per-user envelope to define.

## Starter Template Evaluation & Foundation Decisions

### Foundation Decisions (locked)
| Decision | Choice |
|---|---|
| Frontend | **Next.js 16 (React, App Router, TypeScript)** |
| Backend & data | **Supabase (managed Postgres BaaS)** — auth, Postgres, object storage, realtime, row-level security |
| Hosting / deployment | **Vercel (frontend + Cron) + Supabase (DB/auth/storage/realtime)** |
| Build philosophy | **Managed-first for v1.** Lean on managed services to validate the re-live loop. Escape hatch: it's standard Postgres, so a custom Go service can slot in front of the same DB later, incrementally, no rewrite. |

**Why this maps to the invariants:** managed Postgres covers durability/backups/PITR (#1) better than a solo-maintained backend; row-level security is the privacy boundary (#4-privacy); Storage buckets decouple media from core data (#4); it's API-first for the future mobile client (NFR5); Vercel Cron hosts the daily "on this day" scheduler (#7).

### Primary Technology Domain
Full-stack web: PWA frontend (Next.js/React) + API-first managed backend (Supabase/Postgres). Mobile-ready via a future React Native client reusing the same backend (NFR5).

### Starter Options Considered
- **Official Supabase × Next.js (`with-supabase`)** — App Router, cookie-based SSR auth, TypeScript, Tailwind. Lean, official, RLS-ready. **Selected base.**
- **Razikus supabase-nextjs-template** — production template with RLS policies, Supabase Storage, Expo React-Native app, i18n (EN/PL/ZH). Strong *reference* for RLS patterns + the mobile path; ships SaaS cruft to remove. Not the base.
- **nextbase / T3** — solid but heavier/more opinionated than a personal-first v1 needs.

### Selected Starter: Official `with-supabase` (Next.js 16 + Supabase + Tailwind, TypeScript)
**Rationale:** Supabase-maintained, minimal surface, cookie-based SSR auth and an RLS-first posture out of the box. We add our specifics deliberately rather than stripping cruft.

**Initialization Command (verify current versions at init time — Next.js 16.2.x stable as of 2026-06):**
```bash
pnpm create next-app --example with-supabase mapsake
```

**Architectural decisions the starter provides:**
- TypeScript, Next.js 16 (App Router, Turbopack), Node 20+.
- Supabase Auth with cookie-based SSR sessions (auth *method* decided in a later step).
- Tailwind CSS (v4).
- Supabase client (browser + server) with RLS as the privacy boundary.

**Layered on top (each its own later decision; noted so init covers them):**
- **PWA/offline shell:** Serwist (`@serwist/next`) — `next-pwa` is archived; Serwist is its maintained successor. Service worker + manifest + offline caching incl. base-map tiles.
- **i18n (zh-TW first):** string framework (e.g. next-intl), externalized messages, zh-TW default, English fast-follow.
- **Map:** render library + boundary/tile pipeline (dedicated decision step).
- **Data fetching/state:** TanStack Query over the Supabase client; offline outbox layer designed later.
- **Fonts:** Newsreader / Nunito Sans / Noto Serif TC / Noto Sans TC via `next/font`.

**Note:** Project initialization with this command should be the first implementation story.

## Core Architectural Decisions

> Core memory unit = **named pin (lat/lng) within an admin-1 region** ("A+ multi", decided 2026-06-20; PRD/UX updated to match). Region fill is the at-a-glance layer; visited rolls up from pins + explicit marks, no downward cascade.

### Data Architecture
- **Postgres (Supabase), relational; all tables owner-scoped via RLS (`user_id = auth.uid()`).**
- **Visited = derived (roll-up):** a region reads visited if it has a `region_mark` OR contains any `pin`; a country if marked OR any admin-1/pin within. No downward cascade. Persist explicit marks; compute the rolled-up render state client-side.
- **Region identity = ISO codes** (`JP`, `JP-26`, `US-CA`), not dataset-internal IDs. geoBoundaries features mapped to ISO 3166-2 at tile-build, so user data stays portable across boundary sources.
- **No server-side point-in-polygon:** the client sends `region_code`/`country_code` with a pin (MapLibre knows the feature under the tap).
- **Validation:** Zod shared client/server + Postgres constraints. **Migrations:** Supabase SQL in-repo.

**Schema (v1):**
```sql
profiles(id uuid PK→auth.users, default_view text['world'|'country'] default 'world',
         focus_country text NULL, locale text default 'zh-TW',
         notif_enabled bool default true, notif_time time default '19:00',
         created_at timestamptz default now())

region_marks(user_id uuid→profiles, level text['country'|'admin1'],
             region_code text, country_code text, created_at timestamptz,
             PRIMARY KEY(user_id, region_code, level))            -- idx (user_id),(user_id,country_code)

pins(id uuid PK, user_id uuid→profiles, name text NOT NULL,
     lat double precision NOT NULL, lng double precision NOT NULL,
     country_code text, region_code text, note text, memory_date date,
     exif_taken_at timestamptz, muted bool default false,
     created_at timestamptz, updated_at timestamptz)              -- idx (user_id),(user_id,region_code); optional PostGIS geom+GIST

photos(id uuid PK, pin_id uuid→pins ON DELETE CASCADE, user_id uuid,
       storage_path text NOT NULL, width int, height int,
       taken_at timestamptz, sort_order int default 0, created_at timestamptz)  -- idx (pin_id)

push_subscriptions(id uuid PK, user_id uuid→profiles, endpoint text UNIQUE,
                   p256dh text, auth text, device text,
                   created_at timestamptz, last_used_at timestamptz)            -- idx (user_id)
```
- Per-memory **mute is a column on `pins`** (no side table). **Photo binaries** live in a private Storage bucket; `photos` holds only the path (media decoupled from core data). Deleting a pin cascades photo rows; a delete handler cleans the storage objects. PostGIS optional for v1 (lat/lng + region index suffice; add geom only for radius/nearest later).

### The Map subsystem
- **MapLibre GL JS 5.x.** **geoBoundaries ADM0+ADM1** (CC BY) → simplified-per-zoom **PMTiles** from Storage/CDN.
- **Region fill** via feature-state keyed by region_code (roll-up from marks+pins) + always-on texture cue + small-region pin fallback.
- **Memory pins** = GeoJSON source with **clustering**; pins fade in zoomed-in; selected/re-live pin glows.
- **Taiwan as its own entity** + its admin-1; **zh-TW labels** via gazetteer (Wikidata/OSM) with English fallback.
- **City SEARCH (GeoNames autocomplete) deferred;** v1 pins are tap-placed + named.

### Authentication & Security
- **Supabase Auth: email magic-link + Google OAuth** (no passwords; no single-OAuth SPOF). **Local-first onboarding**, account prompt after the payoff.
- **RLS** privacy boundary; **photos in a private bucket** with signed URLs; service-role key server-side only.

### API & Communication
- **PostgREST + Supabase client** for CRUD; **serverless/Edge functions** for the daily scheduler, push send, EXIF extraction, photo post-processing. **No Realtime in v1** (refetch-based reads).

### Frontend Architecture
- **TanStack Query.** **Durable-write contract** (UI shows "saved" only after server ack). **v1 = online writes only**; offline = read-only cached shell with a calm write-disabled banner. **Reads:** refetch-on-focus + pull-to-refresh. Offline-write outbox + PowerSync = documented fast-follow.
- App Router · **next-intl (zh-TW default)** · `next/font`.

### Infrastructure & Deployment
- **Vercel (frontend + Cron) + Supabase.** Scheduler = **Vercel Cron → API route** using `web-push` + VAPID; per-device subscriptions in Postgres.
- **CI/CD:** GitHub → Vercel previews; Supabase migrations in CI. **Monitoring:** Sentry + platform logs.
- **Photo pipeline:** client-side resize → private bucket → image-transform/CDN; EXIF date extracted at upload. **Envelope:** generous per-user soft cap, monitor (number deferred).

### Re-live eligibility (resolves PRD open cadence item)
Tiered: explicit date → photo EXIF → entry-created-date → dateless **monthly rediscovery**. Curated, **max 1/day**, per-memory mute, global off. Deep-links to the pin + memory.

### Deferred (post-v1)
GeoNames city search · dataset-backed city pins · dark mode (Lamplight) · English locale · offline-write outbox / PowerSync · PRD parked fast-follows (memory reel, wishlist, print map, year-in-review, fuzzy-time, photo clustering).

### Decision Impact / Implementation Sequence
1. Project init (`with-supabase`) + Supabase project + schema migration + RLS policies.
2. Map base: geoBoundaries → PMTiles pipeline; MapLibre render; region fill + feature-state.
3. Auth (magic-link + Google) + local-first onboarding + account prompt.
4. Pins: drop/name/open, photos upload pipeline, memory panel/sheet.
5. Visited roll-up rendering; PWA/offline shell (Serwist) + write-disabled banner.
6. Push: service worker, VAPID, subscriptions, Vercel Cron scheduler + eligibility tiers.
7. i18n (zh-TW), accessibility floor, polish.

## Implementation Patterns & Consistency Rules

### Naming
- **Database (SQL/migrations):** snake_case. Tables plural (`pins`, `region_marks`); PK `id` (uuid); FK `<entity>_id`; timestamps `created_at`/`updated_at`; indexes `idx_<table>_<cols>`; RLS policies `<table>_owner_<action>`.
- **TypeScript:** camelCase variables/functions; PascalCase components & types; hooks `useXxx`.
- **★ Casing boundary (key rule):** snake_case lives ONLY in SQL + Supabase-generated types. Convert to camelCase domain objects in ONE place — the data-access layer (per-entity query modules). No snake_case above the data layer.
- **Files:** components `PascalCase.tsx`; other modules `kebab-case.ts`. **Routes:** App Router segments + API/Edge routes kebab-case (`/api/on-this-day`).

### Structure (feature-first)
- `app/` routes — Server Components by default; `'use client'` only where interactive (map, pin editor, sheet).
- `src/features/<feature>/` (map, pins, memories, auth, notifications): `components/`, `hooks/`, `queries/`, `types.ts`.
- `src/components/ui/` shared primitives · `src/components/` brand components · `src/lib/` (supabase clients, utils, i18n) · `supabase/migrations/` · `messages/zh-TW.json` (+ `en.json` later).
- **Tests co-located** `*.test.ts(x)`; Playwright e2e in `e2e/`.

### Formats
- **Dates:** `timestamptz` in DB; ISO-8601 on the wire; `memory_date` a plain `date` (no tz); format at render for the user's locale (zh-TW) via the i18n/date layer — never format manually.
- **API shape:** Supabase native `{ data, error }`; no custom envelope. Surface `error` as i18n'd user copy; never raw error text in UI.
- **Data:** booleans true/false; absent optional fields `null` (never empty string); arrays for lists.

### State & Data
- **Server state: TanStack Query.** Query keys: `['pins', userId]`, `['regionMarks', userId]`, `['pin', pinId]`. **UI state minimal** (Zustand/context) — ephemeral view state only (sheet snap, drop-mode).
- **Mutations: optimistic + durable-write contract** — optimistic update with subtle "saving"; "saved" only after server ack; invalidate relevant keys on success; on failure keep the edit + calm retry, never silent drop.
- **Writes online-only (v1):** offline disables write affordances with the banner; reads from cache.

### Process
- **Errors:** calm, never scolding (EXPERIENCE.md voice); user copy via i18n keys; technical detail to Sentry only.
- **Loading/empty:** skeletons, never block the map; "absence is normal" empty states.
- **Validation:** Zod shared client/server at form boundaries; DB constraints + RLS as backstop.

### UI component strategy
- **shadcn/ui (Radix + Tailwind, copy-in)** for generic interactive chrome: dialog, dropdown/menu, popover, tooltip, switch, toast, form controls, and the **Drawer (Vaul) = the 3-snap memory bottom sheet**. Themed to DESIGN.md tokens via Tailwind theme + CSS variables so components read as Mapsake, not stock shadcn.
- **Custom (no library):** the map (MapLibre), memory pins, and any brand-carrying surface.
- shadcn components in `src/components/ui/`; brand/feature components in `src/features/<feature>/components/` and `src/components/`.
- Accessibility: prefer a Radix-backed primitive over a hand-rolled interactive widget to hold the WCAG-AA floor.

### Enforcement
- **TypeScript strict**, ESLint + Prettier; Supabase **generated types are the source of truth** for DB shapes. Conventions captured in `project-context.md` (via `bmad-generate-project-context`) so AI agents inherit them.

### Anti-patterns (do not)
snake_case in React code · manual date string formatting · raw error text in the UI · blocking the map on a load · a write path that can lose an unacked edit · using the service-role key on the client / bypassing RLS.

## Project Structure & Boundaries

### Complete Project Directory Structure
```
mapsake/
├── README.md
├── package.json · pnpm-lock.yaml
├── next.config.ts              # + Serwist PWA config
├── tsconfig.json · eslint · prettier
├── tailwind.config.ts          # theme = DESIGN.md tokens via CSS variables
├── .env.example                # Supabase URL/anon/service keys, VAPID public/private
├── .github/workflows/ci.yml    # typecheck, lint, test, Supabase migrate
├── public/
│   ├── manifest.webmanifest · icons/        # PWA
│   └── tiles/                  # PMTiles (or served from Supabase Storage/CDN)
├── messages/
│   ├── zh-TW.json              # default locale
│   └── en.json                 # fast-follow
├── supabase/
│   ├── config.toml
│   └── migrations/             # SQL: tables, RLS policies, indexes
├── scripts/
│   └── build-tiles.ts          # geoBoundaries → tippecanoe → PMTiles + ISO 3166 mapping
├── e2e/                        # Playwright
└── src/
    ├── middleware.ts           # Supabase session + locale negotiation
    ├── app/
    │   ├── layout.tsx          # fonts (next/font), providers (Query, i18n)
    │   ├── globals.css · sw.ts (Serwist) · manifest.ts
    │   ├── [locale]/
    │   │   ├── page.tsx        # the map (home)
    │   │   ├── onboarding/ · settings/ · account/
    │   └── api/
    │       ├── on-this-day/route.ts     # Vercel Cron target → eligibility + web-push
    │       └── push/subscribe/route.ts  # store per-device subscription
    ├── features/
    │   ├── map/        # MapLibre canvas, PMTiles, region fill (feature-state), pin + cluster layers
    │   ├── regions/    # region marks + visited roll-up logic
    │   ├── pins/       # drop / name / open / delete a pin
    │   ├── memories/   # memory panel + sheet, photos, note, optional date
    │   ├── auth/       # magic-link + Google, post-payoff account prompt
    │   ├── onboarding/ # default-view question, fast marking rhythm
    │   ├── notifications/  # push subscribe + prefs
    │   └── settings/
    │        └── (each: components/ hooks/ queries/ types.ts)
    ├── components/
    │   ├── ui/         # shadcn (Drawer=bottom sheet, Dialog, Menu, Toast…)
    │   └── …           # brand components (Wordmark, etc.)
    ├── data/           # DATA-ACCESS LAYER: only importer of the Supabase client for queries;
    │                   #   per-entity query modules + snake_case→camelCase mappers
    ├── lib/
    │   ├── supabase/   # browser.ts, server.ts, service-role.ts (server-only)
    │   ├── i18n/ · date.ts · push/ (web-push helpers, server) · utils.ts
    └── types/          # Supabase generated types + camelCase domain types
```

### Architectural Boundaries
- **Data boundary:** `src/data/` is the ONLY place that imports the Supabase client for queries and performs snake_case→camelCase mapping. Features import from `data/`, never raw Supabase. **Service-role key is server-only** (`lib/supabase/service-role.ts`, used by `api/` routes); the client uses the anon key under RLS.
- **API boundary:** CRUD flows UI → TanStack Query hook (`features/*/queries`) → `data/` → Supabase (RLS-enforced). Server API routes (`app/api/`) exist ONLY for secret/scheduled work (Cron `on-this-day`, push subscribe). No custom REST surface for CRUD.
- **Component boundary:** features own their components/hooks/queries; `components/ui/` holds shadcn primitives; the map is isolated in `features/map/` so MapLibre never leaks elsewhere.
- **Data flow (writes):** optimistic → durable-write (confirmed on ack) → invalidate query keys. Offline disables writes with the banner.

### Requirements → Structure Mapping
- **Map (FR5–8) + roll-up:** `features/map`, `features/regions`, `scripts/build-tiles.ts`, PMTiles in `public/tiles`.
- **Pins & memories (FR9–15):** `features/pins`, `features/memories`, Storage bucket for photos, `data/`.
- **Onboarding (FR16–19):** `features/onboarding`, `app/[locale]/onboarding`.
- **Re-live loop (FR20–23):** `app/api/on-this-day`, `features/notifications`, `lib/push`, service worker `app/sw.ts`.
- **Accounts/durability (FR1–4):** `features/auth`, `middleware.ts`, `supabase/migrations` (RLS), data export in `settings`.
- **Cross-cutting:** i18n (`messages/`, `lib/i18n`), PWA/offline (`sw.ts`, Serwist), durable-write (`data/` + query layer).

## Architecture Validation Results

### Coherence Validation ✅
- **Decision compatibility:** Next.js 16 + Supabase + Vercel + MapLibre 5 + shadcn/Radix + Serwist + next-intl + TanStack Query — mutually compatible, current (verified June 2026). No contradictions.
- **Pattern consistency:** casing boundary, feature-first structure, durable-write contract, online-writes-only all align with the stack and invariants.
- **Structure alignment:** tree supports every decision; `data/` boundary enforces RLS/privacy + casing; map isolated.

### Requirements Coverage ✅
- **FR1–4 accounts/durability:** Supabase Auth (magic-link + Google), managed Postgres + RLS + backups, refetch cross-device, export in settings.
- **FR5–8 map:** MapLibre + geoBoundaries PMTiles, feature-state fill, visited roll-up, default-view landing.
- **FR9–15 pins/memories:** `pins`/`photos` schema, tap-to-drop named pins, multiple per region, optional date, add-later.
- **FR16–19 onboarding:** default-view question, fast marking rhythm, change-later, PWA install nudge.
- **FR20–23 re-live:** Vercel Cron `on-this-day` + tiered eligibility + web-push + deep-link to pin+memory.
- **NFR1 durability** (managed PG + durable-write), **NFR2 privacy** (RLS), **NFR3 sync** (server-of-truth + refetch; offline read-only), **NFR4 performance** (PMTiles per-zoom + GPU), **NFR5 web-first/mobile-ready** (API-first Supabase + PWA), **NFR6 photo durability** (Storage bucket).

### Implementation Readiness ✅
Decisions documented with versions; patterns enforceable (TS strict, generated types, lint); structure complete; conflict points addressed.

### Gap Analysis — important gaps RESOLVED
1. **zh-TW label gazetteer → RESOLVED.** Source = **Wikidata**, joined by ISO 3166-2 (`wdt:P300`); pull `zh-Hant` label (fallback `zh` → English). **Baked into PMTiles feature props** (`name`, `name_zh`) at tile-build, so labels render locally/offline. In `scripts/build-tiles.ts`.
2. **Tile pipeline → RESOLVED (approach fixed; numeric tuning in spike).** geoBoundaries ADM0/ADM1 → tippecanoe → PMTiles → CDN. ADM0 z0–~4, ADM1 ~z3+, max tile zoom ~z8. Flags: `--simplification` (~10, tune), `--drop-densest-as-needed`, `--coalesce-densest-as-needed`, `--detect-shared-borders`. Acceptance: 60fps pan/zoom on a mid-range phone, tens-of-MB tile file.
3. **Photo envelope → RESOLVED.** Client-side resize to WebP ~2048px/q≈80 (~300–600KB each); store viewing-resolution only. Caps: ~2GB/user soft, ~30 photos/pin. Economics: Supabase Free 1GB; Pro 100GB @ $25/mo, then $0.125/GB.
- **Minor (non-blocking):** disputed-border rendering beyond Taiwan; deeper observability/test specifics.

### Architecture Completeness Checklist
**Requirements Analysis** [x] context · [x] scale/complexity · [x] constraints · [x] cross-cutting
**Architectural Decisions** [x] decisions+versions · [x] stack · [x] integration patterns · [x] performance
**Implementation Patterns** [x] naming · [x] structure · [x] communication · [x] process
**Project Structure** [x] directory tree · [x] boundaries · [x] integration points · [x] req→structure map

### Readiness Assessment
**Overall Status:** READY FOR IMPLEMENTATION — all 16 checklist items met, no critical gaps; the three important gaps are resolved (only tile-param tuning + storage monitoring remain as normal build activities).
**Confidence:** High.
**Key strengths:** managed durability matches the cardinal invariant; map perf designed in (PMTiles); privacy at the DB (RLS); simplified sync; clean feature-first structure; portable (ISO codes + Postgres).
**Future enhancement:** GeoNames city search, offline-write outbox/PowerSync, dark mode, English locale, parked fast-follows.

### Implementation Handoff
**AI agent guidelines:** follow the decisions and patterns exactly; respect the `data/` and service-role boundaries; keep snake_case below the data layer; never lose an unacked write.
**First priority:** `pnpm create next-app --example with-supabase mapsake` → schema migration + RLS → thin spike (mark offline→reconnect durable; geoBoundaries admin-1 tiles on a real phone).
