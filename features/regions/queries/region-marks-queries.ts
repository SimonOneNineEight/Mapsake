"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRegionMark,
  listRegionMarks,
  type RegionLevel,
  type RegionMark,
} from "@/data/region-marks";
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
 * region back to unvisited. Invalidate only on success (ack) to reconcile with truth.
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
    // Reconcile with the server only after a confirmed write (ack).
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    // No onError rollback: retain the optimistic mark; the UI offers a calm retry.
    retry: 1,
  });
}
