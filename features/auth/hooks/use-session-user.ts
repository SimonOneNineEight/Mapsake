"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

/**
 * The current (anonymous or real) user's id, read from the local Supabase JWT via
 * getClaims() — no auth-server round-trip. Used as the `['regionMarks', userId]`
 * query-key suffix. An anon session always exists post-Story-1.4; this returns null
 * only for the brief moment before the session resolves.
 */
export function useSessionUserId(): string | null {
  const { data } = useQuery({
    queryKey: ["sessionUserId"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getClaims();
      if (error) throw error;
      return (data?.claims?.sub as string | undefined) ?? null;
    },
    staleTime: Infinity, // the session id is stable for the page's lifetime
  });
  return data ?? null;
}
