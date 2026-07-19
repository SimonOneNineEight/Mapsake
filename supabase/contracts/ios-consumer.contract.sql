-- ios-consumer contract (G1) — AUTHORED here in mapsake-ios (owns the queries), COPIED to travel-map
-- (supabase/contracts/ios-consumer.contract.sql) by reviewed PR (Path-2, vendored). It is the executable
-- statement of the reads/writes MapsakeData performs. Kept self-consistent with the binary by I3.
-- Run post-migration inside a rolled-back transaction.
--
-- WHAT THIS CATCHES / DOESN'T: a `select … where false` catches a DROP or RENAME of a read column. An
-- `insert … select … where false` additionally catches a written column becoming generated/non-insertable
-- or a type it no longer accepts from a DISTINCT source. It does NOT catch a *same-table* retype (the
-- self-insert's source and target move together) — that class is owned by pgTAP (G2) + the write-shape
-- fixtures. So this gate is DROP/RENAME/insertability coverage, not a full type oracle.
--
-- Coverage as of Story 2.1:
--   • Pin (read + INSERT)  — LivePinRepository.allPins / insert
--   • RegionMark (read)    — LiveRegionMarkRepository.allRegionMarks
--   • Visit (insert+read)  — LiveVisitRepository.insert / visits(forPin:)

begin;

-- Pin (read) — MapsakeModels.Pin decodes exactly these columns with explicit CodingKeys.
select id, user_id, name, lat, lng, country_code, region_code, note,
       memory_date, exif_taken_at, muted, created_at, updated_at
  from public.pins where false;

-- Pin (INSERT write-shape) — PinInsert sends exactly these columns (exif_taken_at is trigger-owned, NOT
-- sent). Catches a pins column iOS writes becoming generated / non-insertable / a default iOS relies on.
insert into public.pins (user_id, name, lat, lng, country_code, region_code, note, memory_date, muted, is_approximate)
  select user_id, name, lat, lng, country_code, region_code, note, memory_date, muted, is_approximate
  from public.pins where false;

-- RegionMark (read) — LiveRegionMarkRepository selects these four; lossy-decoded into MapsakeModels.RegionMark.
select user_id, level, region_code, country_code
  from public.region_marks where false;

-- Visit (read) — MapsakeModels.Visit decodes exactly these columns.
select id, pin_id, user_id, visit_date, note, exif_taken_at, created_at
  from public.visits where false;

-- Visit (INSERT write-shape) — VisitInsert sends exactly these four columns. `INSERT … SELECT … WHERE
-- FALSE` inserts zero rows but validates each column is directly INSERTABLE and the types line up, so a
-- generated column or a write-breaking type change on a column iOS writes is caught here.
insert into public.visits (pin_id, user_id, visit_date, note)
  select pin_id, user_id, visit_date, note
  from public.visits where false;

rollback;
