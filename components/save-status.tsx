"use client";

// Shared durable-write status surface (Story 2.5 consolidation). One calm treatment + one set of
// zh-TW strings for EVERY write (region mark, pin, note/date edit, delete, region unmark). Per the
// durable-write contract: the success copy ("已儲存"/"已移除") shows ONLY after the server ack (never
// the optimistic fill), and a transient failure offers a calm retry — never an "unsaved/lost"
// message. Two layouts: the bottom-center map `pill` and the in-card `inline` line.
// (The polished auto-dismiss-on-success is still Epic 6 — kept minimal here.)

export type SavePhase = "idle" | "pending" | "success" | "error";
export type SaveKind = "save" | "delete" | "remove";

const COPY: Record<SaveKind, { pending: string; success: string; error: string }> = {
  save: { pending: "儲存中…", success: "已儲存", error: "無法儲存，重試" },
  delete: { pending: "刪除中…", success: "已刪除", error: "無法刪除，重試" },
  remove: { pending: "移除中…", success: "已移除", error: "無法移除，重試" },
};

const PILL =
  "pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm shadow-[0_2px_10px_rgba(58,46,34,0.18)]";
const PILL_RETRY =
  "absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm text-[rgb(var(--terracotta-text))] shadow-[0_2px_10px_rgba(58,46,34,0.18)]";

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
  if (phase === "idle") return null;
  const copy = COPY[kind];

  if (variant === "inline") {
    if (phase === "error")
      return (
        <button
          type="button"
          onClick={onRetry}
          className="self-start text-xs text-[rgb(var(--terracotta-text))]"
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
