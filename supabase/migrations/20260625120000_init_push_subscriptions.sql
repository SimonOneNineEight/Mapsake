-- Story 5.1: push subscription & permission.
-- Adds the `push_subscriptions` table — one row PER DEVICE (keyed by the unique push
-- `endpoint`) holding the Web Push subscription for a user. Written client-side under RLS
-- when the user enables memory notifications (data/push.ts). The SEND path (Story 5.3's
-- Vercel Cron) reads these via the service role; v1 stores them owner-scoped.
-- Mirrors the owner-scoped RLS of pins/region_marks/photos.

-- ── push_subscriptions ─────────────────────────────────────────────────────────
-- endpoint is the per-device key (UNIQUE) so a re-subscribe / VAPID-key rotation upserts
-- the same device row rather than duplicating. p256dh + auth are the Web Push encryption
-- keys from PushSubscription.toJSON().keys. No payload/content is stored here.
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);

create index idx_push_subscriptions_user_id on public.push_subscriptions (user_id);

-- ── RLS: owner-scoped (auth.uid()) ────────────────────────────────────────────
-- (select auth.uid()) lets Postgres cache the call per-statement (Supabase perf guidance).
-- The 5.3 send job uses the service role (RLS-bypassing, server-only) to read all rows.
alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_owner_select on public.push_subscriptions
  for select using (user_id = (select auth.uid()));
create policy push_subscriptions_owner_insert on public.push_subscriptions
  for insert with check (user_id = (select auth.uid()));
create policy push_subscriptions_owner_update on public.push_subscriptions
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy push_subscriptions_owner_delete on public.push_subscriptions
  for delete using (user_id = (select auth.uid()));
