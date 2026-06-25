import { test, expect } from "./fixtures";
import { buildPushPayload } from "../features/notifications/lib/push-copy";
import type { EligibleMemory } from "../features/notifications/lib/eligibility";

// Story 5.3 — push payload composition, the one CI-testable piece of the sender (Node, rollup
// pattern). The copy is the memory itself per tier; the title + data.url must match app/sw.ts. The
// service-role reads, the real web-push send, the cron auth, and the daily ceiling need the gated
// manual checklist (service role + VAPID keys + deployed cron + a live device).

const memory = (over: Partial<EligibleMemory>): EligibleMemory => ({
  pinId: "p1",
  name: "京都",
  lat: 35,
  lng: 135,
  regionCode: "JP-26",
  countryCode: "JP",
  tier: "explicit",
  yearsAgo: 2,
  othersFromThisDayCount: 0,
  ...over,
});

test.describe("buildPushPayload", () => {
  test("anniversary (explicit) → 'N 年前的今天：name'", () => {
    const p = buildPushPayload(memory({ tier: "explicit", yearsAgo: 2 }));
    expect(p.title).toBe("Mapsake");
    expect(p.body).toBe("2 年前的今天：京都");
    expect(p.url).toBe("/?pin=p1");
  });

  test("anniversary (exif) uses the same 'N 年前的今天' framing", () => {
    const p = buildPushPayload(memory({ tier: "exif", yearsAgo: 3 }));
    expect(p.body).toBe("3 年前的今天：京都");
  });

  test("created tier → 'N 年前加入：name'", () => {
    const p = buildPushPayload(memory({ tier: "created", yearsAgo: 4 }));
    expect(p.body).toBe("4 年前加入：京都");
  });

  test("rediscovery → '重溫：name' (no yearsAgo)", () => {
    const p = buildPushPayload(memory({ tier: "rediscovery", yearsAgo: null }));
    expect(p.body).toBe("重溫：京都");
  });

  test("othersFromThisDayCount > 0 appends the 'N more' hint", () => {
    const p = buildPushPayload(memory({ tier: "explicit", yearsAgo: 2, othersFromThisDayCount: 3 }));
    expect(p.body).toBe("2 年前的今天：京都（這天還有 3 個回憶）");
  });

  test("no hint when nothing else shares the day", () => {
    const p = buildPushPayload(memory({ othersFromThisDayCount: 0 }));
    expect(p.body).not.toContain("這天還有");
  });

  test("url deep-links to the pin", () => {
    expect(buildPushPayload(memory({ pinId: "abc-123" })).url).toBe("/?pin=abc-123");
  });
});
