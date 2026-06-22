-- Story 1.4: durable anonymous session + region-marks store.
-- First migration: profiles + region_marks, owner-scoped RLS, indexes, and a
-- new-user trigger that seeds a profile (fires for anonymous sign-ins too).

-- ── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  default_view  text not null default 'world' check (default_view in ('world', 'country')),
  focus_country text,
  locale        text not null default 'zh-TW',
  notif_enabled boolean not null default true,
  notif_time    time not null default '19:00',
  created_at    timestamptz not null default now()
);

-- ── region_marks ─────────────────────────────────────────────────────────────
-- Explicit binary visited marks. Region identity = ISO codes:
--   region_code  = ISO 3166-1 alpha-2 for countries ('JP') / ISO 3166-2 for admin-1 ('JP-26')
--   country_code = ISO 3166-1 alpha-2 ('JP')  (for the roll-up index)
-- Visited roll-up is DERIVED client-side (Story 1.6) from marks + pins; never stored.
create table public.region_marks (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  level        text not null check (level in ('country', 'admin1')),
  region_code  text not null,
  country_code text not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, region_code, level)   -- re-marking the same region is a no-op upsert
);

create index idx_region_marks_user_id on public.region_marks (user_id);
create index idx_region_marks_user_id_country_code on public.region_marks (user_id, country_code);

-- ── RLS: owner-scoped (auth.uid()) ────────────────────────────────────────────
-- (select auth.uid()) lets Postgres cache the call per-statement (Supabase perf guidance).
alter table public.profiles enable row level security;
alter table public.region_marks enable row level security;

create policy profiles_owner_select on public.profiles
  for select using (id = (select auth.uid()));
create policy profiles_owner_insert on public.profiles
  for insert with check (id = (select auth.uid()));
create policy profiles_owner_update on public.profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy region_marks_owner_select on public.region_marks
  for select using (user_id = (select auth.uid()));
create policy region_marks_owner_insert on public.region_marks
  for insert with check (user_id = (select auth.uid()));
create policy region_marks_owner_update on public.region_marks
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy region_marks_owner_delete on public.region_marks
  for delete using (user_id = (select auth.uid()));

-- ── seed a profile row for every new (incl. anonymous) user ───────────────────
-- security definer + fixed empty search_path (Supabase hardening) so the insert
-- runs with owner rights and can't be search-path-hijacked. Fires on anon sign-in
-- too (anonymous sign-in inserts a real auth.users row with is_anonymous = true),
-- so the profile exists before the first region_marks insert (FK ordering).
create function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
