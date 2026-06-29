-- Epic 5 retrospective fix: keep pins.exif_taken_at = MIN(photos.taken_at).
--
-- The re-live eligibility engine's TIER 2 ("N 年前的今天" anchored on a photo's EXIF capture date)
-- reads pins.exif_taken_at, but nothing ever populated it: the photo pipeline writes photos.taken_at
-- per-photo (Story 3.6) and never rolled it up to the pin. So tier-2 (and the photos tiebreaker, which
-- proxies on exif_taken_at != null) were dead — a user with old-trip photos but no typed date fell
-- through to the weaker tier-3 ("N 年前加入"). Maintain the denormalized min via a trigger on photos,
-- and backfill pins that already have photos.

-- security definer + empty search_path (Supabase hardening, same as handle_new_user) so the pins
-- update runs with owner rights and can't be search-path-hijacked. Fully-qualified names throughout.
create function public.sync_pin_exif_taken_at()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  affected_pin uuid := coalesce(new.pin_id, old.pin_id);
begin
  update public.pins p
     set exif_taken_at = (
       select min(ph.taken_at) from public.photos ph where ph.pin_id = affected_pin
     )
   where p.id = affected_pin;
  return null; -- AFTER row trigger: return value is ignored
end;
$$;

-- Recompute on any change to a pin's photo set that can move the MIN: add, remove, or an EXIF-date
-- edit. (pin_id is immutable in v1, so coalesce(new, old) names the one affected pin.)
create trigger photos_sync_pin_exif
  after insert or delete or update of taken_at on public.photos
  for each row execute function public.sync_pin_exif_taken_at();

-- One-time backfill for pins that already have photos (the trigger only fires on future changes).
update public.pins p
   set exif_taken_at = sub.min_taken
  from (select pin_id, min(taken_at) as min_taken from public.photos group by pin_id) sub
 where p.id = sub.pin_id
   and p.exif_taken_at is distinct from sub.min_taken;
