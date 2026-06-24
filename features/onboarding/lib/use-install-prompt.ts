"use client";

import { useEffect, useState } from "react";

// Install affordance support (Story 4.5). Captures the Chromium `beforeinstallprompt` (which can
// fire before the hand-off card mounts, so this hook lives at a stable mount — the shell), detects
// iOS Safari (no beforeinstallprompt — install is manual Share → Add to Home Screen), and hides
// everything once installed / running standalone. Client-only; SSR-guarded.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// "prompt" = Chromium install button; "ios" = Share→Add-to-Home-Screen instruction; "none" = no
// affordance (already installed, or no install path on this browser).
export type InstallMode = "prompt" | "ios" | "none";

function standalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari exposes its own standalone flag (not on the standard navigator type).
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPhone/iPad/iPod, excluding Chrome/Firefox-on-iOS (they can't add to home screen the same way).
  return /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
}

export function useInstallPrompt(): { mode: InstallMode; promptInstall: () => Promise<void> } {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); // stash it; we drive the prompt from the hand-off card
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const mode: InstallMode =
    installed || standalone() ? "none" : deferred ? "prompt" : isIOSSafari() ? "ios" : "none";

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
  };

  return { mode, promptInstall };
}
