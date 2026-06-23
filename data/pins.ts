// Data-access for pins — the ONLY module that imports the Supabase client for `pins`
// (architecture data-boundary rule). Features import from here, never raw Supabase.
// snake_case (DB) ↔ camelCase (domain) mapping happens here.
//
// A pin is the core memory unit: a named point (lat/lng) inside an admin-1 region.
// Durable-write contract (v1): a write resolves ONLY on Supabase ack — callers
// (Story 3.1) treat "saved" as ack-gated and retain-on-failure for a calm retry.
// Online writes only. Everything runs under owner-scoped RLS (user_id = auth.uid()).

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/supabase";

type PinRow = Database["public"]["Tables"]["pins"]["Row"];

export interface Pin {
  id: string;
  userId: string;
  name: string;
  lat: number;
  lng: number;
  countryCode: string | null;
  regionCode: string | null;
  note: string | null;
  memoryDate: string | null;
  exifTakenAt: string | null;
  muted: boolean;
  createdAt: string;
  updatedAt: string;
}

const toDomain = (r: PinRow): Pin => ({
  id: r.id,
  userId: r.user_id,
  name: r.name,
  lat: r.lat,
  lng: r.lng,
  countryCode: r.country_code,
  regionCode: r.region_code,
  note: r.note,
  memoryDate: r.memory_date,
  exifTakenAt: r.exif_taken_at,
  muted: r.muted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const COLUMNS =
  "id, user_id, name, lat, lng, country_code, region_code, note, memory_date, exif_taken_at, muted, created_at, updated_at";

/** All of the current user's pins (RLS scopes to this session). */
export async function listPins(): Promise<Pin[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("pins").select(COLUMNS);
  if (error) throw error;
  return ((data ?? []) as PinRow[]).map(toDomain);
}

/**
 * Drop a named pin. Resolves only after the server acks the write (durable-write
 * contract); throws on failure so the caller can retain + retry. RETURNS the created
 * row (with its server `id`) — pins need the id for the cache + future `['pin', id]`
 * and photo FKs (unlike `addRegionMark`, which returns void).
 */
export async function addPin(input: {
  name: string;
  lat: number;
  lng: number;
  regionCode: string | null;
  countryCode: string | null;
}): Promise<Pin> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error("No active session — cannot save a pin.");

  const row: Database["public"]["Tables"]["pins"]["Insert"] = {
    user_id: user.id, // must equal auth.uid() for the RLS insert check; never trust client input
    name: input.name,
    lat: input.lat,
    lng: input.lng,
    region_code: input.regionCode,
    country_code: input.countryCode,
  };

  const { data, error } = await supabase.from("pins").insert(row).select(COLUMNS).single();
  if (error) throw error;
  return toDomain(data as PinRow);
}

/**
 * Update a pin's note and/or date (Story 3.5). Only the fields present in `input` are
 * written (a note-only save must not null the date). RLS (`pins_owner_update`) scopes the
 * UPDATE to the owner — never trust a client `user_id`, and never touch it here. Stamps
 * `updated_at` (no DB moddatetime trigger). Resolves only on ack; throws on failure;
 * returns the updated row.
 */
export async function updatePin(input: {
  id: string;
  note?: string | null;
  memoryDate?: string | null;
}): Promise<Pin> {
  const supabase = createClient();
  const patch: Database["public"]["Tables"]["pins"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if ("note" in input) patch.note = input.note;
  if ("memoryDate" in input) patch.memory_date = input.memoryDate;

  const { data, error } = await supabase
    .from("pins")
    .update(patch)
    .eq("id", input.id)
    .select(COLUMNS)
    .single();
  if (error) throw error;
  return toDomain(data as PinRow);
}
