"use client";

import { usePushSubscribe } from "../hooks/use-push-subscribe";

// "Enable memory notifications" (Story 5.1). A quiet rider in the account sheet's signed-in body
// (beside export + sign-out) — never a gate or a nag. Self-contained so Settings (Story 6-3) can
// re-mount the same affordance. Capability-gated: unsupported/loading → render nothing; iOS-not-
// installed → a calm install line; otherwise the enable link, reflecting granted/denied/error calmly.
// Asks OS permission ONLY on the tap (the hook). zh-TW copy is draft pending the 6-1 native pass.
export function EnableNotifications() {
  const { state, enable, isPending, isError } = usePushSubscribe();

  if (state === "loading" || state === "unsupported") return null;

  if (state === "ios-needs-install") {
    return (
      <p className="text-sm text-muted-foreground">
        在 iPhone 上，先用「分享 → 加入主畫面」把 Mapsake 裝起來，通知才能送達。
      </p>
    );
  }

  if (state === "granted") {
    return (
      <p className="text-sm text-muted-foreground">
        已開啟 — 你去過的地方會在某個傍晚悄悄回來。
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        通知目前是關著的，可到瀏覽器設定裡允許 Mapsake。
      </p>
    );
  }

  // state === "default": offer the enable tap.
  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={enable}
        disabled={isPending}
        className="self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline disabled:opacity-60"
      >
        {isPending ? "請允許通知…" : "開啟回憶通知"}
      </button>
      {isError && (
        <p className="text-xs text-[rgb(var(--terracotta-text))]">這次沒能開啟，稍後再試一次。</p>
      )}
    </div>
  );
}
