"use client";

import { useEffect, useState } from "react";

// Shared connectivity signal (Story 4.6). Drives the read-only / write-disabled posture across
// surfaces that aren't the map (the memory panel's note/date/photo/delete controls), mirroring
// the map's own offline banner. Starts false on SSR + first client render (so it matches the
// server HTML), then syncs to navigator.onLine after mount — no hydration mismatch.
export function useOffline(): boolean {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return offline;
}
