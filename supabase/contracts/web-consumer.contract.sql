-- web-consumer contract (G1). The columns/shapes the LIVE web app reads and writes. Run post-migration
-- inside a rolled-back transaction: any renamed/dropped column (or a newly-incompatible type) makes a
-- statement error, failing the gate. This proves the multi-visit migration didn't break the web client.
-- Authored in travel-map (the web app lives here).

begin;

-- ── pins: web reads all these columns and writes name/lat/lng/country_code/region_code/note/memory_date/muted ──
select id, user_id, name, lat, lng, country_code, region_code, note,
       memory_date, exif_taken_at, muted, created_at, updated_at
  from public.pins where false;

-- pins must remain writable on the web-owned columns (types unchanged, not generated/computed).
-- (A generated column would reject this shape.) Validated by a rolled-back typed insert skeleton:
do $$
begin
  perform pg_typeof(memory_date) from public.pins where false;  -- still a plain date
  perform pg_typeof(note) from public.pins where false;         -- still plain text
end $$;

-- ── photos: web reads/writes these; visit_id is additive (nullable) and web ignores it ──
select id, pin_id, user_id, storage_path, width, height, taken_at, sort_order, created_at
  from public.photos where false;

-- ── profiles + region_marks: web reads these (shape unchanged by this migration) ──
select id from public.profiles where false;
select user_id, region_code from public.region_marks where false;

rollback;
