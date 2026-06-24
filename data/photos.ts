// Data-access for photos — the ONLY module that imports the Supabase client for `photos`
// and the `pin-photos` Storage bucket (architecture data-boundary rule). Features import
// from here, never raw Supabase. snake_case (DB) ↔ camelCase (domain) mapping happens here.
//
// Photo binaries live in a PRIVATE bucket (media decoupled from core data); this table holds
// only the path + dims + EXIF date + order. Reads need signed URLs. Durable-write (v1): a
// photo is "done" only after BOTH the object upload AND the row insert ack. Online writes
// only. Everything runs under owner-scoped RLS (user_id = auth.uid()).

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type PhotoRow = Database["public"]["Tables"]["photos"]["Row"];

const BUCKET = "pin-photos";
const SIGNED_URL_TTL = 3600; // seconds; reads refetch-on-focus to refresh expiring URLs

export interface Photo {
  id: string;
  pinId: string;
  userId: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  sortOrder: number;
  createdAt: string;
}

const toDomain = (r: PhotoRow): Photo => ({
  id: r.id,
  pinId: r.pin_id,
  userId: r.user_id,
  storagePath: r.storage_path,
  width: r.width,
  height: r.height,
  takenAt: r.taken_at,
  sortOrder: r.sort_order,
  createdAt: r.created_at,
});

const COLUMNS =
  "id, pin_id, user_id, storage_path, width, height, taken_at, sort_order, created_at";

/** A pin's photos, ordered (RLS scopes to the owner). */
export async function listPhotos(pinId: string): Promise<Photo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("photos")
    .select(COLUMNS)
    .eq("pin_id", pinId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as PhotoRow[]).map(toDomain);
}

/** Storage path for a photo object. First segment = owner uid (object RLS enforces it). */
export function photoStoragePath(userId: string, pinId: string, photoId: string): string {
  return `${userId}/${pinId}/${photoId}.webp`;
}

/**
 * Upload the resized WebP blob to the private bucket. Resolves only on ack; throws on
 * failure so the caller can retain + retry. Returns the storage path.
 */
export async function uploadPhotoObject(input: {
  userId: string;
  pinId: string;
  photoId: string;
  blob: Blob;
}): Promise<string> {
  const supabase = createClient();
  const path = photoStoragePath(input.userId, input.pinId, input.photoId);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, input.blob, { contentType: "image/webp", upsert: false });
  if (error) throw error;
  return path;
}

/**
 * Insert the photo metadata row AFTER the object is uploaded. Uses the same `id` as the
 * storage path so object + row stay linked. `user_id` is read from the session (must equal
 * auth.uid() for the RLS insert check) — never trust a client user_id. Returns the row.
 */
export async function insertPhoto(input: {
  id: string;
  pinId: string;
  storagePath: string;
  width: number | null;
  height: number | null;
  takenAt: string | null;
  sortOrder: number;
}): Promise<Photo> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No active session — cannot save a photo.");

  const row: Database["public"]["Tables"]["photos"]["Insert"] = {
    id: input.id,
    pin_id: input.pinId,
    user_id: user.id,
    storage_path: input.storagePath,
    width: input.width,
    height: input.height,
    taken_at: input.takenAt,
    sort_order: input.sortOrder,
  };
  const { data, error } = await supabase.from("photos").insert(row).select(COLUMNS).single();
  if (error) throw error;
  return toDomain(data as PhotoRow);
}

/**
 * Best-effort removal of a single bucket object. Used to clean up an uploaded object whose
 * metadata row insert then failed (otherwise it's a row-less orphan that the pin-delete
 * cascade in Story 3.8 can't reclaim). Best-effort: swallows its own error so it never masks
 * the original failure the caller is handling.
 */
export async function removePhotoObject(storagePath: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([storagePath]);
  } catch {
    // ignore — orphan cleanup is opportunistic; the caller is already in a failure path
  }
}

/**
 * Best-effort bulk removal of bucket objects (Story 3.8 pin-delete cleanup). The pin-row
 * delete cascades the photo ROWS via FK, but not the Storage OBJECTS — this removes them.
 * Best-effort: a failed object delete must not block the row delete (orphan cleanup is
 * opportunistic; the row is the source of truth).
 */
export async function removePhotoObjects(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove(paths);
  } catch {
    // ignore — see removePhotoObject
  }
}

/**
 * Delete one photo (Story 3.8): remove its `photos` row (RLS-scoped) then its bucket object.
 * Resolves only after the row delete acks (the durable part); the object removal is
 * best-effort. Throws on the row-delete failure so the caller can retain + retry.
 */
export async function deletePhoto(input: { id: string; storagePath: string }): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("photos").delete().eq("id", input.id);
  if (error) throw error;
  await removePhotoObject(input.storagePath);
}

/**
 * Signed view URLs for private-bucket objects, mapped path → URL. Entries that error are
 * skipped (the grid shows a placeholder for a missing URL rather than breaking).
 */
export async function createSignedUrls(paths: string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
  if (error) throw error;
  const map: Record<string, string> = {};
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}
