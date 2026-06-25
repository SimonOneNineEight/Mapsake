"use client";

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { upsertPushSubscription } from "@/data/push";
import { urlBase64ToUint8Array } from "@/lib/push/vapid-key";

// "Enable memory notifications" (Story 5.1). Requests OS permission on an explicit gesture, then
// subscribes via the Push API with the VAPID public key and stores the subscription per device
// (data/push.ts, RLS). Capability-gated: iOS needs the installed PWA (Push API absent in a Safari
// tab); an unsupported browser hides the affordance. SENDING is Story 5.3; this is subscribe-only.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// loading → resolving capability/permission on mount; default → can ask; granted/denied → permission
// state; ios-needs-install → iOS Safari not yet a home-screen PWA (route to install); unsupported → hide.
export type PushState =
  | "loading"
  | "unsupported"
  | "ios-needs-install"
  | "default"
  | "granted"
  | "denied";

// Mirrors the iOS/standalone detection in features/onboarding/lib/use-install-prompt.ts (kept local
// to avoid coupling the push hook to the onboarding install hook).
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
}

export function usePushSubscribe(): {
  state: PushState;
  enable: () => void;
  isPending: boolean;
  isError: boolean;
} {
  const [state, setState] = useState<PushState>("loading");

  // Resolve capability + current permission on mount (client-only; never asks here).
  useEffect(() => {
    const detect = () => {
      const supported =
        "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) {
        // iOS Safari (not a home-screen PWA) has no PushManager → route to install, not "unsupported".
        setState(isIOSSafari() && !isStandalone() ? "ios-needs-install" : "unsupported");
        return;
      }
      // No VAPID public key configured (unset env / misconfigured deploy) → a subscribe can only
      // fail, so hide the affordance rather than burn an irreversible OS permission grant on it.
      if (!VAPID_PUBLIC_KEY) {
        setState("unsupported");
        return;
      }
      setState(
        Notification.permission === "granted"
          ? "granted"
          : Notification.permission === "denied"
            ? "denied"
            : "default",
      );
    };
    detect();
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        // Denied/dismissed is a normal outcome, not an error — reflect it calmly, no throw.
        setState(permission === "denied" ? "denied" : "default");
        return;
      }
      // serviceWorker.ready resolves ONLY once an active SW exists — it never settles when none is
      // registered (dev SW off, or a stalled prod registration). Race a timeout so the mutation
      // rejects → isError → the calm retry, instead of hanging forever at isPending.
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Service worker unavailable")), 5000),
        ),
      ]);
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Incomplete push subscription");
      }
      await upsertPushSubscription({
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      setState("granted");
    },
  });

  return { state, enable: () => mutation.mutate(), isPending: mutation.isPending, isError: mutation.isError };
}
