// Re-live eligibility engine (Story 5.2) — the BRAIN of the re-live loop, not its trigger.
//
// Given ONE user's pins and a target day, decide which single memory (if any) should resurface,
// across four tiers in priority order (EXPERIENCE.md 120-127; architecture 168-169):
//   1. explicit `memoryDate`     → fires on the anniversary ("兩年前的今天")
//   2. else `exifTakenAt`        → first photo's EXIF date as the anniversary (denormalized on the pin)
//   3. else `createdAt`          → entry-created anniversary, framed as "added N years ago"
//   4. no anniversary today      → gentle "rediscovery" of a random OLDER place, on a ≈monthly cadence
// Muted pins never qualify. Dates stay fully optional — tiers 3-4 keep the engine from ever going
// silent for no-date users. At most ONE memory is returned (the 1/day ceiling is structural).
//
// PURE + DETERMINISTIC: the target day, the cadence state, and the random `pick` are passed IN — no
// Date.now(), no Math.random(), no DB access here. The CRON trigger, the service-role read of all
// users, the web-push send, and where `lastRediscoveryAt` is stored are Story 5-3; the deep-link
// landing + "N more from this day" rendering are 5-4/5-5; mute/delivery-time/global-off are 5-6.
//
// `Pin` (data/pins.ts) is structurally assignable to `MemoryCandidate` (+ optional `hasPhotos`),
// but this module imports nothing from the data layer so it stays Node-unit-testable.

/** Slow cadence for tier-4 rediscovery: at most one rediscovery per this many days. */
export const REDISCOVERY_INTERVAL_DAYS = 30;
/** A pin must be at least this old to be "rediscovered" (brand-new pins aren't resurfaced). */
export const REDISCOVERY_MIN_AGE_DAYS = 90;

const MS_PER_DAY = 86_400_000;

export interface MemoryCandidate {
  id: string;
  name: string;
  lat: number;
  lng: number;
  regionCode: string | null;
  countryCode: string | null;
  memoryDate: string | null; // plain YYYY-MM-DD
  exifTakenAt: string | null; // ISO timestamptz (first photo's EXIF capture)
  createdAt: string; // ISO timestamptz
  muted: boolean;
  /** Optional tiebreaker hint; defaults to `exifTakenAt != null` as a proxy when absent. */
  hasPhotos?: boolean;
}

export type MemoryTier = "explicit" | "exif" | "created" | "rediscovery";

export interface EligibleMemory {
  pinId: string;
  name: string;
  lat: number;
  lng: number;
  regionCode: string | null;
  countryCode: string | null;
  tier: MemoryTier;
  /** Years since the effective date for an anniversary; null for a rediscovery (no anniversary). */
  yearsAgo: number | null;
  /** Other pins whose anniversary also hit today (0 for a rediscovery) — the "N more" hint. */
  othersFromThisDayCount: number;
}

export interface EligibilityContext {
  /** The target day, YYYY-MM-DD (or any ISO; only the UTC calendar date is used). */
  today: string;
  /** ISO timestamp of this user's last rediscovery push; null/absent if none yet. */
  lastRediscoveryAt?: string | null;
  /** Injected selection for the rediscovery pool (default: oldest, then id) — keeps the engine pure. */
  pick?: (items: MemoryCandidate[]) => MemoryCandidate;
}

// UTC calendar parts. v1 compares the UTC date for the month-day match; per-user delivery timezone
// is a 5-3/5-6 refinement. memoryDate ("YYYY-MM-DD") parses as UTC midnight, so the parts line up.
function dateParts(iso: string): { y: number; m: number; d: number } {
  const dt = new Date(iso);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), d: dt.getUTCDate() };
}

function daysBetween(laterIso: string, earlierIso: string): number {
  return Math.floor((new Date(laterIso).getTime() - new Date(earlierIso).getTime()) / MS_PER_DAY);
}

// The effective anniversary date + its tier, by signal priority.
function effectiveDate(c: MemoryCandidate): { iso: string; tier: "explicit" | "exif" | "created" } {
  if (c.memoryDate) return { iso: c.memoryDate, tier: "explicit" };
  if (c.exifTakenAt) return { iso: c.exifTakenAt, tier: "exif" };
  return { iso: c.createdAt, tier: "created" };
}

