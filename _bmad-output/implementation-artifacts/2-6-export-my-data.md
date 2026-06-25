# Story 2.6: Export my data

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want to export everything I've created,
so that my memories are mine to take.

## Acceptance Criteria

1. **Request → "preparing your keepsake" → download.** From the account surface, a signed-in user can request an export; a calm "preparing your keepsake" state shows (even if generation is near-instant — it carries the trust framing), then a single file downloads. [epics 2.6 AC1; EXPERIENCE.md line 87 "Export ready" state pattern; UX-DR10]
2. **The file contains marks, pins, notes, dates, and photo references.** One downloadable JSON file aggregating: `region_marks` (marks), `pins` (name, lat/lng, country/region codes, **note**, **memory_date** + `exif_taken_at`), and `photos` as **references** — the row metadata incl. `storage_path`, NOT the image binaries. [epics 2.6 AC1; architecture line 143 "photos holds only the path"]
3. **Only my data (RLS-scoped).** The export contains only the signed-in user's own rows — guaranteed by reading through the existing RLS boundary (`user_id = auth.uid()`) with the user's session (anon key), NOT a service-role/admin query. [epics 2.6 AC2; architecture lines 112, 281, 222]

### Decisions baked in (from the 4-agent context analysis, 2026-06-25)

- **Entry point = the account sheet's signed-in body** (alongside 登出), NOT a dependency on the unbuilt Settings surface (Story 6-3 is just a `features/settings/.gitkeep` placeholder). Export is signed-in-only (it's the account-durability guarantee; an anon user has no durable account to "take" data from, and the trigger is gated to the `signedIn` branch). The export logic stays decoupled (a `data/export.ts` + a hook) so Story 6-3 can re-mount the control in the real Settings home with no rework.
- **Format = a single versioned JSON file** (`mapsake_export_version: 1`, `exportedAt`, `userId`, `regionMarks[]`, `pins[]`, `photos[]`), filename `mapsake-export-YYYY-MM-DD.json`. Camel-case (flows through the `data/` layer which already maps snake→camel). The version field keeps a future re-import non-breaking.
- **Photo references = `storage_path` + metadata only.** NO signed URLs in the file (they expire in 1h → a saved backup with dead links is misleading), and NO binaries (the WebP files). A binaries/zip export (a complete takeaway) is an explicit **deferred fast-follow**, not a silent omission. So the v1 export is a faithful *manifest* of refs.
- **Client-side gather, no server route, no service role.** Reading the user's own rows via `data/*` under RLS satisfies "only my data" for free. A server/API route is explicitly NOT warranted (architecture line 282 — routes are for secret/scheduled work only).

## Tasks / Subtasks

- [ ] **Task 1 — Export gather + payload builder (AC: 2, 3)** [data/export.ts (NEW)]
  - [ ] Add `data/export.ts` composing the existing data-boundary fns (no new `createClient` import — preserve the data-boundary rule). A **pure** `buildExportPayload(marks, pins, photos, meta)` → the versioned envelope (testable in isolation), and `gatherExport()` that calls `listRegionMarks()` + `listPins()` (from `@/data/region-marks`, `@/data/pins`), fans out `listPhotos(pin.id)` over the pins via `Promise.all` (bounded — there is NO list-all-photos helper; `listPhotos` requires a pinId), then `buildExportPayload(...)`.
  - [ ] Envelope: `{ mapsakeExportVersion: 1, exportedAt: <ISO>, userId, regionMarks, pins, photos }`. Photos carry `{ id, pinId, storagePath, width, height, takenAt, sortOrder }` (refs, no binaries, no signed URLs). Preserve nulls faithfully (note/memoryDate/exifTakenAt/country/region can be null) so a future re-import round-trips.
- [ ] **Task 2 — Export hook (state + download side-effect) (AC: 1)** [features/settings/hooks/use-export.ts (NEW)]
  - [ ] Thin `"use client"` hook: an idle→preparing→done/error state (a `useMutation` or a small busy flag) wrapping `gatherExport()`, then the browser download (`Blob([JSON.stringify(payload, null, 2)], {type:"application/json"})` → `URL.createObjectURL` → transient `<a download=...>` click → `revokeObjectURL`). The DOM/download side-effect lives ONLY here (never in `data/`). Mirror the hook conventions in `features/pins/queries`.
- [ ] **Task 3 — Trigger in the account sheet (AC: 1)** [features/auth/components/account-sheet.tsx]
  - [ ] In the `signedIn` body (the 你的地圖已保存 block with 已登入 + 登出), add a calm export button wired to `use-export`, with the preparing/done/error states reflected in its label. Match the existing quiet button styling (terracotta link / the 登出 treatment). zh-TW drafts (native pass pre-launch, per EXPERIENCE.md line 43): trigger 「匯出我的回憶」; preparing 「正在為你整理回憶…」; done 「你的回憶準備好了」; error (calm, never imply loss) 「這次沒能整理好，稍後再試一次」. Reuse the shared `SaveStatus`-style calm error tone if it fits, else inline.
