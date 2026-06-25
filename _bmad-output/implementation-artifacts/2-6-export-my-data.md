---
baseline_commit: 236c00a
---

# Story 2.6: Export my data

Status: done

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

- [x] **Task 1 — Export gather + payload builder (AC: 2, 3)** [data/export.ts (NEW), data/gather-export.ts (NEW)]
  - [x] Split into a PURE builder + a gather: `data/export.ts` holds `buildExportPayload(marks, pins, photos, meta)` + `ExportPayload` with **type-only** domain imports (no Supabase/runtime load → unit-testable in Node). `data/gather-export.ts` holds `gatherExport(userId, meta?)` composing `listRegionMarks()` + `listPins()` + `Promise.all(pins.map(p => listPhotos(p.id)))` (no list-all helper exists) → `buildExportPayload`. No new `createClient` import in either (boundary preserved).
  - [x] Envelope: `{ mapsakeExportVersion: 1, exportedAt: <ISO>, userId, regionMarks, pins, photos }`. Per-row `userId` stripped (envelope-level). Photos = `{ id, pinId, storagePath, width, height, takenAt, sortOrder }` (refs, no binaries, no signed URLs). Nulls preserved (note/memoryDate/exifTakenAt/country/region) for round-trip.
- [x] **Task 2 — Export hook (state + download side-effect) (AC: 1)** [features/settings/hooks/use-export.ts (NEW)]
  - [x] `useExport()`: a `useMutation` (idle→isPending→isSuccess/isError) wrapping `gatherExport(userId)` (userId from `useSessionUserId`), then the browser download (`Blob` → `URL.createObjectURL` → transient `<a download="mapsake-export-YYYY-MM-DD.json">` → `revokeObjectURL`). The DOM side-effect lives only here. Under `features/settings/` so Story 6-3 re-mounts it unchanged.
- [x] **Task 3 — Trigger in the account sheet (AC: 1)** [features/auth/components/account-sheet.tsx]
  - [x] Added 「匯出我的回憶」 to the `signedIn` body (between 已登入 and 登出), wired to `useExport`; the label shows 「正在為你整理回憶…」 while pending (disabled), and a calm inline 「這次沒能整理好，稍後再試一次」 on error (never implies loss). Quiet terracotta-link styling matching 登出. Signed-in-only by placement.
- [x] **Task 4 — Tests (AC: 2, 3)** [e2e/export.spec.ts (NEW)]
  - [x] Node-side pure test (the rollup-derivation pattern, importing `buildExportPayload` from `../data/export`): the versioned envelope shape, per-row `userId` stripped, notes/dates + nulls preserved, photos are `storagePath` refs (no `url`/`blob`), and empty input → empty arrays (the "only what's passed / only my data" property).
  - [x] The signed-in trigger + the actual download are a manual check (the e2e harness is anon-only — no permanent session — the same limitation as the 2-3 signed-in path); the button is gated to the `signedIn` branch (verified).
  - [x] No-regression: `tsc` + `lint` + `pnpm build --webpack` clean; full e2e **65 passed, 1 skipped** (one known timing flake passed on retry; confirmed clean in isolation).

## Review Findings

_Code review 2026-06-25 (3 adversarial layers + triage): 2 patches, rest accept/dismiss; auditor verified all 3 ACs clean (RLS-scoped, no service role, no server route, calm tone)._

- [x] [Review][Patch] N+1 photo fan-out in `gatherExport` (one `listPhotos` per pin) [data/gather-export.ts, data/photos.ts] — FIXED: added `listAllPhotos()` (ONE RLS-scoped query for all the user's photos, ordered pin→sort) and switched the gather to it; the three reads now run as one `Promise.all`. (blind+edge, the most-cited finding)
- [x] [Review][Patch] Object URL leak if a download step throws [features/settings/hooks/use-export.ts] — FIXED: wrapped the anchor lifecycle in `try/finally` so `URL.revokeObjectURL` always runs. (blind+edge, Low)
- [x] [Review][Dismiss] Top-level `userId` in the envelope — intentional: it's the user's OWN id in their OWN export (aids a future re-import), not a leak; the per-row strip was to avoid redundancy, not privacy. (blind, Low)
- [x] [Review][Dismiss] Region-marks "completeness" — the export carries the raw `region_marks` AND the raw `pins`; the visited roll-up is a pure derivation of those, so nothing is lost (it re-derives from the file). (auditor)
- [x] [Review][Accept] No success toast (the browser download is the signal — within AC1's request→preparing→download); UTC filename date (cosmetic; the precise `exportedAt` is in the file); non-atomic read snapshot (benign for a single-user export, and the one-query photos read narrows the window). (auditor/blind, Low/informational)

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

claude-opus-4-8 (1M context)

### Debug Log References

### Completion Notes List

- **Client-side, RLS-scoped, no new infra:** the export reads the user's own rows through the existing `data/*` boundary under their session, so "only my data" holds for free — no service role, no server route. Photos are references (`storage_path` + metadata), not binaries.
- **Pure builder split out for testability:** `data/export.ts` (`buildExportPayload` + `ExportPayload`, type-only imports → Node-importable with no Supabase load) vs `data/gather-export.ts` (`gatherExport`, the runtime reads). This is what let the envelope logic be unit-tested in Node.
- **Trigger:** 「匯出我的回憶」 in the account sheet's signed-in body (no dependency on the unbuilt Settings 6-3); preparing/error states inline; the download is a `Blob` + transient `<a download>`.
- **Deferred (documented):** photo binaries / zip (a complete takeaway), in-file signed URLs (they expire), and relocating the control into the real Settings home (Story 6-3). The v1 export is a faithful refs manifest.
- **Validation:** `tsc` clean · `pnpm lint` clean · `pnpm build --webpack` clean · full e2e **65 passed, 1 skipped** (the date-persist flake passed on retry; memory.spec re-run clean in isolation). 3 new pure export tests.

### File List

- **NEW** `data/export.ts` — pure `buildExportPayload` + `ExportPayload` (type-only imports)
- **NEW** `data/gather-export.ts` — `gatherExport(userId)` (RLS-scoped reads → builder)
- **NEW** `features/settings/hooks/use-export.ts` — `useExport()` state + Blob/anchor download
- **MOD** `features/auth/components/account-sheet.tsx` — 「匯出我的回憶」 trigger in the signed-in body
- **NEW** `e2e/export.spec.ts` — 3 pure `buildExportPayload` tests

### Change Log

- 2026-06-25 — Code review (3 layers + triage): 2 patches (one-query `listAllPhotos` to kill the N+1; try/finally around the download), rest accepted/dismissed; all 3 ACs verified clean. tsc/lint clean, e2e green. Status → done.
- 2026-06-25 — Implemented export my data (AC1-3): a signed-in user exports a single versioned JSON of their marks/pins/notes/dates/photo-refs from the account sheet; client-side under RLS (no server route, no service role), photos as references. Pure builder split for Node unit tests. Binaries/zip + signed-URLs-in-file + Settings relocation deferred. tsc/lint/build clean, 65 e2e passed. Status → review.
- 2026-06-25 — Story created (context engine + 4-agent research workflow). Scope: client-side RLS-scoped JSON export (refs, not binaries) triggered from the account sheet; binaries + Settings-relocation deferred.
