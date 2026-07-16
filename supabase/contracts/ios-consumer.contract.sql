-- ios-consumer contract (G1) — VENDORED from mapsake-ios by reviewed PR (Path-2 topology).
-- The reads/writes MapsakeData performs. First cut: the LivePinRepository reads every `pins` column into
-- the Pin struct (`select * from pins order by created_at desc`). Grows as the app adds visits/photos
-- reads (Epic 2) and the write path (Epic 2). Any drift here vs the real binary is caught by I3
-- (contract self-consistency) in mapsake-ios before this file is re-vendored.
-- Run post-migration inside a rolled-back transaction; a dropped/renamed column fails the gate.

begin;

-- Pin (read) — MapsakeModels.Pin decodes exactly these columns with explicit CodingKeys.
select id, user_id, name, lat, lng, country_code, region_code, note,
       memory_date, exif_taken_at, muted, created_at, updated_at
  from public.pins where false;

rollback;
