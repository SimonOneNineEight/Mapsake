-- web-consumer contract (G1). The columns/shapes the LIVE web app reads and writes. Run post-migration
-- inside a rolled-back transaction: any renamed/dropped column (or a newly-incompatible type) makes a
-- statement error, failing the gate. This proves the multi-visit migration didn't break the web client.
-- Authored in travel-map (the web app lives here).

begin;

-- ── pins: web reads all these columns and writes name/lat/lng/country_code/region_code/note/memory_date/muted ──
select id, user_id, name, lat, lng, country_code, region_code, note,
       memory_date, exif_taken_at, muted, created_at, updated_at
  from public.pins where false;

-- WRITE shape (the earlier pg_typeof/where-false checks were no-ops). `INSERT … SELECT … WHERE FALSE`
-- inserts zero rows but validates each column is directly INSERTABLE (a generated/computed column
-- rejects it) and that the projected types match — catching a generated column or a write-breaking type
-- change on the web-written columns. (Residual gap: a new NOT-NULL-without-default column isn't caught by
-- a zero-row insert; that + an authenticated-role run to catch RLS/grant regressions are a follow-up.)
insert into public.pins (user_id, name, lat, lng, country_code, region_code, note, memory_date, exif_taken_at, muted)
  select user_id, name, lat, lng, country_code, region_code, note, memory_date, exif_taken_at, muted
  from public.pins where false;
update public.pins set memory_date = memory_date, note = note, muted = muted where false;

-- ── photos: web reads/writes these; visit_id is additive (nullable) and web ignores it ──
select id, pin_id, user_id, storage_path, width, height, taken_at, sort_order, created_at
  from public.photos where false;
insert into public.photos (pin_id, user_id, storage_path, width, height, taken_at, sort_order)
  select pin_id, user_id, storage_path, width, height, taken_at, sort_order
  from public.photos where false;

-- ── profiles + region_marks: web reads these (shape unchanged by this migration) ──
select id from public.profiles where false;
select user_id, region_code from public.region_marks where false;

rollback;
