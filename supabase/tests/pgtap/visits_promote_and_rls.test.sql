-- pgTAP (G2): per-visit EXIF aggregate, promote_primary_visit behavior, and owner-RLS on visits.
-- Single-caller correctness (X1 proves the concurrent-race behavior later, Story 2.1).

begin;
select plan(12);

-- ── Setup: two users (profiles auto-provision via on_auth_user_created) ────────
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'a@test.local'),
  ('b0000000-0000-0000-0000-000000000002', 'b@test.local');

-- User A: a pin (the primary visit) with a primary photo, plus two additional visits.
insert into public.pins (id, user_id, name, lat, lng, memory_date, note) values
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Kyoto', 35.0, 135.0, '2020-01-01', 'first');
insert into public.visits (id, pin_id, user_id, visit_date, note) values
  ('d0000000-0000-0000-0000-000000000021', 'c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '2021-05-05', 'second'),
  ('d0000000-0000-0000-0000-000000000022', 'c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '2022-09-09', 'third');
insert into public.photos (id, pin_id, user_id, storage_path, visit_id, taken_at) values
  ('e0000000-0000-0000-0000-000000000030', 'c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'primary.jpg', null, '2020-01-01T00:00:00Z'),
  ('e0000000-0000-0000-0000-000000000032', 'c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'third.jpg', 'd0000000-0000-0000-0000-000000000022', '2022-09-09T00:00:00Z');

-- Per-visit EXIF aggregate maintained by the trigger.
select is(
  (select exif_taken_at from public.visits where id = 'd0000000-0000-0000-0000-000000000022'),
  '2022-09-09T00:00:00Z'::timestamptz, 'per-visit exif = MIN(photos.taken_at) maintained');

-- ── Promote #1 (delete primary → most-recent additional visit v2 promoted) ─────
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.promote_primary_visit('c0000000-0000-0000-0000-000000000010');
reset role;

select is((select memory_date from public.pins where id = 'c0000000-0000-0000-0000-000000000010'),
          '2022-09-09'::date, 'primary promoted to most-recent visit date');
select is((select note from public.pins where id = 'c0000000-0000-0000-0000-000000000010'),
          'third', 'primary note promoted');
select is((select visit_id from public.photos where id = 'e0000000-0000-0000-0000-000000000032'),
          null::uuid, 'successor photos repointed to primary (visit_id NULL)');
select is((select count(*) from public.photos where id = 'e0000000-0000-0000-0000-000000000030'),
          0::bigint, 'primary old photo removed');
select is((select count(*) from public.visits where id = 'd0000000-0000-0000-0000-000000000022'),
          0::bigint, 'promoted visit row consumed');
select is((select count(*) from public.visits where id = 'd0000000-0000-0000-0000-000000000021'),
          1::bigint, 'older visit remains');

-- ── Promote #2 (v1 promoted) ──────────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.promote_primary_visit('c0000000-0000-0000-0000-000000000010');
reset role;
select is((select memory_date from public.pins where id = 'c0000000-0000-0000-0000-000000000010'),
          '2021-05-05'::date, 'second promote pulls the remaining visit');
select is((select count(*) from public.visits where pin_id = 'c0000000-0000-0000-0000-000000000010'),
          0::bigint, 'no additional visits remain');

-- ── Promote #3 (no successor → NULL) ──────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
select public.promote_primary_visit('c0000000-0000-0000-0000-000000000010');
reset role;
select is((select memory_date from public.pins where id = 'c0000000-0000-0000-0000-000000000010'),
          null::date, 'no successor → memory_date NULL');

-- ── RLS: user B cannot see or promote user A's data ───────────────────────────
insert into public.visits (id, pin_id, user_id, visit_date) values
  ('d0000000-0000-0000-0000-000000000029', 'c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', '2023-01-01');

set local role authenticated;
set local request.jwt.claims = '{"sub":"b0000000-0000-0000-0000-000000000002","role":"authenticated"}';
select is((select count(*) from public.visits where id = 'd0000000-0000-0000-0000-000000000029'),
          0::bigint, 'RLS: user B cannot see user A''s visit');
select throws_ok(
  'select public.promote_primary_visit(''c0000000-0000-0000-0000-000000000010'')',
  null, null, 'owner guard: user B cannot promote user A''s pin');
reset role;

select * from finish();
rollback;
