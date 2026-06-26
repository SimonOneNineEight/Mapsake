"use client";

import { useTranslations } from "next-intl";

// Shared durable-write status surface (Story 2.5 consolidation). One calm treatment + one set of
// zh-TW strings for EVERY write (region mark, pin, note/date edit, delete, region unmark). Per the
// durable-write contract: the success copy ("已儲存"/"已移除") shows ONLY after the server ack (never
// the optimistic fill), and a transient failure offers a calm retry — never an "unsaved/lost"
// message. Two layouts: the bottom-center map `pill` and the in-card `inline` line.
// (The polished auto-dismiss-on-success is still Epic 6 — kept minimal here.)

export type SavePhase = "idle" | "pending" | "success" | "error";
export type SaveKind = "save" | "delete" | "remove";

const PILL =
  "pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm shadow-[0_2px_10px_rgba(58,46,34,0.18)]";
const PILL_RETRY =
  "absolute bottom-6 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center rounded-full bg-card/95 px-4 py-1 text-sm text-[rgb(var(--terracotta-text))] shadow-[0_2px_10px_rgba(58,46,34,0.18)]";

export function SaveStatus({
  phase,
  onRetry,
  kind = "save",
  variant = "pill",
}: {
  phase: SavePhase;
  onRetry: () => void;
  kind?: SaveKind;
  variant?: "pill" | "inline";
}) {
  const t = useTranslations("saveStatus");
  if (phase === "idle") return null;
  const copy = {
    pending: t(`${kind}.pending`),
    success: t(`${kind}.success`),
    error: t(`${kind}.error`),
  };

  if (variant === "inline") {
    if (phase === "error")
      return (
        <button
          type="button"
          onClick={onRetry}
          className="self-start py-1 text-xs text-[rgb(var(--terracotta-text))]"
        >
          {copy.error}
        </button>
      );
    return (
      <p className="text-xs text-muted-foreground">
        {phase === "pending" ? copy.pending : copy.success}
      </p>
    );
  }

  // pill (map): non-interactive while pending/success; a tappable retry on failure.
  if (phase === "error")
    return (
      <button type="button" onClick={onRetry} className={PILL_RETRY}>
        {copy.error}
      </button>
    );
  return <div className={`${PILL} text-foreground`}>{phase === "pending" ? copy.pending : copy.success}</div>;
}
