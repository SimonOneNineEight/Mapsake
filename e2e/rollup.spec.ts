import { test, expect } from "@playwright/test";
import { computeVisitedKeys } from "../features/map/lib/visited";

// Story 1.6 — visited roll-up. These exercise the pure key-derivation in Node (no browser):
// a marked admin-1 region lights its parent country; a country mark never cascades down.

test.describe("computeVisitedKeys (roll-up)", () => {
  test("an admin-1 mark lights its region AND its parent country", () => {
    const keys = computeVisitedKeys([{ regionCode: "JP-26", countryCode: "JP", level: "admin1" }]);
    expect([...keys].sort()).toEqual(["countries|JP", "regions|JP-26"]);
  });

  test("a country mark lights only the country — no downward cascade", () => {
    const keys = computeVisitedKeys([{ regionCode: "MN", countryCode: "MN", level: "country" }]);
    expect([...keys]).toEqual(["countries|MN"]);
    expect([...keys].some((k) => k.startsWith("regions|"))).toBe(false);
  });

  test("two admin-1 marks in one country dedupe to a single country key", () => {
    const keys = computeVisitedKeys([
      { regionCode: "JP-26", countryCode: "JP", level: "admin1" },
      { regionCode: "JP-13", countryCode: "JP", level: "admin1" },
    ]);
    expect([...keys].filter((k) => k.startsWith("countries|"))).toEqual(["countries|JP"]); // exactly one country key
    expect(keys.size).toBe(3); // regions|JP-26, regions|JP-13, countries|JP
  });

  test("removing the last contributing admin-1 mark drops the country roll-up", () => {
    expect(computeVisitedKeys([{ regionCode: "JP-26", countryCode: "JP", level: "admin1" }]).has("countries|JP")).toBe(true);
    expect(computeVisitedKeys([]).size).toBe(0);
  });

  test("an admin-1 mark with no countryCode adds no malformed country key", () => {
    const keys = computeVisitedKeys([{ regionCode: "JP-26", level: "admin1" }]);
    expect([...keys]).toEqual(["regions|JP-26"]);
    expect([...keys].some((k) => k.startsWith("countries|"))).toBe(false);
  });
});
