-- Story 2.8 (Mapsake v2): approximate region-backfill.
-- Adds pins.is_approximate — an approximate pin sits at a region's centre (「記錄這個地區」) and renders as a
-- dashed-hollow marker on iOS (honest imprecision); it clears when the pin is later dragged to a real spot.
--
-- ADDITIVE + DEFAULTED so the live web client (which never selects or sets this column) is unaffected —
-- the "never tighten a web-touched column" rule. Simon-gated: `supabase db push` (dev then prod), sequenced
-- after the 1.4 multi-visit migration. Run `supabase gen types` after applying.

alter table public.pins
  add column if not exists is_approximate boolean not null default false;

comment on column public.pins.is_approximate is
  'Story 2.8: true when the pin was created via 記錄這個地區 at a region centre (dashed-hollow marker on iOS); cleared when dragged to a real spot (FR29 edit).';
