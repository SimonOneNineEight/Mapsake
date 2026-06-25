"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProfileSettings,
  updateProfileSettings,
  type ProfileSettings,
} from "@/data/profile";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

// Notification settings (Story 5.6) — global on/off + delivery time. Optimistic with rollback on
// failure (a toggle that fails must revert, not lie); reconciled on ack. Keyed by userId.

const settingsKey = (userId: string | null) => ["profile-settings", userId] as const;

export function useProfileSettings() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: settingsKey(userId),
    queryFn: getProfileSettings,
    enabled: !!userId,
  });
}

export function useUpdateProfileSettings() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();
  const key = settingsKey(userId);

  return useMutation({
    mutationFn: (input: { notifEnabled?: boolean; notifTime?: string }) =>
      updateProfileSettings(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<ProfileSettings>(key);
      if (prev) {
        queryClient.setQueryData<ProfileSettings>(key, {
          notifEnabled: input.notifEnabled ?? prev.notifEnabled,
          notifTime: input.notifTime ?? prev.notifTime,
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev); // revert — the write didn't land
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    retry: 1,
  });
}
