import { test, expect } from "./fixtures";
import { buildExportPayload } from "../data/export";

// Story 2.6 — export my data. The payload builder is pure (no browser/Supabase — type-only imports),
// so it's tested in Node like the roll-up derivations. It must wrap the user's own rows in a
// versioned envelope, keep notes/dates + nulls faithfully (round-trippable), and reduce photos to
// REFERENCES (storage_path), never binaries. (The signed-in trigger + the actual file download are
// wired in the account sheet and are a manual check — the e2e harness is anon-only, no permanent
// session — the same limitation noted for the 2-3 signed-in path.)

const meta = { userId: "user-1", exportedAt: "2026-06-25T00:00:00.000Z" };

test.describe("buildExportPayload (export envelope)", () => {
  test("wraps rows in a versioned envelope and strips the per-row userId", () => {
    const payload = buildExportPayload(
      [
        {
          userId: "user-1",
          level: "admin1",
          regionCode: "JP-26",
          countryCode: "JP",
          createdAt: "2026-06-01T00:00:00Z",
        },
      ],
      [
        {
          id: "p1",
          userId: "user-1",
          name: "Kyoto",
          lat: 35,
          lng: 135,
          countryCode: "JP",
          regionCode: "JP-26",
          note: "lovely",
          memoryDate: "2024-04-01",
          exifTakenAt: null,
          muted: false,
          createdAt: "2026-06-01T00:00:00Z",
          updatedAt: "2026-06-02T00:00:00Z",
        },
      ],
      [
        {
          id: "ph1",
          pinId: "p1",
          userId: "user-1",
          storagePath: "user-1/p1/ph1.webp",
          width: 800,
          height: 600,
          takenAt: null,
          sortOrder: 0,
          createdAt: "2026-06-01T00:00:00Z",
        },
      ],
      meta,
    );

    expect(payload.mapsakeExportVersion).toBe(1);
    expect(payload.exportedAt).toBe(meta.exportedAt);
    expect(payload.userId).toBe("user-1");
    // The per-row userId is stripped (it's at the envelope level).
    expect(payload.regionMarks[0]).not.toHaveProperty("userId");
    expect(payload.pins[0]).not.toHaveProperty("userId");
    // Notes + dates are preserved.
    expect(payload.pins[0].note).toBe("lovely");
    expect(payload.pins[0].memoryDate).toBe("2024-04-01");
    // Photos are REFERENCES (storage_path), never binaries / signed URLs.
    expect(payload.photos[0].storagePath).toBe("user-1/p1/ph1.webp");
    expect(payload.photos[0]).not.toHaveProperty("url");
    expect(JSON.stringify(payload)).not.toContain("blob");
  });

  test("preserves nulls faithfully (round-trippable)", () => {
    const payload = buildExportPayload(
      [],
      [
        {
          id: "p2",
          userId: "u",
          name: "x",
          lat: 0,
          lng: 0,
          countryCode: null,
          regionCode: null,
          note: null,
          memoryDate: null,
          exifTakenAt: null,
          muted: false,
          createdAt: "t",
          updatedAt: "t",
        },
      ],
      [],
      meta,
    );
    expect(payload.pins[0].note).toBeNull();
    expect(payload.pins[0].memoryDate).toBeNull();
    expect(payload.pins[0].countryCode).toBeNull();
  });

  test("empty input → a valid empty envelope (only what's passed in)", () => {
    const payload = buildExportPayload([], [], [], meta);
    expect(payload.regionMarks).toEqual([]);
    expect(payload.pins).toEqual([]);
    expect(payload.photos).toEqual([]);
    expect(payload.mapsakeExportVersion).toBe(1);
  });
});
