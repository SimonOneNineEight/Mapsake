-- Story 3.6: photos on a pin (batch upload).
-- Binaries live in a private Storage bucket (media decoupled from core data — a Storage
-- outage must not block reading the note/title); this table holds only the path + dims +
-- EXIF date + order. Deleting a pin cascades photo rows; object cleanup is a delete handler
-- in a later story (3.8). Owner-scoped RLS mirrors `pins`.

-- ── photos ──────────────────────────────────────────────────────────────────────
create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  pin_id       uuid not null references public.pins (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  taken_at     timestamptz,          -- EXIF DateTimeOriginal (feeds re-live eligibility); nullable
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create index idx_photos_pin_id on public.photos (pin_id);

-- ── RLS: owner-scoped (auth.uid()) ────────────────────────────────────────────
-- (select auth.uid()) lets Postgres cache the call per-statement (Supabase perf guidance).
alter table public.photos enable row level security;

create policy photos_owner_select on public.photos
  for select using (user_id = (select auth.uid()));
-- Insert check also verifies the target pin belongs to the user, so a client can't attach
-- a row to a foreign pin even with its own user_id.
create policy photos_owner_insert on public.photos
  for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.pins p where p.id = pin_id and p.user_id = (select auth.uid()))
  );
create policy photos_owner_update on public.photos
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy photos_owner_delete on public.photos
  for delete using (user_id = (select auth.uid()));

-- ── Private Storage bucket + owner-scoped object RLS ──────────────────────────────
-- Path convention: {user_id}/{pin_id}/{photo_id}.webp — the first folder segment is the
-- owner's auth.uid(), which the object policies enforce.
insert into storage.buckets (id, name, public) values ('pin-photos', 'pin-photos', false)
  on conflict (id) do nothing;

create policy "pin-photos owner read" on storage.objects
  for select using (bucket_id = 'pin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pin-photos owner insert" on storage.objects
  for insert with check (bucket_id = 'pin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pin-photos owner delete" on storage.objects
  for delete using (bucket_id = 'pin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
