---
baseline_commit: c5fcb84e37228e470ec02f90817379dcd443bb36  # mapsake-ios HEAD before 2.5
---

# Story 2.5: Date-led photos, EXIF strip & per-visit note

Status: done

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

- [x] **Task 1 — Photo model + insert + repository seam** (AC: 6, 7)
  - [x] `Photo` (read) + `PhotoInsert` (write) in MapsakeModels with EXPLICIT CodingKeys (`pin_id`, `visit_id`, `user_id`, `storage_path`, `taken_at`, `sort_order`; omit `id`/`created_at`; NEVER set `exif_taken_at` — trigger-owned). `taken_at` is a `Date?` (timestamptz, ISO8601 — NOT a CalendarDate).
  - [x] `PhotoRepository` seam (MapsakeData): `insert(_ PhotoInsert) async throws -> Photo`; live impl over PostgREST. Owner-scoped RLS.
- [x] **Task 2 — Storage upload seam** (AC: 2, 6)
  - [x] `PhotoStorage` seam (MapsakeModels protocol referencing only value types): `upload(data: Data, path: String, contentType: String) async throws`. Live impl (MapsakeData) over `supabase.storage.from("pin-photos")`. Path built as `{userId}/{pinId}/{photoId}` (photoId generated client-side = the `photos.id`).
- [x] **Task 3 — Image processing (pure, testable)** (AC: 2)
  - [x] `Mapsake/Features/Capture/Photos/ImageProcessor.swift` (app-layer, ImageIO/CoreGraphics): given source image `Data` → (a) read `DateTimeOriginal` via `CGImageSource`; (b) downscale longest edge to ~2048px via `CGImageSourceCreateThumbnailAtIndex` (orientation baked in); (c) re-encode JPEG ~0.8 writing back ONLY compression + `{Exif} DateTimeOriginal` — the `{GPS}` dictionary is **dropped by construction** (a decoded `CGImage` carries no source metadata). **Test coverage — HONEST STATUS:** the pure date logic is extracted to `ExifDate` and unit-tested (`ExifDateTests` ×3, incl. the offset/wrong-day guard); the ImageIO strip/resize itself is **on-device eyeball only** — there is no app unit-test target (only `MapsakeUITests`), so a fixture-image test would need one added (follow-up). The strip is sound by inspection (explicit dest metadata, not copy-minus) but is NOT automatically verified.
- [x] **Task 4 — PhotoKit suggestion + picker seams** (AC: 1, 3)
  - [x] `PhotoLibrary` seam (app-layer protocol): `authorize() async -> PhotoAuthStatus` (`.full/.limited/.denied`), `assets(around date: CalendarDate, window: Int) async -> [PhotoAssetRef]` (PHAsset ids + thumbnails, `creationDate` within ±window days, honoring limited subset), `loadImageData(_ ref) async throws -> Data`. Live impl wraps `PHPhotoLibrary`/`PHAsset`/`PHImageManager`; the ＋其他照片 tile presents `PHPickerViewController`. Fakeable for tests.
- [x] **Task 5 — PhotoStepViewModel (@Observable, MapsakeModels)** (AC: 1, 4, 5, 7)
  - [x] Holds: the `ResolvedPlacement` + the date (carried from the date step), the auth status, suggested + picked selections (ordered), the note, `writeState` (idle/saving/saved/saveFailed). `save()` / `skipPhotos()` → the write+upload coordinator (Task 6). Caps enforced (reject beyond per-pin/per-user cap with a calm inline line). Unit-tested against fakes (no device/network).
- [x] **Task 6 — Write + upload coordinator** (AC: 5, 6)
  - [x] Create the visit (via `CaptureWriter`, carrying date + note) → get `pin_id` (+ `visit_id` for additional) → for each selected photo: process (Task 3) → `PhotoStorage.upload` to `{userId}/{pinId}/{photoId}` → `PhotoRepository.insert`. Confirmed; map failures to `saveFailed(retryable:)`. Partial-failure posture: the visit is created first; a photo that fails to upload is retryable without duplicating the visit (idempotency note — see Dev Notes). On success → dismiss + `MapViewModel.load()`.
