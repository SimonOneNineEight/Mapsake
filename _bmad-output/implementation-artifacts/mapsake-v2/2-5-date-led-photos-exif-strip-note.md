# Story 2.5: Date-led photos, EXIF strip & per-visit note

Status: ready-for-dev

## Story

As a traveler,
I want the picker to lead with photos from around that date, and a place to write a line,
so that attaching the right memories takes seconds.

## Acceptance Criteria

**AC1 — Contextual authorization, full or limited honored (epics.md#Story 2.5, verbatim; NFR3)**
Given a set visit date, When the photo step opens, Then photo-library authorization is requested **contextually** (at first attach, not on entry), and **full or limited access is honored** (limited → suggest within the user's granted subset with a manage-selection affordance); all suggestion logic runs **on-device**; **nothing is auto-attached** (tap to select).

**AC2 — GPS-EXIF strip, capture-date retained, resize, caps (epics.md#Story 2.5, verbatim; NFR3)**
Given selected photos, When they upload, Then **GPS EXIF is stripped** before upload while **capture-date (DateTimeOriginal) is retained**, images **resize to ~2048px** (longest edge), and **per-pin / per-user caps** apply, And a quiet optional **one-line note** field saves onto **this visit** (FR9).

### Additional acceptance criteria (from UX + architecture)

**AC3 — Date-suggested grid (FR8)**
Given the set visit date, Then the grid heading is 「{M 月 D 日}的照片」 with a sub carrying count + scope (e.g. 從你的照片圖庫找到 12 張 · 全部照片 / 從你選的照片中找到…); suggestions are `PHAsset`s whose `creationDate` falls on/around that date, on-device; an in-grid **＋其他照片** tile opens the full `PHPicker` for any other photo. [EXPERIENCE.md line 69]

**AC4 — The note saves onto THIS visit (FR9)**
Given the note field 「想寫點什麼…」 (candidate), Then the one-line note saves onto the visit being created — `PinInsert.note` for a new pin (primary), `VisitInsert.note` for an additional visit. Skipping costs nothing (nil note). [EXPERIENCE.md line 69, architecture Shape A]

**AC5 — The write moves to the photo step; the visit is created before photos attach**
Given the capture flow, Then the date step's primary becomes **下一步：上傳照片** (advance, carrying the date — NO write yet), and the photo step's primary **上傳（N 張照片）** / skip **不加照片，直接記錄** performs the single visit write (date + note) and THEN, using the returned pin/visit id, uploads each processed photo to Storage + inserts its `photos` row. Confirmed write, calm failure (NFR4). New pin → `photos.pin_id` = the pin, `visit_id` = NULL (primary). Additional visit → `pin_id` = matched pin, `visit_id` = the created visit. [EXPERIENCE.md line 69, architecture 122]

**AC6 — Storage path + photos row**
Given an uploaded photo, Then it lands in the `pin-photos` bucket at **`{user_id}/{pin_id}/{photo_id}`**; the `photos` row is `{ pin_id, user_id, visit_id?, storage_path, width, height, taken_at, sort_order }` (taken_at = the retained EXIF DateTimeOriginal as a canonical UTC timestamp; `sort_order` = selection order). The per-pin exif trigger + per-visit aggregate (already in the 1.4 migration) derive `exif_taken_at` — the client never sets it. [architecture 51, 123; photos schema `supabase/migrations/20260623120000_init_photos.sql`]

**AC7 — Types + boundary + testability**
Given the implementation, Then image processing (resize + GPS-EXIF strip + DateTimeOriginal extraction) is a **pure, testable** unit (ImageIO/CoreGraphics, app-layer — it operates on image `Data`, not PhotoKit); PhotoKit (auth, `PHAsset` date query, `PHPicker`) and Storage upload are **protocol seams** with fakes, so the photo-step state machine + the write/upload coordinator are unit-tested off the device/network; `MapsakeModels` stays free of Supabase/PhotoKit/UIKit; every user-facing string is a typed `L` key (new copy candidate, FR28). [architecture 162, 221, 229]

**AC8 — Privacy posture (NFR3)**
Given App Review + privacy: authorization is contextual (Info.plist `NSPhotoLibraryUsageDescription`, candidate copy), suggestion logic is on-device (no library metadata leaves the device except the chosen, stripped images), GPS is stripped pre-upload, no analytics SDK. Limited-access selection is honored, never coerced to full.

## Tasks / Subtasks

- [ ] **Task 1 — Photo model + insert + repository seam** (AC: 6, 7)
  - [ ] `Photo` (read) + `PhotoInsert` (write) in MapsakeModels with EXPLICIT CodingKeys (`pin_id`, `visit_id`, `user_id`, `storage_path`, `taken_at`, `sort_order`; omit `id`/`created_at`; NEVER set `exif_taken_at` — trigger-owned). `taken_at` is a `Date?` (timestamptz, ISO8601 — NOT a CalendarDate).
  - [ ] `PhotoRepository` seam (MapsakeData): `insert(_ PhotoInsert) async throws -> Photo`; live impl over PostgREST. Owner-scoped RLS.
- [ ] **Task 2 — Storage upload seam** (AC: 2, 6)
  - [ ] `PhotoStorage` seam (MapsakeModels protocol referencing only value types): `upload(data: Data, path: String, contentType: String) async throws`. Live impl (MapsakeData) over `supabase.storage.from("pin-photos")`. Path built as `{userId}/{pinId}/{photoId}` (photoId generated client-side = the `photos.id`).
- [ ] **Task 3 — Image processing (pure, testable)** (AC: 2)
  - [ ] `Mapsake/Features/Capture/Photos/ImageProcessor.swift` (app-layer, ImageIO/CoreGraphics): given source image `Data` → (a) read `DateTimeOriginal` (+ orientation) via `CGImageSource`; (b) downscale longest edge to ~2048px via `CGImageSourceCreateThumbnailAtIndex` (respect orientation); (c) re-encode (JPEG ~0.8 or HEIC) writing back ONLY safe metadata — **drop the `{GPS}` dictionary**, keep `{Exif} DateTimeOriginal`; return `(data, width, height, takenAt: Date?)`. `takenAt` normalized to a canonical UTC `Date` (see Dev Notes — HEIC/timezone hazard). Unit tests with fixture images: GPS present → stripped; DateTimeOriginal preserved; dimensions ≤ 2048.
- [ ] **Task 4 — PhotoKit suggestion + picker seams** (AC: 1, 3)
  - [ ] `PhotoLibrary` seam (app-layer protocol): `authorize() async -> PhotoAuthStatus` (`.full/.limited/.denied`), `assets(around date: CalendarDate, window: Int) async -> [PhotoAssetRef]` (PHAsset ids + thumbnails, `creationDate` within ±window days, honoring limited subset), `loadImageData(_ ref) async throws -> Data`. Live impl wraps `PHPhotoLibrary`/`PHAsset`/`PHImageManager`; the ＋其他照片 tile presents `PHPickerViewController`. Fakeable for tests.
- [ ] **Task 5 — PhotoStepViewModel (@Observable, MapsakeModels)** (AC: 1, 4, 5, 7)
  - [ ] Holds: the `ResolvedPlacement` + the date (carried from the date step), the auth status, suggested + picked selections (ordered), the note, `writeState` (idle/saving/saved/saveFailed). `save()` / `skipPhotos()` → the write+upload coordinator (Task 6). Caps enforced (reject beyond per-pin/per-user cap with a calm inline line). Unit-tested against fakes (no device/network).
- [ ] **Task 6 — Write + upload coordinator** (AC: 5, 6)
  - [ ] Create the visit (via `CaptureWriter`, carrying date + note) → get `pin_id` (+ `visit_id` for additional) → for each selected photo: process (Task 3) → `PhotoStorage.upload` to `{userId}/{pinId}/{photoId}` → `PhotoRepository.insert`. Confirmed; map failures to `saveFailed(retryable:)`. Partial-failure posture: the visit is created first; a photo that fails to upload is retryable without duplicating the visit (idempotency note — see Dev Notes). On success → dismiss + `MapViewModel.load()`.
- [ ] **Task 7 — PhotoStepScreen** (AC: 1, 3, 4, 8)
  - [ ] `Mapsake/Features/Capture/Photos/PhotoStepScreen.swift`: heading 「{M 月 D 日}的照片」 + scope sub; the on-device suggested grid (tap-to-select check tiles, ≥44pt); the ＋其他照片 tile → `PHPicker`; below the grid the note field 「想寫點什麼…」 (expands as typed); primary `上傳（N 張照片）` / skip `不加照片，直接記錄`. Contextual auth prompt at first attach; limited → a manage-selection affordance. a11y + tokens; Reduce-Motion respected.
- [ ] **Task 8 — Flow rewire** (AC: 5)
  - [ ] `DateStepViewModel`/`DateStepScreen`: the primary no longer writes — it carries the date forward to the photo step (primary label → 下一步：上傳照片, a candidate; 記錄 usage ret(ires review). `MapScreen` `CaptureRoute`: add `.photoStep`. The terminal write lives in the photo step now (2.6 later moves it to the save moment). Update the moved write tests.
- [ ] **Task 9 — Candidate strings + Info.plist** (AC: 4, 7, 8)
  - [ ] Candidates: `photo.gridHeading` (「%@的照片」), `photo.scope*`, `photo.notePlaceholder` (想寫點什麼…), `photo.upload` (上傳（%lld 張照片）), `photo.skip` (不加照片，直接記錄), `date.nextPhotos` (下一步：上傳照片), the cap line, the limited-access manage line, `NSPhotoLibraryUsageDescription`. 上傳 (vocab.upload) is BLESSED. All `needs_review` (FR28).
- [ ] **Task 10 — Tests + review**
  - [ ] `swift test` (image-processor + photo-step VM + coordinator against fakes) green; `xcodebuild build`/`test` green; SwiftLint clean. `bmad-code-review` (Fable 5). Live PhotoKit auth/suggestions + real Storage upload are **on-device + Simon-gated** (needs the 1.4 migration pushed AND the `pin-photos` Storage RLS confirmed for the anon iOS principal).

## Dev Notes

### ⚠️ Open architectural questions + gates (confirm with Simon — see checkpoint)

1. **Photo-date normalization (architecture line 63, marked OPEN).** iOS HEIC + timezone-sensitive EXIF vs the shared `photos.taken_at` (web wrote it too). If iOS writes a local-time `DateTimeOriginal` and web writes UTC, the same column carries two meanings → memories land on the wrong day (a direct hit on the re-live thesis). **Recommendation:** normalize `taken_at` to a canonical UTC `Date` **client-side** on ingest (parse EXIF `DateTimeOriginal` + `OffsetTimeOriginal` when present; else assume device-local → UTC), AND note the architecture's preferred long-term fix is **server-side normalization on ingest**. Needs Simon's call: client-canonical now, or wait for a server-side normalization trigger?
2. **Storage RLS for the anon iOS principal.** The `pin-photos` bucket + owner-scoped RLS exist (v1 web). Confirm the anonymous iOS user has Storage INSERT permission at `{user_id}/{pin_id}/{photo_id}` — if not, it's a Simon-gated Storage-policy push (like the DB migrations).
3. **Migrations not yet pushed.** `photos.visit_id` + the per-visit exif aggregate ship in the 1.4 migration, still Simon-gated (`supabase db push`). Photo writes can't be validated end-to-end until then (same posture as 2.3/2.4 writes).
4. **EXIF strip-vs-declare (architecture 64, OPEN).** AC2 decides **strip** GPS. Confirm no "declare instead" pivot.
5. **HEIC vs JPEG on re-encode.** Recommendation: transcode to JPEG ~0.8 for broadest compat + smaller payload (web viewer parity), unless Simon wants HEIC retained.

### The flow refactor — introduce a CaptureDraft so the write stops moving each story

The write has moved fine-tune→date (2.4)→photos (2.5), and will move again to the save moment (2.6). Stop the churn: introduce a **`CaptureDraft`** value (placement + date + note + staged photos) that accumulates across steps, and a single **write+upload coordinator** invoked at the current terminal step. 2.5 makes the photo step terminal; 2.6 moves the coordinator call into the save moment with zero model churn. The date step becomes a pure collector (carries the date into the draft, no write).

### Photos need the visit id → create-then-upload ordering

A photo row requires `pin_id` (+ `visit_id`). So the coordinator MUST create the visit first, read back the id, then upload+insert photos. This is NOT the banned "client-side multi-write for primary-visit promotion" (that's the delete RPC) — it's a create followed by child inserts, each RLS-checked. Partial failure: the visit exists; failed photo uploads are retryable. Guard against a double visit-create on retry (only re-run the photo phase if the visit already succeeded — track the created id in the VM).

### Types

`Photo.taken_at` is a `timestamptz` → a `Date` (ISO8601), NOT a `CalendarDate` (that's for date-only `visit_date`/`memory_date`). `PhotoInsert` omits `id`/`created_at`/`exif_taken_at` (trigger-owned). `storage_path` is `{userId}/{pinId}/{photoId}` where `photoId` is generated client-side and reused as `photos.id` so the object path and row agree.

### Integration points

- `DateStepViewModel`/`DateStepScreen` (2.4): the primary stops writing → carries the date into the draft + advances. Move the write/`CaptureWriter` out into the coordinator.
- `CaptureWriter` / `CaptureWritePlanner` (2.3/2.4): reused to create the visit (now also with `note`); extend `plan(... note:)` or set note on the inserts.
- `MapScreen` `CaptureRoute`: add `.photoStep`.
- `MapsakeDataClient` (`.supabase.storage`): the Storage upload site (MapsakeData only).

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{Photo, PhotoStepViewModel, CaptureDraft, PhotoStorage(protocol)}.swift  (NEW)
├── Packages/MapsakeKit/Sources/MapsakeData/{PhotoRepository, LivePhotoStorage}.swift  (NEW)
├── Packages/MapsakeKit/Sources/MapsakeModels/CaptureWrite.swift  (UPDATE — note)
├── Packages/MapsakeKit/Sources/MapsakeModels/DateStepViewModel.swift  (UPDATE — collect, don't write)
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/{PhotoStepViewModelTests, ...}.swift  (NEW)
├── Mapsake/Features/Capture/Photos/{ImageProcessor, PhotoLibrary(live), PhotoStepScreen}.swift  (NEW)
├── Mapsake/Features/Capture/Date/DateStepScreen.swift  (UPDATE)
├── Mapsake/Features/Map/Views/MapScreen.swift  (UPDATE — .photoStep)
├── Mapsake/Info.plist  (UPDATE — NSPhotoLibraryUsageDescription)
└── Packages/MapsakeKit/Sources/MapsakeDesign/{L.swift, Localizable.xcstrings}  (UPDATE — candidates)
```

### References

- [Source: epics.md#Story 2.5 (377–392), #FR8/FR9]
- [Source: architecture.md#Group B (31), #photo pipeline (48, 162), #live-schema/exif (51, 123), #photo-date normalization + HEIC (63, OPEN), #privacy/App-Review (64), #Shape A (122), #boundary/red-flags (221, 229)]
- [Source: EXPERIENCE.md (photo step 69, saving/failure 90–91), voice-guide.md]
- [Source: photos schema `supabase/migrations/20260623120000_init_photos.sql`; `pin-photos` bucket path; mapsake-ios `MapsakeDataClient`, `CaptureWriter`, `DateStepViewModel`]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
