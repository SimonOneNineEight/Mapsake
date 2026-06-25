import { test, expect } from "./fixtures";
import {
  selectMemoryForDay,
  memoriesSharingDay,
  type MemoryCandidate,
} from "../features/notifications/lib/eligibility";

// Story 5.2 — the re-live eligibility engine, exercised in Node (the rollup pattern; no browser).
// Pure + deterministic: the target day, the rediscovery cadence state, and the random `pick` are all
// passed in, so every tier and tie-break is asserted exactly. The engine sends nothing (that is 5-3).

const TODAY = "2026-06-25";

const cand = (over: Partial<MemoryCandidate>): MemoryCandidate => ({
  id: "p1",
  name: "京都",
  lat: 35,
  lng: 135,
  regionCode: "JP-26",
  countryCode: "JP",
  memoryDate: null,
  exifTakenAt: null,
  createdAt: "2020-01-01T00:00:00Z", // old, Jan-1 — never an anniversary of TODAY unless overridden
  muted: false,
  ...over,
});

test.describe("selectMemoryForDay — tiers 1-3 (anniversary)", () => {
  test("tier 1: explicit memoryDate anniversary → 'explicit', correct yearsAgo", () => {
    const r = selectMemoryForDay([cand({ memoryDate: "2024-06-25" })], { today: TODAY });
    expect(r?.tier).toBe("explicit");
    expect(r?.yearsAgo).toBe(2);
    expect(r?.pinId).toBe("p1");
    expect(r?.othersFromThisDayCount).toBe(0);
  });

  test("tier 2: no memoryDate but EXIF date anniversary → 'exif'", () => {
    const r = selectMemoryForDay([cand({ exifTakenAt: "2023-06-25T12:00:00Z" })], { today: TODAY });
    expect(r?.tier).toBe("exif");
    expect(r?.yearsAgo).toBe(3);
  });

  test("tier 3: no date at all → createdAt anniversary surfaced as 'created'", () => {
    const r = selectMemoryForDay([cand({ createdAt: "2022-06-25T08:00:00Z" })], { today: TODAY });
    expect(r?.tier).toBe("created");
    expect(r?.yearsAgo).toBe(4);
  });

  test("a same-YEAR same-month-day match is NOT an anniversary (yearsAgo 0 → no fire)", () => {
    // memoryDate this year, created this year (so not in the rediscovery pool), no recent rediscovery.
    const r = selectMemoryForDay(
      [cand({ memoryDate: "2026-06-25", createdAt: "2026-06-25T00:00:00Z" })],
      { today: TODAY, lastRediscoveryAt: null },
    );
    expect(r).toBeNull();
  });
});

test.describe("selectMemoryForDay — precedence + match guards", () => {
  // effectiveDate uses the FIRST present signal only (not "any matching date"). A higher-priority
  // date that misses must shadow a lower-priority one that would hit — locks the precedence contract
  // against a silent refactor to "try each signal until one hits". lastRediscoveryAt is recent so the
  // fall-through is asserted as a quiet null, not a tier-4 rediscovery (default createdAt is old).
  test("a higher-priority date that misses shadows a lower-priority date that would hit", () => {
    const r = selectMemoryForDay(
      [cand({ memoryDate: "2024-01-10", exifTakenAt: "2023-06-25T12:00:00Z" })],
      { today: TODAY, lastRediscoveryAt: "2026-06-20T00:00:00Z" },
    );
    expect(r).toBeNull();
  });

  test("the chosen tier is the highest-priority present signal even when a lower one misses", () => {
    const r = selectMemoryForDay(
      [cand({ memoryDate: "2024-06-25", exifTakenAt: "2023-01-10T12:00:00Z" })],
      { today: TODAY },
    );
    expect(r?.tier).toBe("explicit");
    expect(r?.yearsAgo).toBe(2);
  });

  // Same day-of-month, wrong month → no hit (the month component of the match is enforced).
  test("a same-day-of-month but wrong-month date is NOT an anniversary", () => {
    const r = selectMemoryForDay([cand({ memoryDate: "2024-07-25" })], {
      today: TODAY,
      lastRediscoveryAt: "2026-06-20T00:00:00Z",
    });
    expect(r).toBeNull();
  });
});

