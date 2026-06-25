import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

export interface PushSubscriptionInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Store this device's Web Push subscription (Story 5.1). Owner-scoped RLS insert via the anon
 * client — NOT a service-role route: storing your OWN subscription is a plain owner write (the
 * SEND path that reads all users' subscriptions is Story 5.3). Upsert keyed on the UNIQUE
 * `endpoint` so a re-subscribe / VAPID-key rotation overwrites the same device row instead of
 * duplicating. Throws on failure so the caller can surface a calm retry.
 */
export async function upsertPushSubscription(input: PushSubscriptionInput): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No active session — cannot save a push subscription.");

  const row: Database["public"]["Tables"]["push_subscriptions"]["Insert"] = {
    user_id: user.id, // must equal auth.uid() for the RLS insert check; never trust client input
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  };

  const { error } = await supabase.from("push_subscriptions").upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}
