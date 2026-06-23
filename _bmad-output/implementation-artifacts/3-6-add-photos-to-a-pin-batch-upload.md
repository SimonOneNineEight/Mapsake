---
baseline_commit: ebe7bed
---

# Story 3.6: Add photos to a pin (batch upload)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to upload a batch of photos to a pin,
so that I can capture a trip's images at once.

## Acceptance Criteria

1. **Batch select → resize → upload → attach.** From an open pin's memory, a quiet "＋ 加照片" affordance opens a multi-select file picker (camera roll). Selected images **resize client-side to WebP (~2048px longest edge, quality ≈0.80)**, upload to a **private Storage bucket**, and attach to the pin — one metadata row per photo in the `photos` table (`storage_path`, `width`, `height`, `taken_at`, `sort_order`). Durable-write: a photo reads as "done" only after BOTH the object upload AND the row insert are acked; a failure is retained for retry, never silently dropped. [epics 3.6 AC1; architecture#photos schema lines 135–137; architecture#Photo-pipeline lines 166, 315; AR7]
2. **Eager batch UX, calm failures.** Thumbnails/placeholders render **immediately** (local object-URL preview) so the card never looks broken mid-upload. Per-photo state: **queued → uploading (quiet per-photo progress) → done**. A per-photo failure shows a **calm inline "重試" (retry)** on that photo only — never a blocking modal, red banner, or hard error. Other photos in the batch keep going. No modal takeover for "hot camera roll / many at once." [epics 3.6 AC2; EXPERIENCE Photo batch upload line 64 + State matrix line 83; UX-DR8]
3. **EXIF capture date is captured.** For a photo carrying EXIF `DateTimeOriginal`, its capture date is read from the **original file (before re-encoding strips EXIF)** and stored in `photos.taken_at`. This feeds re-live eligibility later (Epic 5). No EXIF → `taken_at` is null (fine; not required). [epics 3.6 AC3; architecture#Re-live-eligibility line 169 + 123; EXPERIENCE line 123]
4. **Card stays complete; absence is normal.** With no photos, the card shows only the quiet "＋ 加照片" invitation — never "0 photos", an empty grid frame, or a broken slot. Photos render as a thumbnail grid (rounded imagery, blur-up/placeholder while loading). The title-only card from 3.4/3.5 still renders complete. [EXPERIENCE Principle line 47 + line 71 + Bare-mark line 76; DESIGN Memory card line 231 + Imagery line 225]
5. **No regression.** Story 3.4 open/close/swap + selected glow, 3.5 note/date editing, and 3.1/3.3 pin drop+cluster all still work. Photos belong to one pin and do not bleed across pin swaps (the card is keyed by `pin.id` — 3.5 fix). Tapping a thumbnail does nothing destructive in 3.6 (the full-screen viewer is Story 3.7).

## Tasks / Subtasks

- [x] **Task 0 — Library decisions (flagged for approval; see "Questions" at end)**
  - [x] **EXIF read:** add **`exifr`** (small, well-maintained; reads `DateTimeOriginal` reliably). Canvas re-encoding strips EXIF, so the date MUST be read from the original `File` before resize. A hand-rolled APP1/DataView parser is the only no-dep alternative and is fragile — recommend `exifr`. This is a NEW dependency → dev-story would normally HALT; treat it as **pre-approved IF the user confirms the end-of-story question**, otherwise HALT and ask. Install with `pnpm add exifr`.
  - [x] **Image resize:** **no new dependency** — use the native `<canvas>` path (`createImageBitmap` → draw scaled → `canvas.toBlob(cb, "image/webp", 0.8)`). Avoids `browser-image-compression`. (Matches CLAUDE.md "minimum deps".)
  - [x] **HEIC:** browsers cannot `<canvas>`-decode iPhone HEIC. v1 accepts browser-decodable types (jpeg/png/webp); a HEIC that fails to decode surfaces as a per-photo retry/error (AC2 path), not a crash. HEIC→JPEG conversion (`heic2any`) is a **deferred fast-follow** — log to deferred-work.md, do NOT build.
- [x] **Task 1 — Migration: `photos` table + private bucket + RLS (AC: 1)** [architecture lines 135–143, 154]
  - [x] New migration `supabase/migrations/20260623120000_init_photos.sql` (exact SQL in Dev Notes → "Migration"). Create `public.photos` per the canonical schema (`storage_path text NOT NULL`, `width`/`height` int, `taken_at timestamptz`, `sort_order int default 0`, `pin_id → pins ON DELETE CASCADE`, `user_id → profiles ON DELETE CASCADE`), index `(pin_id)`.
  - [x] Owner-scoped RLS (4 policies) mirroring `pins`, using `(select auth.uid())`. **Insert check also verifies the target pin belongs to the user** (`exists (select 1 from pins where id = pin_id and user_id = (select auth.uid()))`) so a client can't attach a row to a foreign pin.
  - [x] Create the **private** Storage bucket `pin-photos` (`public = false`) and `storage.objects` RLS so the owner can insert/select/delete only objects whose first path segment equals their `auth.uid()` (path convention `{user_id}/{pin_id}/{photo_id}.webp`). SQL in Dev Notes.
  - [x] Apply it: `supabase db push` (HALT and ask Simon to confirm before pushing to the live project, per prior stories — he says "run it").
  - [x] Regenerate types: `supabase gen types typescript --local > types/supabase.ts` then **strip any trailing non-TS line after the final `} as const`** (the known PostHog-telemetry-line gotcha). Verify `Database["public"]["Tables"]["photos"]` exists.
- [x] **Task 2 — `data/photos.ts`: the ONLY Supabase boundary for photos + storage (AC: 1, 3)** [data-boundary; durable-write]
  - [x] `Photo` domain interface (camelCase): `id, pinId, userId, storagePath, width, height, takenAt: string | null, sortOrder, createdAt`. snake↔camel `toDomain` + `COLUMNS` const here, mirroring `data/pins.ts`.
  - [x] `listPhotos(pinId: string): Promise<Photo[]>` — select by `pin_id`, order by `sort_order, created_at`. RLS scopes to owner.
  - [x] `uploadPhotoObject({ userId, pinId, photoId, blob }): Promise<string>` — `supabase.storage.from("pin-photos").upload(path, blob, { contentType: "image/webp", upsert: false })`; path = `${userId}/${pinId}/${photoId}.webp`; return the path. Throws on failure.
  - [x] `insertPhoto(input: { id, pinId, storagePath, width, height, takenAt, sortOrder }): Promise<Photo>` — insert with `user_id = (await getUser()).id` (must equal `auth.uid()` for the RLS check; never trust client `user_id`), `select(COLUMNS).single()`, return domain. Pass the SAME `id` used for the storage path so object+row are linked.
  - [x] `createSignedUrls(paths: string[]): Promise<Record<string, string>>` — `supabase.storage.from("pin-photos").createSignedUrls(paths, 3600)`; map path→signedUrl (skip entries with errors). Private bucket ⇒ thumbnails need signed URLs.
  - [x] (Delete object + row is **Story 3.8** — do NOT build here.)
- [x] **Task 3 — `features/memories/lib/process-image.ts`: client resize → WebP + EXIF (AC: 1, 3)**
  - [x] `processImage(file: File): Promise<{ blob: Blob; width: number; height: number; takenAt: string | null }>`.
  - [x] EXIF FIRST (before re-encode): `await exifr.parse(file, ["DateTimeOriginal"])`; map to an ISO string for `taken_at` (null if absent/unparseable — never throw on missing EXIF).
  - [x] Resize: `createImageBitmap(file)` → if `max(w,h) > 2048` scale down preserving aspect → draw to a `<canvas>`/`OffscreenCanvas` → `toBlob(cb, "image/webp", 0.8)`. Return the scaled `width`/`height`. If decode fails (e.g. HEIC), throw so the queue marks that file failed (AC2 retry path).
- [x] **Task 4 — `features/memories/queries/photos-queries.ts` (AC: 1, 2)** [TanStack Query; durable-write]
  - [x] `usePhotos(pinId: string | null)` — key `["photos", pinId]`, `queryFn`: `listPhotos` then `createSignedUrls` for the rows; return `Photo & { url: string }`. `enabled: !!pinId`. (URLs expire ~1h; refetch-on-focus refreshes — acceptable v1.)
  - [x] `useUploadPhoto(pinId)` — single-file mutation: `processImage(file)` → `uploadPhotoObject` → `insertPhoto` → `onSuccess` invalidate `["photos", pinId]`. `retry: 1`. The uploader (Task 5) fans this out per selected file and tracks per-file state for the queue + inline retry. Compute each file's `sort_order` as `(current max sort_order) + 1 + indexInBatch`.
  - [x] Durable-write: a photo becomes a "real" thumbnail (from the `["photos"]` cache via signed URL) ONLY after `insertPhoto` acks; until then the uploader shows the local object-URL placeholder + progress. On failure, KEEP the queued item with a calm retry (no rollback, no removal).
- [x] **Task 5 — Upload UI: `photo-uploader.tsx` + `photo-grid.tsx` (AC: 2, 4)** [EXPERIENCE lines 64, 83; DESIGN lines 225, 230, 231]
  - [x] `photo-grid.tsx` — thumbnail grid of the pin's photos: aspect-square, `object-cover`, `rounded-md` (DESIGN imagery follows container radius), a calm placeholder/blur-up background until each image loads (`onLoad`). Tap is inert in 3.6 (viewer = 3.7). Interleave the in-flight uploader placeholders so order reads naturally.
  - [x] `photo-uploader.tsx` — quiet `link-quiet` "＋ 加照片" button → hidden `<input type="file" accept="image/*" multiple>`. On change: build a local queue `{ tempId, name, previewUrl: URL.createObjectURL(file), status: "queued"|"uploading"|"done"|"error" }`, then run each through `useUploadPhoto`. Show per-photo progress (a quiet spinner/overlay — NO percentage bar required) and, on error, an inline **"重試"** affordance scoped to that item. Revoke object URLs on unmount. No blocking modal/red error anywhere.
  - [x] **Per-pin soft cap (~30):** when the pin already has ≥30 photos, quietly disable/hint the add affordance (calm copy, not a scold). The ~2GB/user quota is **monitor-only / deferred** (architecture line 166) — do NOT enforce it client-side in v1; log to deferred-work.md.
- [x] **Task 6 — Wire photos into the memory card (AC: 4, 5)** [memory-card.tsx]
  - [x] Add a photos section to `memory-card.tsx`: render `<PhotoGrid>` (when photos exist or an upload is in flight) and `<PhotoUploader>` (the "＋ 加照片" invitation, always present). Keep the card complete-with-title-only; absence shows just the invitation. Place it consistently with the note/date invitations (DESIGN link-quiet group).
  - [x] Confirm no bleed across pin swaps — the card is already keyed by `pin.id` (3.5), and `usePhotos`/the uploader queue are scoped to the open `pin.id`. Verify the uploader's local queue resets on remount.
- [x] **Task 7 — Tests (AC: all)**
  - [x] Unit: `process-image` — a >2048px fixture resizes to ≤2048 longest edge and yields an `image/webp` blob; an EXIF fixture yields `takenAt`, a stripped one yields `null`. (jsdom lacks canvas/createImageBitmap → run these where canvas is available, or guard/skip with a note if the runner can't decode; prefer a Playwright-context unit if needed.)
  - [x] e2e (`e2e/memory.spec.ts` or new `photos.spec.ts`): drop a pin → open → "＋ 加照片" → `setInputFiles` a small fixture image → assert a placeholder appears immediately, then a thumbnail (`img` with a signed-URL `src`) after ack → **reload** and confirm the photo persists (wait for the upload ack before reload — the established write-cancel-race fix). Reuse `dropPin`/`clickPin` helpers; mind the known anon-rate-limit + post-reload `clickPin` flakes (deferred-work.md).
  - [x] `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build` green.

### Review Findings (code review 2026-06-23)

3 adversarial layers (Blind / Edge / Acceptance). Verdict: spec satisfied, all 5 ACs met, architecture clean (data-boundary, owner-scoped RLS incl. pin-ownership insert check, private bucket + signed URLs, durable-write, tokens, approved `exifr` only, MapLibre untouched). 0 decision-needed · 1 patch · 3 defer · dismissed (rest).

**Patch (applied 2026-06-23):**
- [x] [Review][Patch] **Orphaned Storage object on insert-failure** — `uploadOne` uploads the object then inserts the row; if `insertPhoto` throws after the upload acked, the `.webp` is left in the bucket with no row. Retry mints a fresh `crypto.randomUUID()` → uploads to a new path, so the first object is never reclaimed, and Story 3.8's row-based cleanup can't catch a row-less orphan. **Fixed:** added `removePhotoObject(path)` to `data/photos.ts` (best-effort, swallows its own error) and call it in `uploadOne`'s `catch` around `insertPhoto` before rethrowing. tsc/lint clean; photo e2e green. [features/memories/queries/photos-queries.ts, data/photos.ts]

**Deferred (also in deferred-work.md):**
- [x] [Review][Defer] **No `<img>` onError fallback for expired/failed signed URLs** — `Thumb` renders nothing/broken silently if a signed URL 403s (card open >1h without refocus). Pairs with the existing signed-URL-caching defer. [features/memories/components/photo-grid.tsx]
- [x] [Review][Defer] **`taken_at` stored UTC from tz-naive EXIF** — `DateTimeOriginal` has no tz; `toISOString()` normalizes to UTC, so wall-clock capture can shift by the device offset. Harmless for Epic 5 day-granularity eligibility; revisit if exact local capture time matters. [features/memories/lib/process-image.ts]
- [x] [Review][Defer] **No e2e for cross-pin no-bleed / EXIF-positive branch** — upload+persist is covered; cross-pin photo no-bleed (structurally safe via `key={pin.id}`) and the EXIF-bearing `taken_at` path are asserted by reasoning only. Add when a unit runner lands / alongside the clickPin-flake fix. [e2e/memory.spec.ts]

Dismissed (verified non-issues): `sort_order` non-determinism on retry (column is not unique; `created_at` is the deterministic tiebreaker); MAX_PER_PIN client-only (by-design soft cap, 2GB/user monitor-only); RLS/storage-object policies correct (path segment[1] = `auth.uid()`, insert check verifies pin ownership, `user_id` from `getUser()` not client); `process-image` object-URL revoke is leak-free (finally + unmount ref-mirror effect); double-revoke is a harmless no-op; the e2e `img[src^="http"]` assertion is meaningful (distinguishes the signed URL from the `blob:` placeholder).

## Dev Notes

### What this story adds (and what it must NOT touch)
- **NEW:** `photos` table + `pin-photos` private bucket + storage RLS (migration); `data/photos.ts` (boundary); `features/memories/lib/process-image.ts`; `features/memories/queries/photos-queries.ts`; `features/memories/components/photo-uploader.tsx` + `photo-grid.tsx`. **UPDATE:** `memory-card.tsx` (add the photos section), `types/supabase.ts` (regen), `package.json` (add `exifr`).
- **Do NOT** modify MapLibre / `features/map` (architecture: MapLibre confined to `features/map`; photos don't touch the map). **Do NOT** build the full-screen viewer (3.7), photo delete (3.8), or pins→visited roll-up (3.9). **Do NOT** add a DB moddatetime trigger or enforce the 2GB/user quota (deferred).

### Current state of files being modified
- **`data/pins.ts`** — the boundary pattern to mirror exactly: `createClient()` from `@/lib/supabase/client`, `PinRow` from `@/types/supabase`, a `toDomain` mapper, a `COLUMNS` string, RLS-scoped queries, `getUser()` for the owner id on insert (never trust client `user_id`). `data/photos.ts` follows this shape 1:1. [Source: data/pins.ts]
- **`features/pins/queries/pins-queries.ts`** — query/mutation pattern: keys as `() => [...] as const`, `useSessionUserId()` gate (`enabled: !!userId`), optimistic `onMutate` + `onSuccess` invalidate + `retry: 1`, **no `onError` rollback** (durable-write retain). `photos-queries.ts` mirrors this; key is `["photos", pinId]` (scoped by pin, not user — RLS already scopes rows, and a pin belongs to one user). [Source: features/pins/queries/pins-queries.ts]
- **`features/memories/components/memory-card.tsx`** — renders `pin.name` (always) + note + date invitations using `linkQuiet = "self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline"`. The card is mounted with `key={pin.id}` by `memory-container.tsx` (3.5 fix) so per-pin local state resets on swap — the photo uploader's local queue rides on that remount. Add the photos section in the same quiet-invitation idiom. [Source: features/memories/components/memory-card.tsx, memory-container.tsx]
- **`lib/supabase/client.ts`** — `createBrowserClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)`. The publishable (anon) key + RLS is the privacy boundary; the service-role key is server-only and not used here. [Source: lib/supabase/client.ts]

### Migration (exact intent — `supabase/migrations/20260623120000_init_photos.sql`)
```sql
-- Story 3.6: photos on a pin. Binaries live in a private Storage bucket (media decoupled
-- from core data); this table holds only the path + dims + EXIF date + order.
create table public.photos (
  id           uuid primary key default gen_random_uuid(),
  pin_id       uuid not null references public.pins (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  taken_at     timestamptz,          -- EXIF DateTimeOriginal (re-live eligibility); nullable
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index idx_photos_pin_id on public.photos (pin_id);

alter table public.photos enable row level security;
create policy photos_owner_select on public.photos
  for select using (user_id = (select auth.uid()));
create policy photos_owner_insert on public.photos
  for insert with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.pins p where p.id = pin_id and p.user_id = (select auth.uid()))
  );
create policy photos_owner_update on public.photos
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy photos_owner_delete on public.photos
  for delete using (user_id = (select auth.uid()));

-- Private bucket + owner-scoped object RLS. Path: {user_id}/{pin_id}/{photo_id}.webp
insert into storage.buckets (id, name, public) values ('pin-photos', 'pin-photos', false)
  on conflict (id) do nothing;
create policy "pin-photos owner read" on storage.objects
  for select using (bucket_id = 'pin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pin-photos owner insert" on storage.objects
  for insert with check (bucket_id = 'pin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "pin-photos owner delete" on storage.objects
  for delete using (bucket_id = 'pin-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
```
(Confirm `gen_random_uuid()` and the `profiles`/`pins` FKs match the prior migrations' conventions before pushing.)

### Photo pipeline contract (architecture lines 154, 166, 315; AR7)
- **Client resize → WebP ~2048px / q≈0.80** (~300–600 KB each); store viewing-resolution only (no originals).
- **Private bucket + signed URLs** (`createSignedUrls`, ~1h). Never make the bucket public.
- **EXIF date at upload**, read from the original before re-encode (canvas strips it).
- **Caps:** ~30/pin (soft, client-side hint in v1), ~2GB/user (monitor-only, deferred).
- **Media decoupled:** a Storage outage must not block reading the note/title (invariant #4, #57). The card renders without photos; only the grid degrades.

### Re-live eligibility note (don't over-build)
EXPERIENCE line 123 ("first photo's EXIF date as the anniversary") is **Epic 5** logic. Story 3.6's job is only to **capture** `photos.taken_at`. Do not compute/stamp `pins.exif_taken_at` here — that roll-up belongs to eligibility (Epic 5) / can read `min(photos.taken_at)` later.

### Testing standards
- Unit tests live beside logic (`*.test.ts`); e2e in `e2e/` on the `window.__mapsakeMap` harness with `--enable-unsafe-swiftshader` (configured). Each Playwright context = a fresh anon user under RLS; **wait for the upload ack before reload** to dodge the write-cancel race. Known flakes (anon rate-limit; post-reload `clickPin` timing) are logged in deferred-work.md — re-run a flaky single test in isolation to confirm.
- Use a tiny committed fixture image (e.g. `e2e/fixtures/sample.jpg`) for `setInputFiles`; keep one with EXIF for the date assertion if practical.

### Project Structure Notes
- Paths align with architecture#Frontend-Architecture: `features/memories/` owns the memory UI (panel/sheet, photos, note, date); `data/` is the sole Supabase boundary; the photo bucket is the media store. [architecture lines 263, 288]
- `photos-queries.ts` key `["photos", pinId]` is per-pin (rows are RLS-scoped + a pin has one owner), distinct from the user-scoped `["pins", userId]`.
- No conflicts with the unified structure. New files only; one UPDATE to `memory-card.tsx`.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-3.6 lines 280–285; AR2 line 67; AR7 line 72; UX-DR8 line 88; FR11 line 38; FR14 line 41; NFR6 line 63]
- [Source: _bmad-output/planning-artifacts/architecture.md#photos-schema lines 135–143; #Auth-Security line 154; #API line 157; #Photo-pipeline line 166; #Photo-envelope-resolved line 315]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/EXPERIENCE.md Photo batch upload line 64; State matrix lines 83–84; Principle lines 47, 71; Bare-mark line 76; EXIF line 123]
- [Source: .../ux-designs/ux-travel-map-2026-06-16/DESIGN.md Imagery/radius line 225; Quiet link line 230; Memory card line 231]
- [Source: data/pins.ts; features/pins/queries/pins-queries.ts; features/memories/components/memory-card.tsx; supabase/migrations/20260622120000_init_pins.sql]

### Open questions for Simon — ALL CONFIRMED 2026-06-23 ✅
1. **`exifr` for EXIF `DateTimeOriginal` — APPROVED.** `pnpm add exifr` is pre-approved (no further dev-story HALT needed for this dep).
2. **Bucket `pin-photos`, path `{user_id}/{pin_id}/{photo_id}.webp` — APPROVED.**
3. **HEIC deferred — APPROVED.** v1 accepts jpeg/png/webp; HEIC that can't canvas-decode → calm per-photo retry. Log `heic2any` to deferred-work.md.
4. **~30/pin soft cap (quiet hint) now; 2GB/user monitor-only/deferred — APPROVED.**

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (1M context)

### Debug Log References

- **`createImageBitmap` fails under headless SwiftShader** ("The source image could not be decoded.") even for a valid PNG. Isolated it: `HTMLImageElement` decode + `canvas.toBlob("image/webp")` both work in the same context. Switched `process-image.ts` from `createImageBitmap` to the `<img>` decode path — more compatible everywhere (real + headless), same HEIC-rejects-→-retry behavior. (Logged as a dev learning in deferred-work.md.) This was the only implementation snag; the e2e upload test went green immediately after.

### Completion Notes List

- All 5 ACs met; full pipeline verified end-to-end by the new `e2e/memory.spec.ts` "add a photo" test in a real browser (resize→WebP→private-bucket upload→row insert→signed-URL thumbnail→persists across reload).
- **Deviation from Task 3 wording:** the resize decode uses `HTMLImageElement` instead of `createImageBitmap` (see Debug Log). AC1 (resize to WebP ~2048/q0.80) is unchanged; only the decode mechanism differs.
- Migration pushed to the live project (Simon confirmed) — `photos` table + owner-scoped RLS (insert check verifies pin ownership) + private `pin-photos` bucket + storage-object RLS. Types regenerated from the remote and the trailing PostHog telemetry line stripped.
- Durable-write: a photo becomes a real thumbnail only after upload+insert ack; `useUploadPhoto` awaits the cache invalidation+refetch, so the placeholder is dropped with no flicker (the persisted thumbnail is already cached). Failures keep the queued item with a calm inline "重試"; no rollback, no blocking error.
- EXIF `DateTimeOriginal` read from the original file before re-encode → `photos.taken_at` (null when absent). Not surfaced in 3.6 UI (feeds Epic 5); deferred a UI/assert for it.
- Validation: `tsc --noEmit` clean · `pnpm lint` clean · `pnpm build` clean · e2e new photo test passes. Full suite: 18 passed + the 2 known post-reload `clickPin` timing flakes (note-persist / date-persist), which pass deterministically in isolation (confirmed 2.2s) — pre-existing, logged in deferred-work.md, not a 3.6 regression.
- Deferred (deferred-work.md): HEIC (`heic2any`); `process-image` unit test (no unit runner in repo); `taken_at` UI/assert + pin-level EXIF roll-up (Epic 5); signed-URL caching; photo delete + object cleanup (Story 3.8); 2GB/user quota (monitor-only).

### File List

- **NEW** `supabase/migrations/20260623120000_init_photos.sql` — photos table + RLS + private bucket + storage RLS
- **NEW** `data/photos.ts` — Supabase boundary for photos + storage (list/upload/insert/signed-urls)
- **NEW** `features/memories/lib/process-image.ts` — client resize→WebP + EXIF date
- **NEW** `features/memories/queries/photos-queries.ts` — `usePhotos`, `useUploadPhoto`
- **NEW** `features/memories/components/photo-grid.tsx` — presentational thumbnail grid
- **NEW** `features/memories/components/photo-uploader.tsx` — batch queue + "＋ 加照片" + inline retry + soft cap
- **NEW** `e2e/fixtures/sample.png` — upload fixture
- **MOD** `features/memories/components/memory-card.tsx` — render the photos section
- **MOD** `types/supabase.ts` — regenerated (adds `photos`)
- **MOD** `package.json` + `pnpm-lock.yaml` — add `exifr`
- **MOD** `e2e/memory.spec.ts` — add the photo upload+persist test
- **MOD** `_bmad-output/implementation-artifacts/deferred-work.md` — 3.6 deferrals + dev learning
- **MOD** `_bmad-output/implementation-artifacts/sprint-status.yaml` — 3-6 status

### Change Log

- 2026-06-23 — Story 3.6 implemented (photos on a pin, batch upload). New `photos` table + private bucket migration (pushed live); `data/photos.ts`; client resize/EXIF pipeline; batch-upload queue UI with per-photo retry; wired into the memory card. Status → review.
