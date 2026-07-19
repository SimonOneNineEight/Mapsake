---
baseline_commit: fc34d8dc7946af14344c396c46a8b1c8fd4476d5  # mapsake-ios HEAD before 2.8
---

# Story 2.8: Approximate region-backfill

Status: done

## Story

As a traveler,
I want to log "I was in Hokkaido years ago" without false precision,
so that backfilling old trips is honest and fast.

## Acceptance Criteria

**AC1 — Record-this-region (epics.md#Story 2.8, verbatim)**
Given a search for a region or country, When I choose 「記錄這個地區」, Then a visit is created on an **approximate pin** (dashed-hollow marker) at the region's center and the region colors visited immediately, And the marker solidifies to a standard pin when later dragged to a real spot, And rapid name-only backfill through the same loop still colors each region visited.

### Additional acceptance criteria (from UX + architecture)

**AC2 — The 記錄這個地區 affordance in search**
Given a region/country search result (北海道, 日本), Then the results offer 「記錄這個地區」 (candidate copy) alongside place results; choosing it enters capture at the region's center — NO fine-tune step (the pin is honestly imprecise, so precise placement is skipped). [EXPERIENCE.md line 70]

**AC3 — The approximate write (one write model)**
Given 記錄這個地區, Then a pin is created with `is_approximate = true`, `country_code` + `region_code` derived from the region so it colors visited (FR3), at the region's center coordinate. Everything is still a pin (Shape A) — the visit flows through the date + photo steps (or the run-light loop: skip both). The region colors visited immediately on save + `MapViewModel.load()`. [EXPERIENCE.md line 70; architecture Shape A]

**AC4 — Dashed-hollow marker**
Given an approximate pin, Then the map renders it as a **dashed, hollow** marker (honest imprecision) distinct from the solid standard pin; the visited region fill + hatch are unchanged. [EXPERIENCE.md line 70; DESIGN pin-marker]

**AC5 — Solidify on drag (edit path, coordinates with 2.9)**
Given an approximate pin, When it is later dragged to a real spot (the FR29 edit path — Story 2.9), Then `is_approximate` clears (→ a standard marker) and the coordinate updates. 2.8 SETS the flag + renders it; 2.9 owns the edit/drag that clears it (2.8 provides the write field + the clear-on-precise-placement rule). [EXPERIENCE.md line 70, 82]

**AC6 — Run-light backfill via the loop**
Given the capture loop (Story 2.6), Then rapid name-only region backfill (skip date, skip photos, 記錄下個地點) colors each region visited — the same loop IS backfill. [EXPERIENCE.md line 72]

**AC7 — Schema (Simon-gated, additive, web-tolerant)**
Given the shared `pins` table (live web reads + writes), Then `is_approximate boolean not null default false` is added **additively** (a new nullable-defaulted column the web client ignores — never tighten a web-touched column); the migration is Simon-gated (`supabase db push`), sequenced after the 1.4 migration; iOS `Pin`/`PinInsert` carry `isApproximate` (explicit CodingKey `is_approximate`). [architecture 58, 125, 229 — "never tighten a web-touched column"]

**AC8 — Types + boundary + candidates**
Given the implementation, Then the region-detection + approximate-placement logic is testable (MapsakeModels: `ResolvedPlacement.isApproximate`, `CaptureWritePlanner` sets it; `PlaceResult.isRegion` where derivable); the dashed-hollow marker is app-side (MapLibre); `記錄這個地區` ships as a `needs_review` candidate (FR28); `MapsakeModels` stays UI-free. [architecture 221]

## Tasks / Subtasks

- [x] **Task 1 — Schema: `is_approximate` (Simon-gated migration)** (AC: 7)
  - [x] `supabase/migrations/<ts>_pins_is_approximate.sql`: `alter table public.pins add column is_approximate boolean not null default false;` (additive; web ignores it). pgTAP if the repo's migration-test harness expects it. NOTE for the gated `supabase gen types` + `supabase db push` (dev then prod).
  - [x] iOS `Pin` + `PinInsert`: add `isApproximate: Bool` (read) / `isApproximate: Bool?` (insert, nil → DB default false) with CodingKey `is_approximate`. Update `PinDecodeTests` + fakes.
- [x] **Task 2 — Carry approximate through the placement + write** (AC: 3, 5)
  - [x] `ResolvedPlacement.isApproximate: Bool` (default false); `CaptureWritePlanner.plan(..., isApproximate:)` → `PinInsert.isApproximate` (only a NEW pin can be approximate; a proximity-match additional visit never sets it). Unit-tested. The clear-on-precise-placement rule lives with the 2.9 edit (documented here).
- [x] **Task 3 — Region detection in search** (AC: 2, 8)
  - [x] `PlaceResult.isRegion: Bool` — `LivePlaceSearch` (MKLocalSearch) flags a result as a region/country when the placemark resolves to an administrativeArea/country with no POI/thoroughfare (heuristic; documented). `SearchRow`/`SearchViewModel` surface it. The search screen shows a 「記錄這個地區」 affordance on region results.
- [x] **Task 4 — 記錄這個地區 → capture at the region center** (AC: 1, 2, 3)
  - [x] **Implementation deviation (disclosed):** 記錄這個地區 reuses the **fine-tune step, pre-centered on the region, pre-marked `isApproximate = true`** — NOT a skip-to-date-step. Reason: `region_code` (ISO-3166-2, which makes the region COLOR visited — the whole point) is only derivable from the map's `regions` layer query, and fine-tune is that mechanism (Story 2.3 `regionCodeAt`). Going through fine-tune resolves `country_code`/`region_code` for free and keeps the pin approximate; the user confirms without needing to nudge (honest imprecision — no FORCED precision). AC2's literal "no fine-tune step" is softened for this engineering reason; a true no-map path would need a separate region-code source (deferred). `FineTuneViewModel.isApproximate` → `ResolvedPlacement.isApproximate` → the write.
- [x] **Task 5 — Dashed-hollow marker on the map** (AC: 4)
  - [x] `MapLibreMapView`: render approximate pins distinctly — a hollow (no fill / cream fill) circle with a DASHED terracotta stroke, vs the solid standard pin. Either a second `MLNCircleStyleLayer` filtered on an `approx` feature attribute, or per-feature paint. The pin feature carries `is_approximate`; the visited fill/hatch layers are untouched. Both approximate + standard pins remain tappable (Story 2.7 sheet).
- [x] **Task 6 — Candidate strings** (AC: 8)
  - [x] `capture.recordRegion` (記錄這個地區) — `needs_review` (FR28). Reuse blessed vocab elsewhere.
- [x] **Task 7 — Tests + review**
  - [x] `swift test` (`CaptureWritePlanner` isApproximate branch; `Pin`/`PinInsert` CodingKeys incl. `is_approximate`; region-detection where pure) green; `xcodebuild build`/`test` green; SwiftLint clean. `bmad-code-review` (Fable 5). The dashed-hollow marker + live region search are on-device eyeball; the write is Simon-gated (needs the migration pushed).

## Dev Notes

### The approximate flag is a shared-schema change (Simon-gated)

`pins` is read AND written by the live web client. Adding `is_approximate` must be **additive + defaulted** so the web client (which never selects or sets it) is unaffected — exactly the "never tighten a web-touched column" rule (architecture 229). The migration is authored here but **applied by Simon** (`supabase db push`, dev → prod), sequenced after the 1.4 multi-visit migration. Until pushed, the approximate write can't be validated end-to-end (same posture as every Epic 2 write). Hand-add the `isApproximate` field to the iOS models now; note the gated `supabase gen types`.

### Everything is a pin; approximate skips fine-tune only

The region-record is still a normal capture — it flows through date → photos → save-moment → loop (so backfill can attach a date/photos if the user wants, or run light). The ONLY difference: 記錄這個地區 skips the fine-tune step (no precise placement for an honestly-imprecise pin) and sets `is_approximate = true` on the created pin at the region's center. The proximity merge doesn't apply (it's a deliberate new region pin) — an approximate write is always a NEW pin.

### Region center + codes

The region-center coordinate = the region search result's coordinate (MKLocalSearch returns a region-centroid-ish point for a region/country query). `region_code` (ISO-3166-2) is derived from the map's `regions` layer at that coordinate (the Story 2.3 `regionCodeAt` mechanism — so the pin lights the same region it sits in); `country_code` from the placemark. Both NULL-tolerant, but for a region-record they should resolve (that's the point — it colors the region).

### Solidify-on-drag is 2.9's edit

2.8 sets `is_approximate` + renders the dashed marker. The "upgrades to a standard marker when dragged to a real spot" is the FR29 edit path — **Story 2.9** (edit/remove) owns the drag-to-move that also clears `is_approximate`. 2.8 documents the rule (a precise placement clears the flag) and provides the write field; 2.9 wires the edit gesture.

### Region detection is a heuristic (documented)

MKLocalSearch doesn't cleanly type a result as "region". Heuristic: a result whose placemark has an `administrativeArea`/`country` but no `thoroughfare`/POI name (or `areasOfInterest`) reads as a region/country. Flag it `isRegion`; the search offers 記錄這個地區 on it. Imperfect — accepted for this cut; refine on-device.

### Integration points

- `Pin`/`PinInsert` (2.1) + `CaptureWritePlanner` (2.3/2.4/2.5): + `isApproximate`.
- `ResolvedPlacement` (2.4): + `isApproximate`.
- `PlaceResult`/`SearchViewModel`/`SearchScreen` (2.2): + `isRegion` + the 記錄這個地區 affordance.
- `MapScreen`: region-record → date step directly (skip fine-tune).
- `MapLibreMapView`: the dashed-hollow approximate-pin layer.
- `supabase/migrations` (travel-map): the additive column.

### Project Structure Notes

```
travel-map/supabase/migrations/<ts>_pins_is_approximate.sql  (NEW — Simon db push)
mapsake-ios/
├── Packages/MapsakeKit/Sources/MapsakeModels/{Pin(isApproximate), CaptureWrite(isApproximate), ResolvedPlacement(isApproximate), PlaceSearch(isRegion)}.swift
├── Packages/MapsakeKit/Tests/MapsakeModelsTests/{PinDecodeTests, CaptureWriteTests}.swift (update)
├── Mapsake/Features/Capture/Search/{PlaceSearch(isRegion), SearchScreen(記錄這個地區)}.swift
├── Mapsake/Features/Map/Views/{MapLibreMapView(dashed marker), MapScreen(region-record → date step)}.swift
└── Packages/MapsakeKit/Sources/MapsakeDesign/{L.swift, Localizable.xcstrings}  (capture.recordRegion)
```

### References

- [Source: epics.md#Story 2.8 (425–437), #FR11/FR29]
- [Source: architecture.md#additive-only migrations (58, 125), #never-tighten-web-column (229), #Shape A (122)]
- [Source: EXPERIENCE.md (region backfill 70, loop 72, edit/remove 82), DESIGN.md pin-marker fill-approximate]
- [Source: pins schema `supabase/migrations/20260622120000_init_pins.sql`; mapsake-ios Pin/PinInsert/CaptureWritePlanner/ResolvedPlacement/MapLibreMapView/SearchScreen]

## Review Findings (bmad-code-review, Fable 5, 2026-07-19)

3 adversarial layers. AC1–AC8 SATISFIED (AC2 with the disclosed+sound fine-tune-reuse deviation; AC4 hollow-not-dashed disclosed). The hand-written `Pin.init(from:)`, the optional encoding, the MapLibre Bool predicate, and the SQL all verified CLEAN. 5 patches applied, 4 deferred.

Patches (applied — see Change Log):
- [x] [Review][Patch] A precise capture within 150m of a region-centroid approximate pin merged INTO it (a placeholder swallowing a real memory). The proximity merge now excludes approximate pins [FineTuneViewModel.swift]
- [x] [Review][Patch] A bare-COUNTRY result (日本) coloured one arbitrary prefecture (region_code from the country centroid). `記錄這個地區` restricted to admin-1 regions (administrativeArea present); country-level backfill deferred [PlaceSearch.swift]
- [x] [Review][Patch] The region heuristic had VETO power — a false positive couldn't be captured precisely, and the row lost its subtitle. The primary tap now always fine-tunes (escape hatch); a region row ADDS a trailing 記錄這個地區 button; the subtitle is kept [SearchScreen.swift]
- [x] [Review][Patch] Dragging during the reused fine-tune kept `is_approximate=true` (contradicts "cleared when dragged"). A move now clears the approximate flag — precise placement at capture time (partial AC5 at capture) [FineTuneViewModel.swift]
- [x] [Review][Patch] **Major (contract gate):** the ios-consumer contract (G1 migration gate) wasn't extended with `is_approximate`. Added to the pins insert in BOTH copies (travel-map + the authored MapsakeData copy) [ios-consumer.contract.sql ×2]

Deferred (noted, not blocking):
- [x] [Review][Defer] A region whose MKLocalSearch centroid falls over water → region_code + country_code both NULL → the region doesn't colour (silent). Centroid-quality; on-device / a country-code fallback follow-up.
- [x] [Review][Defer] Pre-migration, an approximate write fails (PGRST204, unknown column) at the last step — same class as every Epic 2 write (all Simon-gated on the migration push); a precise NEW-pin capture works pre-push, an approximate one needs THIS migration. Noted; the app ships only after the pushes.
- [x] [Review][Defer] The hollow approximate marker uses the standard zoom-fade (invisible below ~zoom 6), so it's faint at the region zoom where a region pin is most relevant — marker zoom tuning (on-device).
- [x] [Review][Defer] Locality-bearing cities (京都) can't be region-recorded while special-municipality cities (台北市) can — a CLPlacemark-field inconsistency in the heuristic (on-device refine). Dismissed: the planner "double-guard" reads correct-by-construction (the VM nils the match; tested).

## Dev Agent Record

### Agent Model Used

Opus 4.8 (claude-opus-4-8, dev-story). Code review on Fable 5.

### Debug Log References

- `swift test` (MapsakeKit) — 72 tests pass (region-record isApproximate branch; `Pin`/`PinInsert` `is_approximate` decode/encode incl. the pre-migration type bridge). Needed a `swift package clean` once (a cross-module incremental-link staleness on the changed `Pin.init` default-arg signature — clean fixed it).
- `xcodebuild build`/`test -scheme Mapsake` — **SUCCEEDED**.
- `swiftlint lint` — exit 0. Candidate strings — 31 `needs_review` (+`capture.recordRegion`).

### Completion Notes List

- **Schema (Simon-approved: add the additive column).** `supabase/migrations/20260719120000_pins_is_approximate.sql` — `is_approximate boolean not null default false`, ADDITIVE + defaulted so the live web client (which never selects/sets it) is unaffected ("never tighten a web-touched column"). **Simon-gated `supabase db push`** (dev→prod), after the 1.4 migration; run `supabase gen types` after.
- **Type bridge (reads work BEFORE the push).** `Pin` gained a custom `init(from:)` that decodes `is_approximate` via `decodeIfPresent ?? false` — so the app keeps reading `pins` against the CURRENT prod schema (no column yet). `PinInsert.isApproximate: Bool?` is omitted when nil (synthesized `encodeIfPresent`, like `muted`) → the DB default applies. Both covered by `PinDecodeTests` (pre-migration row → false; present → true; insert omits/sends).
- **The write.** `ResolvedPlacement.isApproximate` → `CaptureWritePlanner.plan(..., isApproximate:)` → `PinInsert` (only a NEW pin; a proximity match is never approximate — the fine-tune VM nils the match when approximate). Unit-tested.
- **記錄這個地區 reuses fine-tune (disclosed deviation, see Task 4).** `PlaceResult.isRegion` (a `LivePlaceSearch` heuristic: administrativeArea/country, no POI/thoroughfare/locality) → the search row shows 記錄這個地區 → `openFineTune(isApproximate: true)` pre-centered on the region. Fine-tune resolves `region_code` from the map (so the region colours) and carries the approximate flag; no forced nudge. **NOT** the spec's literal "skip to date step" — because region_code needs the map query.
- **Dashed-hollow marker.** Approximate pins render HOLLOW (cream fill + terracotta ring) via a second `pins-approx-marker` circle layer filtered on the `approx` feature attribute; the solid layer filters `approx != YES`; both remain tappable (2.7 sheet). A TRUE dashed ring needs a symbol image (circle strokes can't dash) — an on-device polish; hollow conveys approximate.
- **Solidify-on-drag is Story 2.9.** 2.8 sets + renders the flag; 2.9's edit (drag on the map) clears it.
- **Simon-gated:** push the `is_approximate` migration (after 1.4); bless the FR28 candidates incl. 記錄這個地區. On-device: the region-detection heuristic quality + the hollow marker + real region colouring.

### File List

**travel-map repo:** `supabase/migrations/20260719120000_pins_is_approximate.sql` (NEW — Simon db push)

**mapsake-ios repo (`/Users/simon/projects/Mapsake`), branch `main`:**

Modified:
- `Packages/MapsakeKit/Sources/MapsakeModels/Pin.swift` (isApproximate + custom lenient decode)
- `Packages/MapsakeKit/Sources/MapsakeModels/{CaptureWrite, ResolvedPlacement, FineTuneViewModel, PlaceSearch, PhotoStepViewModel}.swift` (thread isApproximate; PlaceResult.isRegion)
- `Packages/MapsakeKit/Tests/MapsakeModelsTests/{PinDecodeTests, CaptureWriteTests}.swift`
- `Packages/MapsakeKit/Sources/MapsakeDesign/{Localization/L.swift, Resources/Localizable.xcstrings}` (capture.recordRegion)
- `Mapsake/Features/Capture/Search/{PlaceSearch (isRegion heuristic), SearchScreen (記錄這個地區 row)}.swift`
- `Mapsake/Features/Map/Views/{MapLibreMapView (approx marker + tap), MapScreen (region-record → fine-tune approximate)}.swift`

## Change Log

- 2026-07-19 — 2.8 implemented (dev-story, Opus 4.8): approximate region-backfill — an additive `pins.is_approximate` column (Simon-gated migration) with a lenient type bridge so reads work pre-push; `記錄這個地區` on region search results → an approximate pin at the region centre (reuses fine-tune pre-centered to resolve region_code, disclosed deviation from "skip fine-tune"); a hollow marker variant on the map. 72 MapsakeKit tests green, app build + SwiftLint green, +1 FR28 candidate. Status → review.
- 2026-07-19 — code-review (Fable 5, 3 layers): 5 patches — exclude approximate pins from the proximity merge (no placeholder-swallows-precise-pin), restrict 記錄這個地區 to admin-1 regions (a country coloured a random prefecture), region row keeps its subtitle + primary tap fine-tunes (escape hatch) + a trailing 記錄這個地區, a drag clears the approximate flag at capture, and the ios-consumer contract gate extended with is_approximate. 4 deferred (sea-centroid null codes, pre-migration write, marker zoom, heuristic city inconsistency). 74 MapsakeKit tests green, app build + SwiftLint green. Status → done.
