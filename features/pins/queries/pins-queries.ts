"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addPin, listPins, updatePin, type Pin } from "@/data/pins";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

const pinsKey = (userId: string | null) => ["pins", userId] as const;

/** The current user's pins (RLS-scoped). Drives the pin marker layer. */
export function usePins() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: pinsKey(userId),
    queryFn: listPins,
    enabled: !!userId,
  });
}

/**
 * One pin by id, read from the `usePins` list cache (no extra fetch) — the tapped pin is
 * always already loaded (Story 3.4). A dedicated `getPin` + `['pin', pinId]` query is for
 * deep-linking to a pin not in the list (Epic 5 re-live), not needed here.
 */
export function usePin(pinId: string | null): Pin | undefined {
  const { data } = usePins();
  return pinId ? data?.find((p) => p.id === pinId) : undefined;
}

export interface AddPinInput {
  name: string;
  lat: number;
  lng: number;
  regionCode: string | null;
  countryCode: string | null;
}

/**
 * Drop a named pin. Optimistic: the pin lands in the cache immediately (with a temp
 * client id) so it renders before the server acks. Durable-write contract: on failure
 * we KEEP the optimistic pin (no rollback) and surface a calm retry — never silently
 * drop it. Invalidate on success (ack) to swap the temp pin for the real server row.
 */
export function useAddPin() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();
  const key = pinsKey(userId);

  return useMutation({
    mutationFn: (input: AddPinInput) => addPin(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Pin[]>(key) ?? [];
      if (userId) {
        const now = new Date().toISOString();
        const optimistic: Pin = {
          id: crypto.randomUUID(), // temp; replaced by the server row on ack (invalidate)
          userId,
          name: input.name,
          lat: input.lat,
          lng: input.lng,
          countryCode: input.countryCode,
          regionCode: input.regionCode,
          note: null,
          memoryDate: null,
          exifTakenAt: null,
          muted: false,
          createdAt: now,
          updatedAt: now,
        };
        queryClient.setQueryData<Pin[]>(key, [...prev, optimistic]);
      }
      return { prev };
    },
    // Reconcile with the server only after a confirmed write (ack) — swaps temp id for real.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    // No onError rollback: retain the optimistic pin; the UI offers a calm retry.
    retry: 1,
  });
}

export interface UpdatePinInput {
  id: string;
  note?: string | null;
  memoryDate?: string | null;
}

/**
 * Edit a pin's note and/or date (Story 3.5). Optimistic: patch the pin in the
 * `['pins', userId]` cache so the change shows immediately (and `usePin` re-derives it).
 * Durable-write: KEEP the edit on failure (no rollback) + calm retry; reconcile on ack.
 */
export function useUpdatePin() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();
  const key = pinsKey(userId);

  return useMutation({
    mutationFn: (input: UpdatePinInput) => updatePin(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<Pin[]>(key) ?? [];
      const patch: Partial<Pin> = { updatedAt: new Date().toISOString() };
      if ("note" in input) patch.note = input.note;
      if ("memoryDate" in input) patch.memoryDate = input.memoryDate;
      queryClient.setQueryData<Pin[]>(
        key,
        prev.map((p) => (p.id === input.id ? { ...p, ...patch } : p)),
      );
      return { prev };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    // No onError rollback: retain the edit; the UI offers a calm retry.
    retry: 1,
  });
}
