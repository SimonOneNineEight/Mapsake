-- Story 5.3: daily scheduler + send notification.
-- Adds the per-user notification ledger used by the `on-this-day` cron sender:
--   last_notified_at     — the hard max-1/day guard (skip a user already notified today)
--   last_rediscovery_at  — gates the ≈monthly tier-4 "rediscovery" cadence (read by the 5-2 engine)
-- Both are written ONLY by the service role inside the scheduled job; clients never set them, so no
-- new RLS policy is needed (the existing owner-select already exposes the row, the service role
-- bypasses RLS for the write). A `notification_log` table (audit + per-memory repeat-suppression) is
-- the documented post-v1 upgrade; two columns suffice for v1's ceiling + cadence.

alter table public.profiles
  add column last_notified_at    timestamptz,
  add column last_rediscovery_at timestamptz;
