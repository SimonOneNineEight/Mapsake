// Data-access for the current user's profile SETTINGS (Story 5.6) — the only client-side `profiles`
// module. Anon/cookie client under owner RLS (profiles_owner_select / _update); never the service
// role (that's data/notifications.ts, server-only). snake_case (DB) ↔ camelCase (domain) here.
// Distinct from auth identity (use-account): these are the notification preferences.

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export interface ProfileSettings {
  notifEnabled: boolean;
  notifTime: string; // "HH:MM:SS" (a Postgres time); the picker uses the first 5 chars
}

/** The current user's notification settings. RLS scopes the read to their own row. */
export async function getProfileSettings(): Promise<ProfileSettings> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No active session — cannot read profile settings.");

  const { data, error } = await supabase
    .from("profiles")
    .select("notif_enabled, notif_time")
    .eq("id", user.id)
    .single();
  if (error) throw error;
  return { notifEnabled: data.notif_enabled, notifTime: data.notif_time };
}

/** Update notification settings (global on/off + delivery time). Owner-scoped UPDATE; throws on failure. */
export async function updateProfileSettings(input: {
  notifEnabled?: boolean;
  notifTime?: string;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No active session — cannot update profile settings.");

  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if ("notifEnabled" in input) patch.notif_enabled = input.notifEnabled;
  if ("notifTime" in input) patch.notif_time = input.notifTime;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) throw error;
}
