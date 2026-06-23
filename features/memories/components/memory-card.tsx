"use client";

import type { Pin } from "@/data/pins";

/**
 * The memory card (Story 3.4) — TITLE ONLY. The pin's name is always shown; date, note,
 * and photos arrive in Stories 3.5/3.6. Per EXPERIENCE, the card must read complete with
 * the title alone: no empty slots, no "Date: —", no placeholders. The quiet
 * "+ 寫筆記 / + 加照片 / + 加日期" affordances belong to the later stories, not here.
 */
export function MemoryCard({ pin }: { pin: Pin }) {
  return (
    <div className="min-w-0">
      <h2 className="font-serif text-2xl font-medium text-foreground">{pin.name}</h2>
    </div>
  );
}
