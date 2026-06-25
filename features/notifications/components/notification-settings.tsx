"use client";

import { useProfileSettings, useUpdateProfileSettings } from "../queries/profile-queries";

// Notification controls (Story 5.6): the global on/off + delivery time. Signed-in only (mounted in
// the account sheet beside EnableNotifications; decoupled so Settings 6-3 can re-mount it). Global
// off is honored end to end (the 5-3 sender only sends to notif_enabled=true). Delivery time is
// stored now; the cron honoring a per-user time is a documented fast-follow (5-3 uses a fixed
// evening hour). zh-TW drafts — native pass in 6-1.
export function NotificationSettings() {
  const { data, isLoading } = useProfileSettings();
  const update = useUpdateProfileSettings();

  if (isLoading || !data) return null;

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={data.notifEnabled}
          onChange={(e) => update.mutate({ notifEnabled: e.target.checked })}
        />
        接收回憶通知
      </label>
      {data.notifEnabled && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          傍晚送達時間
          <input
            type="time"
            value={data.notifTime.slice(0, 5)}
            onChange={(e) => e.target.value && update.mutate({ notifTime: e.target.value })}
            className="bg-transparent text-foreground outline-none"
          />
        </label>
      )}
      {update.isError && (
        <p className="text-xs text-[rgb(var(--terracotta-text))]">沒能更新設定，稍後再試一次。</p>
      )}
    </div>
  );
}
