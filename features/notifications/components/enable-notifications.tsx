"use client";

import { useTranslations } from "next-intl";

import { usePushSubscribe } from "../hooks/use-push-subscribe";

// "Enable memory notifications" (Story 5.1). A quiet rider in the account sheet's signed-in body
// (beside export + sign-out) — never a gate or a nag. Self-contained so Settings (Story 6-3) can
// re-mount the same affordance. Capability-gated: unsupported/loading → render nothing; iOS-not-
// installed → a calm install line; otherwise the enable link, reflecting granted/denied/error calmly.
// Asks OS permission ONLY on the tap (the hook). zh-TW copy is draft pending the 6-1 native pass.
export function EnableNotifications() {
  const t = useTranslations("notifications");
  const { state, enable, isPending, isError } = usePushSubscribe();

  if (state === "loading" || state === "unsupported") return null;

  if (state === "ios-needs-install") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("iosNeedsInstall")}
      </p>
    );
  }

  if (state === "granted") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("granted")}
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="text-sm text-muted-foreground">
        {t("denied")}
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
        className="self-start py-1.5 text-sm text-[rgb(var(--terracotta-text))] hover:underline disabled:opacity-60"
      >
        {isPending ? t("pending") : t("enable")}
      </button>
      {isError && (
        <p className="text-xs text-[rgb(var(--terracotta-text))]">{t("error")}</p>
      )}
    </div>
  );
}
