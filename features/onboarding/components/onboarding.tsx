"use client";

/**
 * First-run default-view question (Story 4.1). Presentational: the shell owns the step + the
 * localStorage writes (the focus `countryCode` arrives at the shell from the map tap), so this
 * just renders the calm question card or the "tap a country" hint. No progress meter, no nag
 * (EXPERIENCE banned list); quiet keepsake tone, local-first (never asks for an account here).
 */
export function Onboarding({
  step,
  onChooseWorld,
  onChooseFocus,
  onBack,
  onDone,
}: {
  step: "question" | "pick" | "backfill";
  onChooseWorld: () => void;
  onChooseFocus: () => void;
  onBack: () => void; // leave pick mode → back to the question (escape an ocean/missed tap)
  onDone: () => void; // finish backfill → drop into the filled map (Story 4.3)
}) {
  if (step === "backfill") {
    // Non-blocking coaching layer (Story 4.3): map taps must pass through to MARK. A soft top
    // invitation + a "完成" to drop into the filled map. No count/meter/nag; never pushes memory.
    return (
      <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex flex-col items-center gap-2">
        <p className="rounded-full bg-card/95 px-4 py-1.5 text-sm text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]">
          輕觸你去過的地方來上色
        </p>
        <button
          type="button"
          onClick={onDone}
          className="pointer-events-auto rounded-full bg-[rgb(var(--terracotta-text))] px-4 py-1.5 text-sm text-[rgb(var(--surface))]"
        >
          完成
        </button>
      </div>
    );
  }

  if (step === "pick") {
    // Non-blocking row — the map tap that picks a country must pass through. The hint +
    // the "back" escape opt back into pointer events so an ocean/missed tap isn't a dead-end.
    return (
      <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex flex-col items-center gap-2">
        <p className="rounded-full bg-card/95 px-4 py-1.5 text-sm text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]">
          輕觸地圖上的一個國家
        </p>
        <button
          type="button"
          onClick={onBack}
          className="pointer-events-auto text-sm text-[rgb(var(--terracotta-text))] hover:underline"
        >
          ← 返回
        </button>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="absolute inset-0 z-30 grid place-items-center bg-[rgb(var(--map-frame))]/70 p-6"
    >
      <div className="flex w-full max-w-sm flex-col gap-5 rounded-md bg-card p-6 shadow-[0_4px_16px_rgba(58,46,34,0.18)]">
        <div className="flex flex-col gap-1">
          <h2 id="onboarding-title" className="font-serif text-xl font-medium text-foreground">
            先從哪裡開始看？
          </h2>
          <p className="text-sm text-muted-foreground">你隨時可以在設定裡更改。</p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={onChooseWorld}
            className="rounded-md border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:bg-accent"
          >
            看整個世界
          </button>
          <button
            type="button"
            onClick={onChooseFocus}
            className="rounded-md border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:bg-accent"
          >
            先看一個國家
          </button>
        </div>
      </div>
    </div>
  );
}
