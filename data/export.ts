import type { RegionMark } from "@/data/region-marks";
import type { Pin } from "@/data/pins";
import type { Photo } from "@/data/photos";

// "Export my data" envelope (Story 2.6). The PURE builder lives here (type-only imports → no
// Supabase/runtime load, so it's unit-testable in Node). The data gather (gatherExport) lives in
// data/gather-export.ts to keep this module side-effect-free.
//
// The export is the durability/portability trust guarantee ("the memories are yours to take"):
// one portable JSON of the user's own rows. Photos are REFERENCES (storage_path + metadata), NOT
// binaries — a binaries/zip export and in-file signed URLs (which expire) are deferred fast-follows.

export interface ExportPayload {
  mapsakeExportVersion: 1;
  exportedAt: string; // ISO8601
  userId: string | null;
  regionMarks: Omit<RegionMark, "userId">[];
  pins: Omit<Pin, "userId">[];
  photos: Pick<
    Photo,
    "id" | "pinId" | "storagePath" | "width" | "height" | "takenAt" | "sortOrder"
  >[];
}

/**
 * Pure: assemble the export envelope from already-fetched rows. Strips the per-row `userId`
 * (it's at the envelope level), keeps notes/dates and nulls faithfully (so a future re-import
 * round-trips), and reduces photos to references. No I/O — testable in isolation.
 */
export function buildExportPayload(
  regionMarks: RegionMark[],
  pins: Pin[],
  photos: Photo[],
  meta: { userId: string | null; exportedAt: string },
): ExportPayload {
  return {
    mapsakeExportVersion: 1,
    exportedAt: meta.exportedAt,
    userId: meta.userId,
    regionMarks: regionMarks.map((m) => ({
      level: m.level,
      regionCode: m.regionCode,
      countryCode: m.countryCode,
      createdAt: m.createdAt,
    })),
    pins: pins.map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      countryCode: p.countryCode,
      regionCode: p.regionCode,
      note: p.note,
      memoryDate: p.memoryDate,
      exifTakenAt: p.exifTakenAt,
      muted: p.muted,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    photos: photos.map((ph) => ({
      id: ph.id,
      pinId: ph.pinId,
      storagePath: ph.storagePath,
      width: ph.width,
      height: ph.height,
      takenAt: ph.takenAt,
      sortOrder: ph.sortOrder,
    })),
  };
}
