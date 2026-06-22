"use client";

export type MarkPhase = "idle" | "pending" | "success" | "error";

/**
 * Quiet, non-blocking write affordance for marking. Per the durable-write contract,
 * "已儲存" (saved) shows ONLY after the server ack (not on the optimistic fill); a
 * transient failure offers a calm 重試 (retry), never an "unsaved/lost" message.
 * Minimal v1 treatment — the polished (auto-dismissing) version is Epic 6.
 */
export function MarkStatus({
  phase,
  onRetry,
}: {
  phase: MarkPhase;
  onRetry: () => void;
}) {
  const base =
    "pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]";

  if (phase === "pending") return <div className={base}>儲存中…</div>;

  if (phase === "error")
    return (
      <button
        type="button"
        onClick={onRetry}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-card/95 px-3 py-1 text-sm text-[rgb(var(--terracotta-text))] shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
      >
        無法儲存，重試
      </button>
    );

  if (phase === "success") return <div className={base}>已儲存</div>;

  return null;
}