- [ ] **Task 4 — Tests (AC: 2, 3)** [e2e/export.spec.ts (NEW) + in-browser pure test]
  - [ ] In-browser pure test (the rollup/pins `page.evaluate` pattern): `buildExportPayload(marks, pins, photos, meta)` → assert the envelope shape (version, ISO `exportedAt`, the three arrays present), nulls preserved, photos carry `storagePath` and NOT a binary/blob, and an empty input → empty arrays (the "only what's passed / only my data" property). Import the pure fn into the test page.
  - [ ] Note: the signed-in trigger + the actual download are a manual check (the e2e harness is anon-only — no permanent session — the same limitation noted for the 2-3 signed-in path). Assert via code review that the button is gated to the `signedIn` branch.
  - [ ] No-regression: `pnpm exec tsc --noEmit` + `pnpm lint` + `pnpm build --webpack` clean; full e2e suite green.

## Dev Notes

### The data is all there, RLS-scoped — 2-6 is a gather + serialize + download
- **Sources (all in `data/*`, the only Supabase importers, RLS-scoped to the session):** `listRegionMarks()` → `RegionMark[]` {userId, level, regionCode, countryCode, createdAt} [data/region-marks.ts:36]; `listPins()` → `Pin[]` {id, userId, name, lat, lng, countryCode, regionCode, note, memoryDate, exifTakenAt, muted, createdAt, updatedAt} [data/pins.ts:51]; `listPhotos(pinId)` → `Photo[]` {id, pinId, userId, storagePath, width, height, takenAt, sortOrder, createdAt} — **requires a pinId**, no list-all exists, so fan out over pins [data/photos.ts:46]. `createSignedUrls(paths)` exists (1h TTL) but is NOT used here (refs-only). [Source: data/{region-marks,pins,photos}.ts]
- **RLS does the scoping for free:** every read through `data/*` runs under the user's session (anon key) and is filtered to `user_id = auth.uid()`. AC3 ("only my data") needs zero extra logic — and crucially NO service-role key on the client (architecture anti-pattern). [Source: architecture.md lines 112, 281, 222]

### Trigger home (no Settings yet)
- The signed-in body of `account-sheet.tsx` (the `signedIn ? (...)` branch — 你的地圖已保存 / 已登入：{email} / 登出) is the only signed-in surface today; `features/settings/` is an empty `.gitkeep`. Put the export button there. `signedIn` is already computed in the component (`!account.isAnonymous && Boolean(account.email)`). When Story 6-3 builds Settings, it re-mounts the same `use-export` hook there. [Source: features/auth/components/account-sheet.tsx]

### Why no server route / no binaries (scope discipline)
- Export is a per-user read of the user's own rows → client-side under RLS is the simplest correct path; a server route would only matter for zipping binaries, which is out of scope. The architecture confines routes + the service-role key to secret/scheduled work (architecture lines 282, 281). [Source: architecture.md]
- Photo **binaries** (zip of WebP) and **in-file signed URLs** are deferred: signed URLs die in 1h (misleading in a saved file); binaries risk OOM on large libraries and need a zip dep. Document both as fast-follows (a complete-takeaway export) so it's a deliberate choice. [Source: code-analysis risk; data/photos.ts:16 SIGNED_URL_TTL]

### UX / tone (AC1)
- EXPERIENCE.md line 87: "Request → 'preparing your keepsake' → ready to download. Framed as the trust guarantee: the memories are yours to take." Show the preparing beat briefly even when fast — it carries the framing. Voice (lines 41-49): quiet, warm, literary zh-TW; never a salesperson; errors are calm inline retry, never a blocking modal / red error, never imply loss. Strings are drafts pending the pre-launch native zh-TW pass (line 43). [Source: EXPERIENCE.md]

### Risks
- **N+1 photo gather:** `listPhotos` is per-pin; fan out with `Promise.all` over pins (v1 volumes are small — soft caps ~30 photos/pin). [Source: data/photos.ts]
- **Preserve nulls** in the payload (don't coerce) for a faithful round-trip.
- **Signed-in gating:** the trigger must be unreachable pre-sign-in (mount only in the `signedIn` branch).

### Project Structure Notes
- NEW: `data/export.ts` (pure `buildExportPayload` + `gatherExport`), `features/settings/hooks/use-export.ts` (state + download), `e2e/export.spec.ts`. MOD: `features/auth/components/account-sheet.tsx` (the signed-in body trigger). No schema migration, no new dependency, no server route, no service role.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story-2.6 (FR4); architecture.md lines 28, 112, 143, 154, 222, 281-282, 291, 302, 315]
- [Source: _bmad-output/planning-artifacts/ux-designs/.../EXPERIENCE.md lines 35, 41-49, 66, 85, 87]
- [Source: data/{region-marks,pins,photos}.ts; features/auth/components/account-sheet.tsx; features/pins/queries/pins-queries.ts (hook conventions)]

### Resolved with Simon (2026-06-25)
1. **Scope:** export from the account sheet (signed-in only), single versioned JSON of marks/pins/notes/dates/photo-REFS (storage_path + metadata; no signed URLs in the file, no binaries), client-side under RLS (no server route, no service role). Binaries/zip + relocation into the real Settings (6-3) are documented fast-follows. (Sensible defaults from the analysis — all aligned with the AC wording + architecture; no open fork.)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log

- 2026-06-25 — Story created (context engine + 4-agent research workflow). Scope: client-side RLS-scoped JSON export (refs, not binaries) triggered from the account sheet; binaries + Settings-relocation deferred.
