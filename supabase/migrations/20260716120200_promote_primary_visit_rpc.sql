-- promote_primary_visit (Epic 1.4, AR5). Server-side ATOMIC replacement for "delete the primary visit":
-- one transaction that promotes the most-recent additional visit into the pins row, or clears it when
-- none remain. Never a client-side promote-then-delete (that half-fails offline and orphans data).
-- SECURITY DEFINER + owner-guarded. Reversible (see Down block).

create function public.promote_primary_visit(target_pin uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  successor public.visits;
begin
  -- Owner guard: operate only on the caller's own pin.
  if not exists (
    select 1 from public.pins p
    where p.id = target_pin and p.user_id = (select auth.uid())
  ) then
    raise exception 'promote_primary_visit: pin % not found or not owned', target_pin;
  end if;

  -- The primary visit's own content is being removed: its photos are visit_id IS NULL on this pin.
  delete from public.photos where pin_id = target_pin and visit_id is null;

  -- Most-recent additional visit becomes the new primary.
  select * into successor
    from public.visits v
   where v.pin_id = target_pin
   order by v.visit_date desc nulls last, v.created_at desc
   limit 1;

  if found then
    update public.pins
       set memory_date   = successor.visit_date,
           note          = successor.note,
           exif_taken_at = successor.exif_taken_at,
           updated_at    = now()
     where id = target_pin;
    -- Re-point the successor's photos to the pin (primary): visit_id = NULL.
    update public.photos set visit_id = null where visit_id = successor.id;
    -- Consume the promoted visit row.
    delete from public.visits where id = successor.id;
  else
    -- No additional visits remain: the pin becomes an empty/backfill pin.
    update public.pins
       set memory_date   = null,
           note          = null,
           exif_taken_at = null,
           updated_at    = now()
     where id = target_pin;
  end if;
end;
$$;

grant execute on function public.promote_primary_visit(uuid) to authenticated, anon;

-- ── Down (manual revert) ──────────────────────────────────────────────────────
-- revoke execute on function public.promote_primary_visit(uuid) from authenticated, anon;
-- drop function if exists public.promote_primary_visit(uuid);
