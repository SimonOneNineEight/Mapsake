"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRegionMark,
  listRegionMarks,
  removeRegionMark,
  type RegionLevel,
  type RegionMark,
} from "@/data/region-marks";
import { deletePin, type Pin } from "@/data/pins";
import { listPhotos, removePhotoObjects } from "@/data/photos";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

const regionMarksKey = (userId: string | null) => ["regionMarks", userId] as const;

/** The current user's explicit region marks (RLS-scoped). Drives the visited fill. */
export function useRegionMarks() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: regionMarksKey(userId),
    queryFn: listRegionMarks,
    enabled: !!userId,
  });
}

export interface AddRegionMarkInput {
  level: RegionLevel;
  regionCode: string;
  countryCode: string;
}

/**
 * Mark a region visited. Optimistic: the mark lands in the cache immediately so the
 * fill animates in before the server acks. Durable-write contract: on failure we
 * KEEP the optimistic edit (no rollback) and surface a calm retry — never flash the
 * region back to unvisited. We do NOT invalidate-and-refetch on success: the optimistic
 * row already matches the server (the write is an idempotent upsert keyed by region+level),
 * and a per-tap refetch would briefly drop a concurrent in-flight tap's optimistic mark —
 * the transient-unvisited flash (Story 1.5/2.5 fix). Reads reconcile on mount/refocus.
 */
export function useAddRegionMark() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();
  const key = regionMarksKey(userId);

  return useMutation({
    mutationFn: (input: AddRegionMarkInput) => addRegionMark(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<RegionMark[]>(key) ?? [];
      // Idempotent optimistic add — a re-tap of an already-visited region is a no-op (AC2).
      const exists = prev.some(
        (m) => m.regionCode === input.regionCode && m.level === input.level,
      );
      if (!exists && userId) {
        const optimistic: RegionMark = {
          userId,
          level: input.level,
          regionCode: input.regionCode,
          countryCode: input.countryCode,
          createdAt: new Date().toISOString(),
        };
        queryClient.setQueryData<RegionMark[]>(key, [...prev, optimistic]);
      }
      return { prev };
    },
    // No onSuccess invalidate (flash fix) and no onError rollback: the optimistic mark is the
    // durable truth on ack; on failure it's retained and the UI (MapCanvas) offers a calm retry.
    retry: 1,
  });
}

export interface UnmarkRegionInput {
  regionCode: string;
  level: RegionLevel;
  pins: Pin[]; // the pins inside this region (computed by the caller) — all removed too
}

/**
 * "Remove this place" (Story 3.10): remove the explicit region mark AND delete every pin in
 * the region (rows cascade their photo rows; bucket objects cleaned). The land returns to bare
 * via the Story 3.9 derive once both caches drop their contributors. Optimistic, and — like
 * the other deletes (Story 3.8) — ROLLS BACK on failure (a failed removal must not look
 * successful). A failed unmark now surfaces a calm retry (Story 2.5): MapCanvas retains the input
 * in `failedUnmark` and SaveStatus renders a tappable 「無法移除，重試」 (closing the Story 3.10 gap).
 * `onSettled` invalidates both caches so a PARTIAL multi-delete failure reconciles to server
 * truth (a deleted pin's marker can't linger after the optimistic rollback over-restores).
 */
export function useUnmarkRegion() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();
  const marksKey = regionMarksKey(userId);
  const pinsKey = ["pins", userId] as const;

  return useMutation({
    mutationFn: async ({ regionCode, level, pins }: UnmarkRegionInput) => {
      for (const pin of pins) {
        // Row first (3.8-review ordering): a failed row delete leaves the pin intact.
        const photos = await listPhotos(pin.id);
        await deletePin(pin.id);
        await removePhotoObjects(photos.map((p) => p.storagePath));
      }
      await removeRegionMark({ regionCode, level });
    },
    onMutate: async ({ regionCode, level, pins }) => {
      await queryClient.cancelQueries({ queryKey: marksKey });
      await queryClient.cancelQueries({ queryKey: pinsKey });
      const prevMarks = queryClient.getQueryData<RegionMark[]>(marksKey) ?? [];
      const prevPins = queryClient.getQueryData<Pin[]>(pinsKey) ?? [];
      const removedIds = new Set(pins.map((p) => p.id));
      queryClient.setQueryData<RegionMark[]>(
        marksKey,
        prevMarks.filter((m) => !(m.regionCode === regionCode && m.level === level)),
      );
      queryClient.setQueryData<Pin[]>(pinsKey, prevPins.filter((p) => !removedIds.has(p.id)));
      return { prevMarks, prevPins };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prevMarks) queryClient.setQueryData<RegionMark[]>(marksKey, ctx.prevMarks);
      if (ctx?.prevPins) queryClient.setQueryData<Pin[]>(pinsKey, ctx.prevPins);
    },
    onSuccess: (_data, { pins }) => {
      for (const pin of pins) queryClient.removeQueries({ queryKey: ["photos", pin.id] });
    },
    // Reconcile to server truth on ANY outcome — incl. a partial multi-delete failure where
    // the optimistic rollback would otherwise re-show already-deleted pins.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: marksKey });
      queryClient.invalidateQueries({ queryKey: pinsKey });
    },
    retry: 1,
  });
}