// Month-day match, at least one whole year ago (a same-year match is not an anniversary).
// Note (v1 edge): a Feb-29 effective date only hits on leap-year targets — acceptable for now.
function anniversary(effIso: string, todayIso: string): { hit: boolean; yearsAgo: number } {
  const e = dateParts(effIso);
  const t = dateParts(todayIso);
  const yearsAgo = t.y - e.y;
  return { hit: e.m === t.m && e.d === t.d && yearsAgo >= 1, yearsAgo };
}

const hasPhotos = (c: MemoryCandidate): boolean => c.hasPhotos ?? c.exifTakenAt != null;

const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function defaultPick(items: MemoryCandidate[]): MemoryCandidate {
  return [...items].sort(
    (a, b) => byString(a.createdAt, b.createdAt) || byString(a.id, b.id),
  )[0];
}

function toEligible(
  c: MemoryCandidate,
  tier: MemoryTier,
  yearsAgo: number | null,
  others: number,
): EligibleMemory {
  return {
    pinId: c.id,
    name: c.name,
    lat: c.lat,
    lng: c.lng,
    regionCode: c.regionCode,
    countryCode: c.countryCode,
    tier,
    yearsAgo,
    othersFromThisDayCount: others,
  };
}

/**
 * The one memory (if any) to resurface for `ctx.today`, or null for a legitimately quiet day.
 * Anniversaries (tiers 1-3) fire first; otherwise a tier-4 rediscovery fills the quiet stretch on a
 * slow cadence. Returns at most one result — the daily ceiling is structural.
 */
export function selectMemoryForDay(
  candidates: MemoryCandidate[],
  ctx: EligibilityContext,
): EligibleMemory | null {
  const active = candidates.filter((c) => !c.muted);

  // Tiers 1-3: anniversaries hitting today.
  const hits = active
    .map((c) => {
      const ed = effectiveDate(c);
      const a = anniversary(ed.iso, ctx.today);
      return { c, tier: ed.tier as MemoryTier, hit: a.hit, yearsAgo: a.yearsAgo };
    })
    .filter((x) => x.hit);

  if (hits.length > 0) {
    // Oldest wins (most years-ago); photos as the secondary tiebreaker; id for a stable final order.
    hits.sort(
      (a, b) =>
        b.yearsAgo - a.yearsAgo ||
        (hasPhotos(b.c) === hasPhotos(a.c) ? 0 : hasPhotos(b.c) ? 1 : -1) ||
        byString(a.c.id, b.c.id),
    );
    const winner = hits[0];
    return toEligible(winner.c, winner.tier, winner.yearsAgo, hits.length - 1);
  }

  // Tier 4: monthly rediscovery — only when due and there is an older place to resurface.
  const dueForRediscovery =
    ctx.lastRediscoveryAt == null ||
    daysBetween(ctx.today, ctx.lastRediscoveryAt) >= REDISCOVERY_INTERVAL_DAYS;
  if (!dueForRediscovery) return null;

  const pool = active.filter(
    (c) => daysBetween(ctx.today, c.createdAt) >= REDISCOVERY_MIN_AGE_DAYS,
  );
  if (pool.length === 0) return null;

  const chosen = (ctx.pick ?? defaultPick)(pool);
  return toEligible(chosen, "rediscovery", null, 0);
}

/**
 * Other memories sharing the target's anniversary day — the "N more from this day" cohort for the
 * re-live landing (Story 5.5). Same effective-date MONTH-DAY as the target (reusing the same
 * priority as the engine, so it matches what the sender grouped), excluding the target itself and
 * muted pins. Stable order (oldest effective date first, then id) so cohort cycling is deterministic.
 * Pure — no clock, no DB.
 */
export function memoriesSharingDay(
  candidates: MemoryCandidate[],
  targetId: string,
): MemoryCandidate[] {
  const target = candidates.find((c) => c.id === targetId);
  if (!target) return [];
  const t = dateParts(effectiveDate(target).iso);
  return candidates
    .filter((c) => c.id !== targetId && !c.muted)
    .filter((c) => {
      const e = dateParts(effectiveDate(c).iso);
      return e.m === t.m && e.d === t.d;
    })
    .sort((a, b) => byString(effectiveDate(a).iso, effectiveDate(b).iso) || byString(a.id, b.id));
}
