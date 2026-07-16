-- Multi-visit Shape A (Epic 1.4, EXPAND phase — additive only).
-- `visits` holds ADDITIONAL visits only; the `pins` row IS the primary visit.
-- `photos.visit_id` nullable: NULL = the pin's primary visit; set = an additional visit.
-- Web write-compat preserved: pins.memory_date/note untouched, NO bridge trigger, nothing tightened.
-- Owner-scoped RLS mirrors pins/photos. Reversible (see Down block).

create table public.visits (
  id            uuid primary key default gen_random_uuid(),
  pin_id        uuid not null references public.pins (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  visit_date    date,
  note          text,
  exif_taken_at timestamptz,          -- per-visit MIN(photos.taken_at); maintained in the next migration
  created_at    timestamptz not null default now()
);

create index idx_visits_pin_id  on public.visits (pin_id);
create index idx_visits_user_id on public.visits (user_id);

alter table public.photos
  add column visit_id uuid references public.visits (id) on delete cascade;
create index idx_photos_visit_id on public.photos (visit_id);

-- ── RLS: owner-scoped (auth.uid()), mirroring pins/photos ──────────────────────
alter table public.visits enable row level security;

create policy visits_owner_select on public.visits
  for select using (user_id = (select auth.uid()));

-- Insert check: the row is the caller's AND the parent pin is the caller's (mirrors photos' posture).
create policy visits_owner_insert on public.visits
  for insert with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.pins p
      where p.id = pin_id and p.user_id = (select auth.uid())
    )
  );

create policy visits_owner_update on public.visits
  for update using (user_id = (select auth.uid()))
             with check (user_id = (select auth.uid()));

create policy visits_owner_delete on public.visits
  for delete using (user_id = (select auth.uid()));

-- Table-level DML grants for the API roles (RLS still restricts rows). Explicit + portable: prod grants
-- these to all public tables via a managed default-privilege, but stating them here guarantees the app
-- can use `visits` regardless, and lets local `db reset` exercise RLS in pgTAP.
grant select, insert, update, delete on public.visits to authenticated, anon;

-- ── Down (manual revert, dependency order) ────────────────────────────────────
-- drop policy visits_owner_delete on public.visits;
-- drop policy visits_owner_update on public.visits;
-- drop policy visits_owner_insert on public.visits;
-- drop policy visits_owner_select on public.visits;
-- drop index if exists public.idx_photos_visit_id;
-- alter table public.photos drop column if exists visit_id;
-- drop index if exists public.idx_visits_user_id;
-- drop index if exists public.idx_visits_pin_id;
-- drop table if exists public.visits;
