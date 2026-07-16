-- expand-contract-ok: the `unique (id, pin_id)` and the composite `photos_visit_pin_fk` constraint are on
-- ADDITIVE structures (the new `visits` table and the new nullable `photos.visit_id`). No web-written
-- column is tightened — the web writes `visit_id` NULL, so the composite FK is never enforced for it.
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
  created_at    timestamptz not null default now(),
  -- Lets photos reference (visit_id, pin_id) → visits(id, pin_id) so a photo's visit is on the photo's pin.
  unique (id, pin_id)
);

create index idx_visits_pin_id  on public.visits (pin_id);
create index idx_visits_user_id on public.visits (user_id);

alter table public.photos add column visit_id uuid;
-- Composite FK ties a photo's visit to the photo's OWN pin: a photo can only reference a visit on its pin.
-- With pin-scoped RLS on photos, this transitively forbids attaching a photo to another user's (or another
-- pin's) visit. MATCH SIMPLE: when visit_id is NULL the FK is not enforced (a primary-visit photo).
alter table public.photos
  add constraint photos_visit_pin_fk foreign key (visit_id, pin_id)
    references public.visits (id, pin_id) on delete cascade;
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

-- Update check mirrors insert: the row stays the caller's AND its (possibly changed) pin is the caller's.
-- Without the pin-ownership check a user could re-point a visit onto another user's pin, which the
-- SECURITY DEFINER promote RPC would then read (RLS-bypassed) and copy into the victim's pin.
create policy visits_owner_update on public.visits
  for update using (user_id = (select auth.uid()))
             with check (
               user_id = (select auth.uid())
               and exists (
                 select 1 from public.pins p
                 where p.id = pin_id and p.user_id = (select auth.uid())
               )
             );

create policy visits_owner_delete on public.visits
  for delete using (user_id = (select auth.uid()));

-- Table-level DML grants for the API roles (RLS still restricts rows). Explicit + portable: prod grants
-- these to all public tables via a managed default-privilege, but stating them here guarantees the app
-- can use `visits` regardless, and lets local `db reset` exercise RLS in pgTAP.
-- Granted to `authenticated` only (Supabase anonymous sign-in IS the authenticated role). `anon`
-- (unauthenticated) has no reason to touch visits and RLS would block it anyway.
grant select, insert, update, delete on public.visits to authenticated;

-- ── Down (manual revert) ──────────────────────────────────────────────────────
-- MUST revert the later migrations FIRST (they depend on this schema): drop the promote RPC
-- (20260716120200) and the per-visit exif trigger+function (20260716120100) before this block, or the
-- trigger's references to photos.visit_id break every photo write. Data caveat: once iOS has written
-- visits, dropping `visits` destroys their notes/dates (structurally reversible, not data-reversible).
-- drop policy visits_owner_delete on public.visits;
-- drop policy visits_owner_update on public.visits;
-- drop policy visits_owner_insert on public.visits;
-- drop policy visits_owner_select on public.visits;
-- drop index if exists public.idx_photos_visit_id;
-- alter table public.photos drop constraint if exists photos_visit_pin_fk;
-- alter table public.photos drop column if exists visit_id;
-- drop index if exists public.idx_visits_user_id;
-- drop index if exists public.idx_visits_pin_id;
-- drop table if exists public.visits;
