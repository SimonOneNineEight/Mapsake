-- Per-visit EXIF aggregate (Epic 1.4). Maintains visits.exif_taken_at = MIN(photos.taken_at) for
-- photos assigned to that visit. Parallel to the pin-level sync_pin_exif_taken_at trigger, which is
-- LEFT UNTOUCHED — two independent aggregates, no coupling. Reversible (see Down block).

create function public.sync_visit_exif_taken_at()
  returns trigger
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  new_visit uuid;
  old_visit uuid;
begin
  if tg_op = 'DELETE' then
    old_visit := old.visit_id;
  elsif tg_op = 'INSERT' then
    new_visit := new.visit_id;
  else -- UPDATE
    new_visit := new.visit_id;
    old_visit := old.visit_id;
  end if;

  -- Recompute the affected visit(s). A photo can move between visits, so both sides may change.
  if new_visit is not null then
    update public.visits v
      set exif_taken_at = (select min(ph.taken_at) from public.photos ph where ph.visit_id = v.id)
    where v.id = new_visit;
  end if;

  if old_visit is not null and old_visit is distinct from new_visit then
    update public.visits v
      set exif_taken_at = (select min(ph.taken_at) from public.photos ph where ph.visit_id = v.id)
    where v.id = old_visit;
  end if;

  return null; -- AFTER row trigger: return value is ignored
end;
$$;

-- Fires only on the columns that can move a visit's MIN — not on every photo UPDATE (e.g. a web
-- sort_order reorder), which would churn locks on the shared visits row for no reason.
create trigger photos_sync_visit_exif
  after insert or delete or update of visit_id, taken_at on public.photos
  for each row execute function public.sync_visit_exif_taken_at();

-- ── Down (manual revert) ──────────────────────────────────────────────────────
-- drop trigger if exists photos_sync_visit_exif on public.photos;
-- drop function if exists public.sync_visit_exif_taken_at();
