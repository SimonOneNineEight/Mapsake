"use client";

import { useMutation } from "@tanstack/react-query";
import { gatherExport } from "@/data/gather-export";
import { useSessionUserId } from "@/features/auth/hooks/use-session-user";

// "Export my data" hook (Story 2.6). Owns the idle→preparing→done/error state (via useMutation)
// and the ONLY DOM/download side-effect: gather the RLS-scoped payload, serialize, and trigger a
// browser download. The gather logic stays in data/export.ts (boundary); this is the client layer.
// Lives under features/settings so Story 6.3 (the real Settings home) can re-mount it unchanged.
export function useExport() {
  const userId = useSessionUserId();
  return useMutation({
    mutationFn: async () => {
      const payload = await gatherExport(userId);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = `mapsake-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url); // always free the blob, even if the click/DOM step throws
      }
    },
  });
}