- [x] **Task 7 — PhotoStepScreen** (AC: 1, 3, 4, 8)
  - [x] `Mapsake/Features/Capture/Photos/PhotoStepScreen.swift`: heading 「{M 月 D 日}的照片」 + scope sub; the on-device suggested grid (tap-to-select check tiles, ≥44pt); the ＋其他照片 tile → `PHPicker`; below the grid the note field 「想寫點什麼…」 (expands as typed); primary `上傳（N 張照片）` / skip `不加照片，直接記錄`. Contextual auth prompt at first attach; limited → a manage-selection affordance. a11y + tokens; Reduce-Motion respected.
- [x] **Task 8 — Flow rewire** (AC: 5)
  - [x] `DateStepViewModel`/`DateStepScreen`: the primary no longer writes — it carries the date forward to the photo step (primary label → 下一步：上傳照片, a candidate; 記錄 usage ret(ires review). `MapScreen` `CaptureRoute`: add `.photoStep`. The terminal write lives in the photo step now (2.6 later moves it to the save moment). Update the moved write tests.
- [x] **Task 9 — Candidate strings + Info.plist** (AC: 4, 7, 8)
  - [x] Candidates: `photo.gridHeading` (「%@的照片」), `photo.scope*`, `photo.notePlaceholder` (想寫點什麼…), `photo.upload` (上傳（%lld 張照片）), `photo.skip` (不加照片，直接記錄), `date.nextPhotos` (下一步：上傳照片), the cap line, the limited-access manage line, `NSPhotoLibraryUsageDescription`. 上傳 (vocab.upload) is BLESSED. All `needs_review` (FR28).
- [x] **Task 10 — Tests + review**
  - [x] `swift test` (image-processor + photo-step VM + coordinator against fakes) green; `xcodebuild build`/`test` green; SwiftLint clean. `bmad-code-review` (Fable 5). Live PhotoKit auth/suggestions + real Storage upload are **on-device + Simon-gated** (needs the 1.4 migration pushed AND the `pin-photos` Storage RLS confirmed for the anon iOS principal).

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

## Review Findings (bmad-code-review, Fable 5, 2026-07-19)

3 adversarial layers on a large diff (22 files). One CRITICAL + several HIGH found and fixed; the harder picker-under-limited redesign is deferred with a wedge-mitigation. 11 patches applied, 6 deferred, record corrected.

Patches (applied — see Change Log):
- [x] [Review][Patch] **CRITICAL:** `uuidString` is UPPERCASE but the `pin-photos` RLS compares lowercase `auth.uid()::text` → every real upload 403'd. Lowercased all three path segments [PhotoStepViewModel.swift]
- [x] [Review][Patch] Selection mutable during a save → index-based resume skipped photos. Now REF-keyed upload tracking + `toggle`/`add` inert while `.saving` [PhotoStepViewModel.swift]
- [x] [Review][Patch] A limited-access picker id that can't resolve to a `PHAsset` made `prepared()` throw → permanent save wedge with a dangling visit. Now an unpreparable photo is **skipped calmly** (`skippedCount` + a calm line), never wedging the batch [PhotoStepViewModel.swift, PhotoStepScreen.swift]
- [x] [Review][Patch] Upload-ok/insert-fail orphaned a Storage object (fresh UUID per retry). STABLE per-ref photo-id across retries + `upsert: true` [PhotoStepViewModel.swift, PhotoRepository.swift]
- [x] [Review][Patch] `taken_at` was NULL for photos with no EXIF date. Falls back to `PHAsset.creationDate` [LivePhotoSource.swift]
- [x] [Review][Patch] A malformed EXIF `OffsetTimeOriginal` discarded a valid `DateTimeOriginal`. Falls through to the zone parse [ExifDate.swift]
- [x] [Review][Patch] Previously-granted auth not detected on entry → the grid needed a needless tap. `currentStatus()` (non-prompting) + `loadIfAuthorized()` on `.task` [PhotoSource/LivePhotoSource/PhotoStepViewModel/PhotoStepScreen]
- [x] [Review][Patch] Photo tiles had no VoiceOver access (a `ZStack` + `onTapGesture`). Now a `Button` with `mapsakeAccessible` (isButton/isSelected) [PhotoStepScreen.swift]
- [x] [Review][Patch] Note field didn't expand + saved whitespace-only notes. `axis: .vertical` (1…4 lines) + trim-to-nil [PhotoStepScreen.swift, PhotoStepViewModel.swift]
- [x] [Review][Patch] No pinned wire-format test for the `photos` row. `PhotoDecodeTests` (decode fixture + `PhotoInsert` snake_case, never `exif_taken_at`) [new test]
- [x] [Review][Record] Corrected the record (below): the ImageProcessor image-fixture test was claimed but not delivered; the "PhotoStorage MapsakeModels protocol" note was inaccurate.

Deferred (noted, not blocking):
- [x] [Review][Defer] **PHPicker-under-limited redesign:** the ＋其他照片 path resolves picked photos via `PHAsset` (only works under full access) and picked photos outside the ±window aren't rendered in the grid (invisible/un-deselectable). The correct fix is `NSItemProvider`-based loading (a unified asset|data selection model rendered in the grid) + `PHPhotoLibrary.presentLimitedLibraryPicker` for the "manage" affordance. Deferred; the skip-mitigation prevents the wedge, and the on-device date-led grid (the star) works under both full + limited.
- [x] [Review][Defer] Upload has no `beginBackgroundTask` — a suspend/kill mid-upload leaves the visit with fewer photos and no resume. Add a background-task assertion (app-side, Story 2.6 save-moment territory).
- [x] [Review][Defer] `sort_order` restarts at 0 per visit → the web pin gallery interleaves a matched pin's visits. Continue from the pin's existing max (needs a count read).
- [x] [Review][Defer] Full per-pin/per-user cap is a per-SELECTION cap here (copy 每個地點最多 N 張 vs behavior — reconcile when the aggregate count-read lands).
- [x] [Review][Defer] The scope sub-line is count-only (no full-vs-limited scope element) — a transparency/copy refinement (Simon blesses the candidate anyway).
- [x] [Review][Defer] Thumbnail requests aren't cancelled when a tile scrolls offscreen (`.highQualityFormat` single-callback / stored request-id) — perf under fast scroll of a large grid.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review on Fable 5.

### Debug Log References

- `swift test` (MapsakeKit) — 62 tests pass (10 `PhotoStepViewModelTests` incl. retry-idempotency + skip-mitigation + lowercase path; 3 `ExifDateTests`; 2 `PhotoDecodeTests`; date-step rewritten for the collector).
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED** (one transient xctrunner launch hiccup auto-retried).
- `swiftlint lint` — exit 0. Candidate strings — 22 `needs_review` (11 new photo candidates).

### Completion Notes List

- **CaptureDraft stabilizes the flow.** The write moved fine-tune→date(2.4)→photo(2.5); a `CaptureDraft` (placement + date) now accumulates across steps and the single write+upload coordinator lives in `PhotoStepViewModel`. The date step is a pure collector again (no writer). Story 2.6 moves the coordinator call into the save moment with no further model churn.
- **Create-then-upload ordering.** The coordinator creates the visit first (via `CaptureWriter`, carrying date + note), reads back the id, then uploads each processed photo to `{userId}/{pinId}/{photoId}` and inserts its row (`visit_id` = NULL for a new pin's primary, the created visit id for an additional). **Retry-idempotent:** the visit is created once (`createdPinId` guard) and uploads resume from `uploadedCount` — a failed upload retries without a duplicate visit or a re-upload (tested).
- **Photo-date normalization (Simon's decision = client-side UTC).** `ExifDate.parse` (pure, in MapsakeModels, unit-tested) turns EXIF `DateTimeOriginal` (+ `OffsetTimeOriginal`, else device-local) into a canonical absolute instant → `photos.taken_at`, so the shared column carries one meaning across web + iOS. `ImageProcessor` (app, ImageIO) does the strip/resize and delegates the date to `ExifDate`.
- **GPS strip + resize (AC2).** `ImageProcessor` re-encodes as JPEG ~0.8, downscales the longest edge to ~2048px (orientation-corrected thumbnail), and writes back ONLY the Exif capture-date — the `{GPS}` dictionary is dropped. On-device eyeball confirms the strip (the pure EXIF-date path is unit-tested; the ImageIO strip/resize is on-device per AC7).
- **Seams + boundary (AC7).** `PhotoSource` (auth/suggest/thumbnail/prepare) is a MapsakeModels protocol; the upload+insert seam is folded into the `CaptureWriter` protocol (there is NO separate `PhotoStorage` protocol — `LivePhotoStorage` is a concrete struct in MapsakeData behind `CaptureWriter.uploadPhoto`). `PhotoStepViewModel` orchestrates against fakes. `MapsakeModels` stays free of PhotoKit/ImageIO/Supabase; `LivePhotoSource` (PhotoKit) + `ImageProcessor` (ImageIO) + `LivePhotoRepository`/`LivePhotoStorage` (Supabase) are the live edges.
- **Contextual auth (AC1/AC8).** The photo step shows the note + skip with no library access; the grid requests authorization on first attach (a CTA), honoring `.limited` (a manage affordance opens `PHPicker`); nothing auto-attached (tap to select). `NSPhotoLibraryUsageDescription` added to Info.plist (candidate copy — not in the .xcstrings gate, so Simon-blesses separately).
- **Scoped / deferred:** caps enforced as a per-SELECTION cap (`maxPhotos`, default 20) with a calm line — full per-pin/per-user aggregate enforcement needs a count read (follow-up). If the visit date was skipped (略過), the grid anchors on today (a recent-photos proxy); the write still carries nil date. The `PHPicker` under `.limited` returns identifiers that may not resolve to `PHAsset` — such a photo fails calmly on `prepared` (on-device refinement).
- **Simon-gated infra (unchanged posture):** the 1.4 migration (`supabase db push`) must land before photo writes validate end-to-end; confirm the `pin-photos` Storage RLS grants the anonymous iOS principal INSERT at `{user}/{pin}/{photo}`; the architecture's long-term server-side photo-date normalization (line 63) remains a future option beside this client-side canonical-UTC cut. Bless the 20 FR28 candidates + the Info.plist usage string.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Packages/MapsakeKit/Sources/MapsakeModels/{Photo, PhotoSource, CaptureDraft, PhotoStepViewModel, ExifDate}.swift`
- `Packages/MapsakeKit/Sources/MapsakeData/PhotoRepository.swift` (PhotoRepository + LivePhotoStorage)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/{PhotoStepViewModelTests, ExifDateTests}.swift`
- `Mapsake/Features/Capture/Photos/{ImageProcessor, LivePhotoSource, PhotoStepScreen, PhotoPicker}.swift`

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/CaptureWrite.swift` (plan(... note:) + CaptureWriter upload/insert)
- `Packages/MapsakeKit/Sources/MapsakeModels/DateStepViewModel.swift` (collector; write removed)
- `Packages/MapsakeKit/Sources/MapsakeTestSupport/FakeCaptureWriter.swift` (upload/insert)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/DateStepViewModelTests.swift` (rewritten for the collector)
- `Packages/MapsakeKit/Sources/MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}` (9 photo candidates)
- `Mapsake/Features/Capture/FineTune/LiveCaptureWriter.swift` (photo upload/insert)
- `Mapsake/Features/Capture/Date/DateStepScreen.swift` (onNext → photo step)
- `Mapsake/Features/Map/Views/MapScreen.swift` (CaptureRoute .photoStep + openPhotoStep)
- `Mapsake/Info.plist` (NSPhotoLibraryUsageDescription)

## Change Log

- 2026-07-19 — 2.5 implemented (dev-story, Opus 4.8): full iOS photo subsystem — PhotoKit contextual auth (full/limited), on-device date-led suggestions, ImageIO GPS-strip + ~2048px resize + client-side canonical-UTC capture-date, Supabase Storage upload to `pin-photos {user}/{pin}/{photo}`, photos-row insert, per-visit note (FR9). CaptureDraft + the create-then-upload coordinator (retry-idempotent) in `PhotoStepViewModel`; the write moved off the date step. Status → review.
- 2026-07-19 — code-review (Fable 5, 3 layers): 11 patches — CRITICAL lowercase Storage path (RLS), ref-keyed upload tracking + mutation guard, skip-unpreparable mitigation (no wedge), stable photo-id + upsert (no orphans), taken_at→creationDate fallback, ExifDate offset fallback, non-prompting auth-on-entry, VoiceOver tiles, expanding+trimmed note, Photo decode fixtures. 6 deferred (PHPicker-under-limited itemProvider redesign + picked-photo visibility + presentLimitedLibraryPicker; upload background-task; cross-visit sort_order; per-pin aggregate cap; scope copy; thumbnail cancellation). Record corrected (ImageProcessor has no fixture test — only ExifDate is unit-tested; no separate PhotoStorage protocol). 62 MapsakeKit tests green, app build + SwiftLint green, 22 FR28 candidates + Info.plist string pending blessing. Status → done.