test.describe("selectMemoryForDay — mute + selection", () => {
  test("a muted pin that would otherwise hit is excluded", () => {
    const r = selectMemoryForDay(
      [cand({ memoryDate: "2024-06-25", muted: true, createdAt: "2026-06-01T00:00:00Z" })],
      { today: TODAY, lastRediscoveryAt: "2026-06-20T00:00:00Z" }, // recent → no rediscovery either
    );
    expect(r).toBeNull();
  });

  test("multiple same-day hits → ONE winner (oldest effective date) + others hinted", () => {
    const r = selectMemoryForDay(
      [
        cand({ id: "p1", memoryDate: "2024-06-25" }), // 2y
        cand({ id: "p2", memoryDate: "2021-06-25" }), // 5y — oldest, should win
        cand({ id: "p3", memoryDate: "2025-06-25" }), // 1y
      ],
      { today: TODAY },
    );
    expect(r?.pinId).toBe("p2");
    expect(r?.yearsAgo).toBe(5);
    expect(r?.othersFromThisDayCount).toBe(2);
  });

  test("photos break a tie between equal yearsAgo (lead somewhere visual)", () => {
    const r = selectMemoryForDay(
      [
        cand({ id: "a", memoryDate: "2023-06-25", hasPhotos: false }),
        cand({ id: "z", memoryDate: "2023-06-25", hasPhotos: true }),
      ],
      { today: TODAY },
    );
    expect(r?.pinId).toBe("z");
    expect(r?.othersFromThisDayCount).toBe(1);
  });
});

test.describe("selectMemoryForDay — tier 4 (monthly rediscovery)", () => {
  test("no anniversary + no recent rediscovery → picks from the older pool via the injected pick", () => {
    const r = selectMemoryForDay(
      [
        cand({ id: "old-a", createdAt: "2019-01-01T00:00:00Z" }),
        cand({ id: "old-b", createdAt: "2018-01-01T00:00:00Z" }),
      ],
      { today: TODAY, lastRediscoveryAt: null, pick: (items) => items[1] },
    );
    expect(r?.pinId).toBe("old-b");
    expect(r?.tier).toBe("rediscovery");
    expect(r?.yearsAgo).toBeNull();
    expect(r?.othersFromThisDayCount).toBe(0);
  });

  test("rediscovery is suppressed within the cadence window (recent lastRediscoveryAt)", () => {
    const r = selectMemoryForDay([cand({ createdAt: "2019-01-01T00:00:00Z" })], {
      today: TODAY,
      lastRediscoveryAt: "2026-06-10T00:00:00Z", // 15 days ago < 30 → not due
    });
    expect(r).toBeNull();
  });

  test("brand-new pins are not rediscovery-eligible (younger than the min age)", () => {
    const r = selectMemoryForDay([cand({ createdAt: "2026-06-20T00:00:00Z" })], {
      today: TODAY,
      lastRediscoveryAt: null,
    });
    expect(r).toBeNull();
  });
});

test.describe("memoriesSharingDay (Story 5.5 cohort)", () => {
  test("includes another pin with the same anniversary month-day (any year)", () => {
    const out = memoriesSharingDay(
      [
        cand({ id: "target", memoryDate: "2024-06-25" }),
        cand({ id: "sibling", memoryDate: "2019-06-25" }),
      ],
      "target",
    );
    expect(out.map((c) => c.id)).toEqual(["sibling"]);
  });

  test("excludes the target itself, different-month, and muted pins", () => {
    const out = memoriesSharingDay(
      [
        cand({ id: "target", memoryDate: "2024-06-25" }),
        cand({ id: "other-month", memoryDate: "2024-07-25" }),
        cand({ id: "muted-same-day", memoryDate: "2024-06-25", muted: true }),
      ],
      "target",
    );
    expect(out).toEqual([]);
  });

  test("matches on the effective date across tiers (EXIF/created), oldest first", () => {
    const out = memoriesSharingDay(
      [
        cand({ id: "target", memoryDate: "2024-06-25" }),
        cand({ id: "by-exif", exifTakenAt: "2021-06-25T10:00:00Z" }), // 2021
        cand({ id: "by-created", createdAt: "2018-06-25T10:00:00Z" }), // 2018 — oldest
      ],
      "target",
    );
    expect(out.map((c) => c.id)).toEqual(["by-created", "by-exif"]);
  });

  test("no siblings → empty; unknown target → empty", () => {
    expect(memoriesSharingDay([cand({ id: "lonely", memoryDate: "2024-06-25" })], "lonely")).toEqual([]);
    expect(memoriesSharingDay([cand({ id: "a" })], "missing")).toEqual([]);
  });
});

test.describe("selectMemoryForDay — empty cases", () => {
  test("no candidates → null", () => {
    expect(selectMemoryForDay([], { today: TODAY, lastRediscoveryAt: null })).toBeNull();
  });

  test("all candidates muted → null", () => {
    const r = selectMemoryForDay(
      [cand({ memoryDate: "2024-06-25", muted: true }), cand({ id: "p2", muted: true })],
      { today: TODAY, lastRediscoveryAt: null },
    );
    expect(r).toBeNull();
  });
});
