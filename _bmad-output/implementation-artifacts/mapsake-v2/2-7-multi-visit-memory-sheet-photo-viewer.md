---
baseline_commit: 3db2a76f8069f983b036eb6193a401ee8c2e2b78  # mapsake-ios HEAD before 2.7
---

# Story 2.7: Multi-visit memory sheet & photo viewer

Status: done

## Story

As a traveler,
I want to open a pin and see its memory, with older visits below,
so that a revisited place shows its history.

## Acceptance Criteria

**AC1 — The pin sheet (epics.md#Story 2.7, verbatim)**
Given a pin, When I tap it, Then a bottom sheet opens on the **most-recent visit** (date line, photos, note) over the still-visible map, And additional visits render as **compact history rows** (tap to swap); single-visit pins show no history block.

**AC2 — The photo viewer (epics.md#Story 2.7, verbatim; FR22)**
Given a photo in the sheet, When I tap it, Then a full-screen viewer opens owning **swipe + pinch-to-zoom** (FR22), gestures not colliding with sheet-drag or map-pan.

### Additional acceptance criteria (from UX + architecture)

**AC3 — Multi-visit anatomy**
Given a multi-visit pin, Then the sheet opens on the most-recent timeline entry; other visits are one row each 「{YYYY 年 M 月} · 第 N 次 · N 張照片」, tap to swap the sheet's content to that visit; the ordinal 第 N 次 is chronological (oldest = 第 1 次). A single-visit pin shows NO history block (absence is normal). The map stays visible under the sheet — never a takeover. [EXPERIENCE.md line 75]

**AC4 — Shape-A read = one merge, one type**
Given the read, Then the sheet renders from `timeline(pin:visits:)` (the Story 2.1 merge — UNION of pin-as-primary + additional visits, deterministic sort); no screen sees `pins` vs `visits`. Photos are read per timeline entry (the primary's = `photos WHERE visit_id IS NULL`; an additional visit's = `photos WHERE visit_id = v.id`). [architecture 209, 122]

**AC5 — Photo read via signed URLs**
Given the private `pin-photos` bucket (owner-scoped RLS), Then photos load via **signed URLs** (`storage.createSignedURL`), fetched on-demand + cached in-session; a photo that fails to load degrades calmly (a placeholder, never an error). [architecture 51, 139]

**AC6 — Gesture isolation (FR22)**
Given the viewer, Then pinch-to-zoom + pan-when-zoomed + swipe-between-photos live in the FULL-SCREEN viewer (its own cover), so they never collide with the sheet's drag-to-dismiss or the map's pan. The sheet's photo strip is a horizontal scroller; tapping a tile opens the viewer at that index. [EXPERIENCE.md line 76 photo-strip]

**AC7 — Map pin-tap opens the sheet**
Given the map at pin zoom, When I tap an individual pin (the `pins-marker` layer), Then its sheet opens; the existing cluster tap-dive (low zoom) + long-press capture + read-only pan/zoom are preserved (a tap resolves to at most one of: pin-sheet, cluster-dive). [Story 1.6 map, 2.3 long-press]

**AC8 — Types + boundary + a11y**
Given the implementation, Then `PinSheetViewModel` (@Observable, MapsakeModels) loads timeline + photos + selection against fakeable read seams (unit-tested: selection defaults to most-recent, swap, single-visit → no history, photo grouping by visit); the photo read + signed-URL + image loading are app/MapsakeData seams; `MapsakeModels` stays UI-free; every user-facing string is a typed `L` key; the sheet + rows + viewer are VoiceOver-labeled (pin announces place + visit count). [architecture 221, 223; EXPERIENCE 122]

## Tasks / Subtasks

- [x] **Task 1 — Timeline carries the visit id + ordinal** (AC: 3, 4)
  - [x] Add `visitId: UUID?` to `TimelineEntry` (nil for the primary) so photos group to the right entry; update `timeline(pin:visits:)` + the 2.1 `TimelineMergeTests`. A pure `visitOrdinals(_ entries:)` helper maps each entry to its chronological 第 N 次 (oldest = 1).
- [x] **Task 2 — Photo read + signed-URL seams** (AC: 5, 8)
  - [x] `PhotoRepository.photos(forPin: UUID) async throws -> [Photo]` (ordered by sort_order); live over PostgREST. `PhotoStorage`/read seam: `signedURL(path: String) async throws -> URL` over `storage.createSignedURL(path:, expiresIn:)`. Both fakeable.
- [x] **Task 3 — PinSheetViewModel (@Observable, MapsakeModels)** (AC: 1, 3, 4, 8)
  - [x] Inputs = the tapped `Pin` + read seams (a `PinReader`: visits(forPin), photos(forPin)). Loads `entries = timeline(pin, visits)`, groups `photosByEntry` (keyed by `visitId`), computes ordinals; `selectedId` defaults to the most-recent entry; `select(_ id)`; `hasHistory` (>1 entry). Derived per selection: date, note, photos. Unit-tested against fakes (no network).
- [x] **Task 4 — PinSheetScreen (bottom sheet over the map)** (AC: 1, 3, 6)
  - [x] `Mapsake/Features/Memory/PinSheetScreen.swift`: presented via `.sheet` with `.presentationDetents([.medium, .large])` + `.presentationBackgroundInteraction(.enabled)` so the map stays live under it. Selected entry: serif place name + date line + a horizontal photo strip (`SignedAsyncImage` tiles) + note. Below (only when `hasHistory`): compact history rows 「{年月} · 第 N 次 · N 張照片」 → `select`. Tapping a strip tile opens the viewer.
- [x] **Task 5 — PhotoViewerScreen (full-screen, pinch-zoom)** (AC: 2, 6)
  - [x] `Mapsake/Features/Memory/PhotoViewerScreen.swift`: a full-screen cover; a `TabView(.page)` (swipe between the visit's photos) where each page is a pinch-to-zoom + pan-when-zoomed image (MagnificationGesture + DragGesture, clamped, double-tap to reset); a quiet close. Gestures owned by the viewer (its own cover) so they never fight the sheet/map.
- [x] **Task 6 — Signed image loading** (AC: 5)
  - [x] `SignedAsyncImage` (app): given a `storage_path`, resolve a signed URL (via the seam) + load the image, in-session cached; a failed load shows a calm placeholder tile (never an error).
- [x] **Task 7 — Map pin-tap → sheet** (AC: 7)
  - [x] `MapLibreMapView`: in `handleTap`, when `zoom >= pinTakeoverZoom`, query `visibleFeatures(at:styleLayerIdentifiers:["pins-marker"])` → resolve to the tapped `Pin` (by coordinate/id) → surface via an `onPinTap(Pin)` callback → `MapScreen` opens the sheet. Preserve the cluster tap-dive (low zoom), long-press, and read-only pan/zoom; a tap does at most one thing. (Pins need an identifying attribute on the feature — add `id` to the pin `MLNPointFeature` attributes.)
- [x] **Task 8 — Candidate strings + a11y** (AC: 8)
  - [x] No NEW candidate strings — the history row composes blessed `L.visitOrdinal` + existing `L.recapPhotoCount` + a data date label; the viewer close reuses blessed `L.cancel`; the strip tile uses blessed `L.memory`. History rows carry a data label (Button trait). **Deferred (record correction, per review):** the pin's own 「place + 你去過 N 次」 VoiceOver announcement — MapLibre GL markers are NOT UIKit accessibility elements, and the architecture designates 去過的地點 (the browse list, Epic 4) as the canonical screen-reader path for the map's content (EXPERIENCE line 122). Per-pin VO on the GL map is out of scope here.
- [x] **Task 9 — Tests + review**
  - [x] `swift test` (TimelineEntry visitId/ordinals; `PinSheetViewModel` selection/swap/grouping/single-visit) green; `xcodebuild build`/`test` green; SwiftLint clean. `bmad-code-review` (Fable 5). Live signed-URL image loading + the viewer gestures are on-device eyeball.

## Dev Notes

### Reuse the Shape-A merge; add only the visit id + photo grouping

`timeline(pin:visits:)` (Story 2.1) already merges + sorts (newest first, deterministic). 2.7 needs each entry's `visitId` to attach photos (primary → `visit_id IS NULL`; additional → the visit's id) and the chronological 第 N 次. Add `visitId: UUID?` to `TimelineEntry` and a pure ordinal helper — both unit-tested. The sheet opens on `entries.first` (most recent). Single-visit = one entry = no history block.

### The map stays visible — a real bottom sheet, not a cover

Use SwiftUI `.sheet` with `.presentationDetents` + `.presentationBackgroundInteraction(.enabled)` (iOS 16.4+) so the parchment map + pins stay interactive/visible under the sheet (EXPERIENCE: "never a takeover"). The photo VIEWER, by contrast, IS a full-screen cover (it owns pinch/swipe) — the two-layer split is what keeps gestures from colliding (AC6).

### Photo read + signed URLs

The `pin-photos` bucket is private (owner RLS). Read images via `storage.createSignedURL(path:, expiresIn:)` (short TTL), fetched on demand and cached for the session. A signed-URL or image-load failure shows a calm placeholder tile (never 錯誤/失敗). `PhotoRepository.photos(forPin:)` returns the pin's rows (sort_order); group by `visit_id` (nil = primary) to attach to timeline entries.

### Pin-tap disambiguation on the map

`MapLibreMapView.handleTap` currently dives clusters only when `zoom < pinTakeoverZoom`. Add: when `zoom >= pinTakeoverZoom`, hit-test `pins-marker` and open the tapped pin's sheet. The pin feature needs an identifier (add the pin `id` to its `MLNPointFeature.attributes` so the tap resolves to a `Pin`). A single tap must resolve to at most one action.

### Integration points

- `TimelineEntry` / `timeline()` (2.1): + `visitId`, ordinals.
- `VisitRepository.visits(forPin:)` (2.1) + `PhotoRepository` (2.5, + `photos(forPin:)`) + Storage (2.5, + `signedURL`).
- `MapLibreMapView` (1.5/1.6/2.3): pin-tap + the pin-feature id.
- `MapScreen`: present the sheet on `onPinTap`.
- `Photo` / `Pin` / `Visit` (models), `MapsakeChip`/type tokens, `L.visitedCount` (blessed).

### Project Structure Notes

```
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{TimelineEntry(update), PinSheetViewModel}.swift
├── Packages/MapsakeKit/Sources/MapsakeData/{PhotoRepository(+photos(forPin)/signedURL)}.swift
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/{TimelineMergeTests(update), PinSheetViewModelTests}.swift
├── Mapsake/Features/Memory/{PinSheetScreen, PhotoViewerScreen, SignedAsyncImage}.swift
├── Mapsake/Features/Map/Views/{MapLibreMapView(pin-tap), MapScreen(sheet)}.swift
└── Packages/MapsakeKit/Sources/MapsakeDesign/{L.swift, Localizable.xcstrings}
```

### References

- [Source: epics.md#Story 2.7 (411–423), #FR22]
- [Source: architecture.md#Shape-A read (209), #Shape A (122), #Storage/signed (51, 139), #boundary (221)]
- [Source: EXPERIENCE.md (pin sheet 75, re-live/photo-strip 76, VO 122), DESIGN.md (photo-strip-tile), TimelineEntry.swift + timeline() (2.1)]
- [Source: mapsake-ios — TimelineEntry/timeline, VisitRepository, PhotoRepository (2.5), MapLibreMapView, MapScreen, Photo/Pin/Visit]

## Review Findings (bmad-code-review, Fable 5, 2026-07-19)

3 adversarial layers on the read side. AC1/AC3/AC4/AC7 SATISFIED; AC2/AC5/AC6/AC8 had real gaps, now patched (except the deferred pin-VO). 8 patches applied, 5 deferred, record corrected.

Patches (applied — see Change Log):
- [x] [Review][Patch] **CRITICAL for AC2:** the photo viewer's `.fullScreenCover` was on the same view presenting the `.sheet` → it can't stack over a sheet, so tapping a photo likely opened nothing. Moved the viewer cover INTO `PinSheetScreen` (presented from the sheet's own view) [PinSheetScreen/MapScreen]
- [x] [Review][Patch] The viewer's `DragGesture` collided with `TabView(.page)` paging (the guard only skipped state, not recognition). The pan gesture now only EXISTS when zoomed (`scale > 1 ? pan : nil`) so 1× paging is free [PhotoViewerScreen.swift]
- [x] [Review][Patch] No in-session cache → every render re-signed + re-downloaded full-res (unbounded memory, jetsam risk). Added an `NSCache`-backed `ImageCache` (shared by strip + viewer) + `LazyHStack` for the strip [SignedAsyncImage/PinSheetScreen]
- [x] [Review][Patch] Zoomed pan was unclamped (image draggable off-screen; stale offset when scale shrank). Clamp offset to the visible overflow + reset when scale ≤ 1 [PhotoViewerScreen.swift]
- [x] [Review][Patch] Strip `.fill` tiles overflowed 120×120 with hit-area over neighbors → wrong photo opened. `.clipped()` + bounded `.contentShape` [PinSheetScreen.swift]
- [x] [Review][Patch] Visible pins in the 6.5–7 zoom band were untappable (tap gate was ≥7). Hit-test pins first from `pinTakeoverZoom − 0.5`, with a 44pt tap-slop rect; cluster-dive only below takeover if no pin hit [MapLibreMapView.swift]
- [x] [Review][Patch] The sheet was blank until BOTH network reads finished. Seed the primary (date/note) from the in-memory `Pin` in `init` — instant [PinSheetViewModel.swift]
- [x] [Review][Patch] The selected-visit date line dropped the day (used year-month for both). Full date on the selected line (`yMMMd`), year-month on history rows [PinSheetScreen.swift]

Deferred (noted, not blocking):
- [x] [Review][Defer] Per-pin VoiceOver on the GL map — the SR path for map content is the 去過的地點 browse list (Epic 4, EXPERIENCE 122); MapLibre markers aren't UIKit a11y elements. Record corrected (Task 8).
- [x] [Review][Defer] Orphaned-`visit_id` photos / wrong ordinal on a PARTIAL read failure (visits fails, photos succeeds) — both reads hit the same PostgREST backend (joint failure is typical, and renders the primary correctly); a partial-failure error surface + orphan handling is a follow-up.
- [x] [Review][Defer] Zoom/offset state persists per page across swipes (reset-on-page-leave); a failed tile has no retry (dismiss + reopen); re-tapping the SAME open pin re-presents (key by pin.id) — polish follow-ups.

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review on Fable 5.

### Debug Log References

- `swift test` (MapsakeKit) — 69 tests pass (3 `PinSheetViewModelTests` + the `TimelineEntry` visitId/ordinals via the merge).
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED**.
- `swiftlint lint` — exit 0. Candidate strings — 30 (NO new candidates: reuses blessed `L.visitOrdinal`/`L.visitedCount`/`L.memory` + existing `L.recapPhotoCount`).

### Completion Notes List

- **Reused the Shape-A merge.** `TimelineEntry` gained `visitId: UUID?` (nil for the primary; a defaulted init keeps the 2.1 tests compiling) + a pure `visitOrdinals` helper (oldest = 第 1 次). `PinSheetViewModel` (MapsakeModels, @Observable) loads `timeline(pin,visits)`, groups photos by `visit_id`, opens on the most-recent entry, and swaps on `select`. Single-visit → one entry → no history. Unit-tested against a `PinReader` fake.
- **Two-layer gesture split (AC6).** The pin sheet is a real `.sheet` (`.presentationDetents([.medium,.large])` + `.presentationBackgroundInteraction(.enabled(upThrough:.medium))`) so the map stays live under it; the photo viewer is a separate `.fullScreenCover` that OWNS pinch-zoom / pan-when-zoomed / page-swipe (`TabView(.page)` + `MagnificationGesture`/`DragGesture`, clamped 1–4×, double-tap reset) — so viewer gestures never fight the sheet-drag or map-pan.
- **Private-photo read.** `PhotoRepository.photos(forPin:)` + `LivePhotoStorage.signedURL` (`createSignedURL`); `SignedAsyncImage` resolves a short-lived signed URL, loads via `URLSession`, and degrades to a calm placeholder tile on failure (never an error). `PinReader`/signed-URL are seams; `MapsakeModels` stays UI-free.
- **Pin-tap.** `MapLibreMapView.handleTap` now: at `zoom ≥ pinTakeoverZoom` hit-tests `pins-marker` (the pin feature carries its `id`) → `onPinTap(UUID)` → `MapScreen` opens the sheet; below that the clusters still own the tap-dive. Long-press + read-only pan/zoom preserved; a tap does at most one thing.
- **On-device eyeball:** the live signed-URL image loading, the viewer pinch/pan/swipe feel, and the sheet-over-live-map interaction.
- **Simon-gated (unchanged):** the 1.4 migration + Storage RLS from 2.5 gate real reads/writes; the `pin-photos` bucket must allow the anon iOS principal to `createSignedURL` (read) at its own paths.

### File List

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

New:
- `Packages/MapsakeKit/Sources/MapsakeModels/PinSheetViewModel.swift` (PinReader + PinSheetViewModel)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/PinSheetViewModelTests.swift`
- `Mapsake/Features/Memory/{LivePinReader, SignedAsyncImage, PinSheetScreen, PhotoViewerScreen}.swift`

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/TimelineEntry.swift` (visitId + visitOrdinals)
- `Packages/MapsakeKit/Sources/MapsakeData/PhotoRepository.swift` (photos(forPin) + signedURL)
- `Mapsake/Features/Map/Views/MapLibreMapView.swift` (pin-tap + pin-feature id)
- `Mapsake/Features/Map/Views/MapScreen.swift` (pin sheet + photo viewer presentations)

## Change Log

- 2026-07-19 — 2.7 implemented (dev-story, Opus 4.8): the multi-visit pin memory sheet (opens on the most-recent visit, date/photos/note; additional visits as tap-to-swap history rows 「年月 · 第 N 次 · N 張照片」; single-visit → no history) over a still-live map, and a full-screen photo viewer (swipe + pinch-to-zoom, gestures isolated in their own cover). `TimelineEntry.visitId` + `PinSheetViewModel` (reuses the 2.1 merge); private-photo read via signed URLs; map pin-tap. 69 MapsakeKit tests green, app build + SwiftLint green, no new candidates. Status → review.
- 2026-07-19 — code-review (Fable 5, 3 layers): 8 patches — moved the photo-viewer cover into the sheet (it couldn't stack over the sheet from the map view), conditional pan gesture (TabView paging), in-session NSCache + LazyHStack (no re-download/jetsam), clamped zoom pan, bounded strip tile hit-area, pins tappable in the 6.5–7 band w/ 44pt slop, seed the primary so the sheet isn't blank while loading, full date on the selected line. 5 deferred (per-pin GL VoiceOver → browse list Epic 4; partial-read orphan/ordinal; zoom-persist/retry/re-tap polish). Record corrected (Task 8 pin-VO). 69 MapsakeKit tests green, app build + SwiftLint green. Status → done.
