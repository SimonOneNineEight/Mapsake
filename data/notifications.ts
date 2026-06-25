// Admin (service-role) data-access for the on-this-day sender (Story 5.3). SERVER-ONLY — these are
// the only ALL-USERS reads in the app, and they exist solely for the scheduled job. They use the
// RLS-bypassing admin client (lib/supabase/admin.ts), so they must never be reachable from client
// code. snake_case (DB) ↔ camelCase (domain) mapping happens here, as in the anon data/* modules.

import { createAdminClient } from "@/lib/supabase/admin";
import type { MemoryCandidate } from "@/features/notifications/lib/eligibility";

export interface NotifiableUser {
  id: string;
  lastNotifiedAt: string | null;
  lastRediscoveryAt: string | null;
}

export interface DeviceSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Every user who has notifications enabled, with their notification ledger. */
export async function listNotifiableUsers(): Promise<NotifiableUser[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, last_notified_at, last_rediscovery_at")
    .eq("notif_enabled", true);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    lastNotifiedAt: r.last_notified_at,
    lastRediscoveryAt: r.last_rediscovery_at,
  }));
}

/** One user's pins as eligibility candidates (hasPhotos omitted → the engine's exifTakenAt proxy). */
export async function getUserPins(userId: string): Promise<MemoryCandidate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pins")
    .select("id, name, lat, lng, country_code, region_code, memory_date, exif_taken_at, muted, created_at")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    lat: r.lat,
    lng: r.lng,
    countryCode: r.country_code,
    regionCode: r.region_code,
    memoryDate: r.memory_date,
    exifTakenAt: r.exif_taken_at,
    createdAt: r.created_at,
    muted: r.muted,
  }));
}

/** One user's device push subscriptions (the send targets). */
export async function getUserSubscriptions(userId: string): Promise<DeviceSubscription[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => ({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }));
}

/** Stamp the ledger after a successful send: always last_notified_at; last_rediscovery_at on a tier-4. */
export async function recordNotified(
  userId: string,
  opts: { rediscovery: boolean; now: string },
): Promise<void> {
  const supabase = createAdminClient();
  const patch: { last_notified_at: string; last_rediscovery_at?: string } = {
    last_notified_at: opts.now,
  };
  if (opts.rediscovery) patch.last_rediscovery_at = opts.now;
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

/** Prune a dead device subscription (web-push returned 404/410 Gone). */
export async function deleteSubscription(endpoint: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
