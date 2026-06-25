import { listRegionMarks } from "@/data/region-marks";
import { listPins } from "@/data/pins";
import { listAllPhotos } from "@/data/photos";
import { buildExportPayload, type ExportPayload } from "@/data/export";

// Data gather for "export my data" (Story 2.6). Composes the existing data/* boundary fns only —
// no new Supabase import here either; the reads run under the user's session (RLS scopes to their
// own rows, so the export "contains only my data" for free — no service role, no server route).
// Kept separate from the pure builder (data/export.ts) so that module stays side-effect-free.
export async function gatherExport(
  userId: string | null,
  meta?: { exportedAt?: string },
): Promise<ExportPayload> {
  // Three RLS-scoped reads (photos in ONE query via listAllPhotos — not an N+1 per-pin fan-out).
  const [regionMarks, pins, photos] = await Promise.all([
    listRegionMarks(),
    listPins(),
    listAllPhotos(),
  ]);
  return buildExportPayload(regionMarks, pins, photos, {
    userId,
    exportedAt: meta?.exportedAt ?? new Date().toISOString(),
  });
}
