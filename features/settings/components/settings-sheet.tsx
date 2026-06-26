"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAccount } from "@/features/auth/hooks/use-account";
import { useExport } from "@/features/settings/hooks/use-export";
import { EnableNotifications } from "@/features/notifications/components/enable-notifications";
import { NotificationSettings } from "@/features/notifications/components/notification-settings";
import { usePins, useUpdatePin } from "@/features/pins/queries/pins-queries";
import { readDefaultView, writeDefaultView } from "@/features/onboarding/lib/onboarding-prefs";

// The Settings home (Story 6.3) — a full-screen vaul sheet over the map (Simon's decision), the single
// place for preferences. Reachable from the account sheet's 設定 entry (anon + signed-in). Consolidates
// (moved here): account/sign-out, notifications (5-1 enable + 5-6 controls), data export (2-6); plus
// NEW: default-view change (4-2 AC2) and a muted-places manager (5-6). Language is read-only (zh-TW;
// English deferred). No dark-mode toggle (Lamplight is Phase 2). All copy via next-intl (6-1).

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-serif text-base font-medium text-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function SettingsSheet({
  open,
  onOpenChange,
  onPickFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPickFocus: () => void; // close Settings + enter the map's country-pick (sets the focus default)
}) {
  const t = useTranslations("settings");
  const account = useAccount();
  const signedIn = !account.isAnonymous && Boolean(account.email);
  const exportData = useExport();
  const { data: pins } = usePins();
  const updatePin = useUpdatePin();
  const mutedPins = (pins ?? []).filter((p) => p.muted);

  // Default view, re-read whenever the sheet opens so it reflects a change made while it was closed
  // (e.g. a focus pick). The named-fn call keeps the synchronous setState out of the effect body.
  const [view, setView] = useState(() => readDefaultView());
  useEffect(() => {
    if (!open) return;
    const sync = () => setView(readDefaultView());
    sync();
  }, [open]);

  const signOut = async () => {
    await createClient().auth.signOut();
    window.location.assign("/"); // middleware re-mints a fresh anonymous session
  };

  const setWorld = () => {
    writeDefaultView({ kind: "world" });
    setView({ kind: "world" });
  };

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-[rgb(var(--map-frame))]/40" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-30 flex h-[97dvh] flex-col rounded-t-[18px] bg-card shadow-[0_-4px_16px_rgba(58,46,34,0.18)] outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />
          <div className="flex flex-col gap-6 overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="self-start py-1.5 text-sm text-muted-foreground"
            >
              {t("close")}
            </button>
            <Drawer.Title className="font-serif text-xl font-medium text-foreground">
              {t("title")}
            </Drawer.Title>

            {/* 帳號 */}
            <Section title={t("sectionAccount")}>
              {signedIn ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t("loggedInAs", { email: account.email ?? "" })}
                  </p>
                  <button
                    type="button"
                    onClick={signOut}
                    className="self-start py-1.5 text-sm text-[rgb(var(--terracotta-text))] hover:underline"
                  >
                    {t("signOut")}
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{t("anonHint")}</p>
              )}
            </Section>

            {/* 通知 — signed-in only: a push subscription must attach to a durable account (Story 5-1),
                so anon users don't get notification controls (matches the pre-6-3 account-sheet gating). */}
            {signedIn && (
              <Section title={t("sectionNotifications")}>
                <EnableNotifications />
                <NotificationSettings />
              </Section>
            )}

            {/* 預設視圖 (Story 4.2 AC2) */}
            <Section title={t("sectionDefaultView")}>
              <p className="text-sm text-muted-foreground">
                {view?.kind === "focus" ? t("viewCurrentFocus") : t("viewCurrentWorld")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={setWorld}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  {t("viewWorld")}
                </button>
                <button
                  type="button"
                  onClick={onPickFocus}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  {t("viewFocus")}
                </button>
              </div>
            </Section>

            {/* 靜音的地方 (Story 5.6 mute) — unmute restores notifications; the pin stays on the map. */}
            <Section title={t("sectionMuted")}>
              {mutedPins.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("mutedEmpty")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {mutedPins.map((pin) => (
                    <li key={pin.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-foreground">{pin.name}</span>
                      <button
                        type="button"
                        onClick={() => updatePin.mutate({ id: pin.id, muted: false })}
                        className="shrink-0 py-1.5 text-sm text-[rgb(var(--terracotta-text))] hover:underline"
                      >
                        {t("unmute")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            {/* 匯出資料 (Story 2.6) — moved from the account sheet. */}
            <Section title={t("sectionExport")}>
              <button
                type="button"
                onClick={() => exportData.mutate()}
                disabled={exportData.isPending}
                className="self-start py-1.5 text-sm text-[rgb(var(--terracotta-text))] hover:underline disabled:opacity-60"
              >
                {exportData.isPending ? t("exporting") : t("exportData")}
              </button>
              {exportData.isError && (
                <p className="text-xs text-[rgb(var(--terracotta-text))]">{t("exportError")}</p>
              )}
            </Section>

            {/* 語言 — zh-TW only in v1 (English deferred); read-only, never a dead toggle. */}
            <Section title={t("sectionLanguage")}>
              <p className="text-sm text-muted-foreground">{t("languageValue")}</p>
            </Section>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
