-- Story 3.1: drop a named pin (tap-to-place).
-- Adds the `pins` table — the core memory unit: a named point (lat/lng) inside an
-- admin-1 region. Full v1 shape per architecture.md (note/memory_date/exif/muted are
-- written by later Epic 3 stories; the columns exist now so we don't ALTER later).
-- Owner-scoped RLS, mirroring region_marks. `photos` is a separate later migration (3.6).

-- ── pins ──────────────────────────────────────────────────────────────────────
-- Region identity = ISO codes (region_code = ISO 3166-2 for admin-1 / alpha-2 for a
-- country-level tap; country_code = alpha-2), captured from the tapped MapLibre feature
-- (no server-side point-in-polygon). Visited roll-up from pins is DERIVED client-side
-- (Story 3.9), never stored here.
create table public.pins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  name          text not null,
  lat           double precision not null,
  lng           double precision not null,
  country_code  text,
  region_code   text,
  note          text,
  memory_date   date,
  exif_taken_at timestamptz,
  muted         boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idx_pins_user_id on public.pins (user_id);
create index idx_pins_user_id_region_code on public.pins (user_id, region_code);

-- ── RLS: owner-scoped (auth.uid()) ────────────────────────────────────────────
-- (select auth.uid()) lets Postgres cache the call per-statement (Supabase perf guidance).
alter table public.pins enable row level security;

create policy pins_owner_select on public.pins
  for select using (user_id = (select auth.uid()));
create policy pins_owner_insert on public.pins
  for insert with check (user_id = (select auth.uid()));
create policy pins_owner_update on public.pins
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy pins_owner_delete on public.pins
  for delete using (user_id = (select auth.uid()));
