"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSignedUrls,
  deletePhoto,
  insertPhoto,
  listPhotos,
  removePhotoObject,
  uploadPhotoObject,
  type Photo,
} from "@/data/photos";
import { processImage } from "@/features/memories/lib/process-image";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

const photosKey = (pinId: string | null) => ["photos", pinId] as const;

export interface PhotoWithUrl extends Photo {
  url: string | null; // signed view URL (private bucket); null if signing failed
}

/**
 * A pin's photos with signed view URLs (private bucket). Keyed by pinId — rows are RLS-scoped
 * and a pin has one owner. URLs expire (~1h); refetch-on-focus refreshes them.
 */
export function usePhotos(pinId: string | null) {
  return useQuery({
    queryKey: photosKey(pinId),
    enabled: !!pinId,
    queryFn: async (): Promise<PhotoWithUrl[]> => {
      const photos = await listPhotos(pinId as string);
      const urls = await createSignedUrls(photos.map((p) => p.storagePath));
      return photos.map((p) => ({ ...p, url: urls[p.storagePath] ?? null }));
    },
  });
}

/**
 * Returns an async `uploadOne(file, sortOrder)` the uploader fans out over a batch, tracking
 * each file's state locally (queued → uploading → done/error) for immediate placeholders +
 * calm per-photo retry. Durable-write: resolves only after BOTH the object upload AND the
 * row insert ack; on failure it throws (the queue retains the item + offers retry — no
 * rollback). Invalidates `['photos', pinId]` on success so the real thumbnail appears.
 */
export function useUploadPhoto(pinId: string) {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useCallback(
    async (file: File, sortOrder: number): Promise<Photo> => {
      if (!userId) throw new Error("No active session — cannot upload a photo.");
      const photoId = crypto.randomUUID();
      const processed = await processImage(file);
      const storagePath = await uploadPhotoObject({
        userId,
        pinId,
        photoId,
        blob: processed.blob,
      });
      let photo: Photo;
      try {
        photo = await insertPhoto({
          id: photoId,
          pinId,
          storagePath,
          width: processed.width,
          height: processed.height,
          takenAt: processed.takenAt,
          sortOrder,
        });
      } catch (err) {
        // Row insert failed after the object uploaded — remove the orphan before rethrowing
        // (retry mints a new id/path, so this object would otherwise never be reclaimed).
        await removePhotoObject(storagePath);
        throw err;
      }
      await queryClient.invalidateQueries({ queryKey: photosKey(pinId) });
      return photo;
    },
    [userId, pinId, queryClient],
  );
}

/**
 * Remove one photo (Story 3.8): deletes the row + bucket object. Optimistic: the photo leaves
 * the `['photos', pinId]` cache immediately. A failed delete ROLLS BACK (the photo reappears)
 * + the UI offers a calm retry — a destructive op must not look successful on failure.
 */
export function useDeletePhoto(pinId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (photo: { id: string; storagePath: string }) => deletePhoto(photo),
    onMutate: async (photo) => {
      await queryClient.cancelQueries({ queryKey: photosKey(pinId) });
      const prev = queryClient.getQueryData<PhotoWithUrl[]>(photosKey(pinId)) ?? [];
      queryClient.setQueryData<PhotoWithUrl[]>(
        photosKey(pinId),
        prev.filter((p) => p.id !== photo.id),
      );
      return { prev };
    },
    onError: (_err, _photo, ctx) => {
      if (ctx?.prev) queryClient.setQueryData<PhotoWithUrl[]>(photosKey(pinId), ctx.prev);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: photosKey(pinId) }),
    retry: 1,
  });
}
