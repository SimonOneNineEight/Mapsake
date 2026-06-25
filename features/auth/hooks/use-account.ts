"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// The current account's identity (Story 2.1) — read from the local Supabase JWT claims via
// getClaims() (no auth-server round-trip), the same source as useSessionUserId. Distinguishes an
// anonymous session from a signed-in (email-bearing, permanent) one so the sign-in sheet can show
// the right state. After the magic-link confirm redirect the app reloads, so this re-reads fresh.
export interface Account {
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
}

export function useAccount(): Account {
  const { data } = useQuery({
    queryKey: ["account"],
    queryFn: async (): Promise<Account> => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getClaims();
      if (error) throw error;
      const c = data?.claims;
      return {
        userId: (c?.sub as string | undefined) ?? null,
        email: (c?.email as string | undefined) || null,
        isAnonymous: c?.is_anonymous === true, // only an explicit anon claim; a permanent user (or omitted claim) is not anon
      };
    },
    staleTime: Infinity, // session identity is stable for the page's lifetime
  });
  return data ?? { userId: null, email: null, isAnonymous: true };
}
