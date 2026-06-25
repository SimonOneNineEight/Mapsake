import type { EligibleMemory } from "./eligibility";

// Push payload composition (Story 5.3) — pure string building, the one CI-testable piece of the
// sender. The copy IS the memory, never an engagement nag (EXPERIENCE 116, 130): an anniversary
// ("N 年前的今天：京都"), a created-tier age ("N 年前加入：…"), or a gentle rediscovery ("重溫：…").
// When more memories share the day, a quiet "N more" hint rides along for the 5-4 landing. The
// payload shape { title, body, url } MUST match app/sw.ts (it reads payload.title/body, data.url).
// zh-TW drafts — the native-copy pass is Story 6-1.

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export function buildPushPayload(memory: EligibleMemory): PushPayload {
  const base =
    memory.tier === "rediscovery"
      ? `重溫：${memory.name}`
      : memory.tier === "created"
        ? `${memory.yearsAgo} 年前加入：${memory.name}`
        : `${memory.yearsAgo} 年前的今天：${memory.name}`; // explicit + exif anniversaries

  const body =
    memory.othersFromThisDayCount > 0
      ? `${base}（這天還有 ${memory.othersFromThisDayCount} 個回憶）`
      : base;

  return {
    title: "Mapsake",
    body,
    url: `/?pin=${memory.pinId}`,
  };
}
