import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// SERVER-ONLY, RLS-BYPASSING admin client (Story 5.3). The service-role key has FULL access and
// ignores Row-Level Security — it must NEVER be imported into a client/edge bundle. The only
// sanctioned use is the scheduled `on-this-day` job (app/api/on-this-day), which legitimately needs
// to read every user's pins + subscriptions to send memory notifications. All anon/per-user flows
// keep using the cookie clients in lib/supabase/{client,server}.ts under RLS. [architecture 154, 282]
//
// SUPABASE_SERVICE_ROLE_KEY is set in .env.local + Vercel (server-only, never NEXT_PUBLIC_, never
// committed). No session persistence — this is a stateless server caller, not a user session.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — the admin client is required by the on-this-day job.",
    );
  }
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
