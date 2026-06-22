// Data-access for region marks — the ONLY module that imports the Supabase client
// for `region_marks` (architecture data-boundary rule). Features import from here,
// never raw Supabase. snake_case (DB) ↔ camelCase (domain) mapping happens here.
//
// Durable-write contract (v1): a write resolves ONLY on Supabase ack — callers
// (Story 1.5) treat "saved" as ack-gated and retain-on-failure for a calm retry.
// Online writes only; no optimistic persistence and no offline outbox here.
// Everything runs under owner-scoped RLS (user_id = auth.uid()); no service-role.

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type RegionMarkRow = Database["public"]["Tables"]["region_marks"]["Row"];

export type RegionLevel = "country" | "admin1";

export interface RegionMark {
  userId: string;
  level: RegionLevel;
  regionCode: string;
  countryCode: string;
  createdAt: string;
}

const toDomain = (r: RegionMarkRow): RegionMark => ({
  userId: r.user_id,
  level: r.level as RegionLevel,
  regionCode: r.region_code,
  countryCode: r.country_code,
  createdAt: r.created_at,
});

const COLUMNS = "user_id, level, region_code, country_code, created_at";

/** All of the current user's explicit region marks (RLS scopes to this session). */
export async function listRegionMarks(): Promise<RegionMark[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("region_marks").select(COLUMNS);
  if (error) throw error;
  return ((data ?? []) as RegionMarkRow[]).map(toDomain);
}

/**
 * Mark a region visited. Re-marking the same region+level is a no-op (composite PK).
 * Resolves only after the server acks the write (durable-write contract); throws on
 * failure so the caller can retain + retry. Returns nothing — `listRegionMarks` is the
 * source of truth for the stored row (incl. its server `created_at`).
 */
export async function addRegionMark(input: {
  level: RegionLevel;
  regionCode: string;
  countryCode: string;
}): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No active session — cannot save a mark.");

  const row: Database["public"]["Tables"]["region_marks"]["Insert"] = {
    user_id: user.id, // must equal auth.uid() for the RLS insert check; never trust client input
    level: input.level,
    region_code: input.regionCode,
    country_code: input.countryCode,
  };

  const { error } = await supabase
    .from("region_marks")
    .upsert(row, { onConflict: "user_id,region_code,level", ignoreDuplicates: true });
  if (error) throw error;
}

/** Remove an explicit mark (unmark). RLS scopes the delete to the current user. */
export async function removeRegionMark(input: {
  regionCode: string;
  level: RegionLevel;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("region_marks")
    .delete()
    .eq("region_code", input.regionCode)
    .eq("level", input.level);
  if (error) throw error;
}
