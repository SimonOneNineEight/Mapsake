-- promote_primary_visit (Epic 1.4, AR5). Server-side ATOMIC replacement for "delete the primary visit":
-- one transaction that promotes the most-recent additional visit into the pins row, or clears it when
-- none remain. Never a client-side promote-then-delete (that half-fails offline and orphans data).
-- SECURITY DEFINER + owner-guarded. Reversible (see Down block).
--
-- DEFERRED to Story 2.9 (where the real caller + the X1 dual-writer proof land): full retry-idempotency.
-- This version row-locks the pin (serializes concurrent callers), but a client that blind-retries AFTER a
-- committed call still re-promotes. When 2.9 wires the caller, add an expected-state key (successor id /
-- current memory_date) and no-op on mismatch. Also pending 2.9 review: whether deleting the primary's
-- own photos here is the desired semantic (web-uploaded photos also land visit_id IS NULL). Do not call
-- this RPC from a client until 2.9.
create function public.promote_primary_visit(target_pin uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare
  successor public.visits;
begin
  -- Owner guard + row lock in one: serializes concurrent promotes and rejects a non-owner.
  perform 1 from public.pins where id = target_pin and user_id = (select auth.uid()) for update;
  if not found then
    raise exception 'promote_primary_visit: pin % not found or not owned', target_pin;
  end if;

  -- The primary visit's own content is being removed: its photos are visit_id IS NULL on this pin.
  delete from public.photos where pin_id = target_pin and visit_id is null;

  -- Most-recent additional visit becomes the new primary. id desc is the deterministic final tiebreak
  -- (visits batch-inserted in one transaction share created_at).
  select * into successor
    from public.visits v
   where v.pin_id = target_pin
   order by v.visit_date desc nulls last, v.created_at desc, v.id desc
   limit 1;

  if found then
    -- exif_taken_at is intentionally NOT set here — the pin-level sync_pin_exif_taken_at trigger owns it
    -- (whole-pin MIN, which the web re-live tier-2 reads). The photo delete above already recomputed it.
    update public.pins
       set memory_date = successor.visit_date,
           note        = successor.note,
           updated_at  = now()
     where id = target_pin;
    -- Re-point the successor's photos to the pin (primary): visit_id = NULL.
    update public.photos set visit_id = null where visit_id = successor.id;
    -- Consume the promoted visit row.
    delete from public.visits where id = successor.id;
  else
    -- No additional visits remain: the pin becomes an empty/backfill pin (exif handled by the trigger).
    update public.pins
       set memory_date = null,
           note        = null,
           updated_at  = now()
     where id = target_pin;
  end if;
end;
$$;

grant execute on function public.promote_primary_visit(uuid) to authenticated;

-- ── Down (manual revert) ──────────────────────────────────────────────────────
-- revoke execute on function public.promote_primary_visit(uuid) from authenticated;
-- drop function if exists public.promote_primary_visit(uuid);
