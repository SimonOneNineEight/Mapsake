"use client";

import { useEffect, useRef, useState } from "react";
import { MapCanvas } from "@/features/map/components/MapCanvas";
import { Onboarding } from "@/features/onboarding/components/onboarding";
import {
  readAccountPromptSeen,
  readDefaultView,
  writeAccountPromptSeen,
  writeDefaultView,
} from "@/features/onboarding/lib/onboarding-prefs";
import { useAccount } from "@/features/auth/hooks/use-account";
import { useInstallPrompt } from "@/features/onboarding/lib/use-install-prompt";
import { PlacesPanel } from "@/features/places/components/places-panel";
import { AccountSheet } from "@/features/auth/components/account-sheet";
import { MemoryContainer } from "./memory-container";

/**
 * The home surface: the map plus the memory panel/sheet (Story 3.4). Owns the ephemeral
 * `selectedPinId` (UI state, not server state) — set when a pin is tapped, cleared on close.
 * On ≥840px the panel is a flex sibling so the map cell shrinks beside it (MapCanvas resizes
 * via its ResizeObserver); on phone the memory is a non-modal Vaul sheet over the map.
 *
 * Also coordinates first-run onboarding (Story 4.1): the default-view question. It owns the
 * step + the localStorage write (the focus `countryCode` arrives here from the map tap).
 */
export function MapMemoryShell() {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  // Onboarding step: null = not onboarding (returning user or finished). Set after mount so
  // there's no SSR/hydration flash (localStorage is client-only).
  const [onboarding, setOnboarding] = useState<"question" | "pick" | "backfill" | "handoff" | null>(null);
  // The saved view read ONCE for the opening camera (Story 4.2 — land on it). Lazy initializer:
  // SSR returns null (window guard); consumed only inside MapCanvas's client build effect, so no
  // hydration mismatch. A returning focus user opens already framed on their country.
  const [initialView] = useState(() => readDefaultView());
  // PWA install affordance (Story 4.5), folded into the hand-off card. Lives here (always mounted)
  // so the Chromium beforeinstallprompt is caught even if it fires before the hand-off renders.
  const { mode: installMode, promptInstall } = useInstallPrompt();
  // Imperative camera handle for the "Places visited" list (Story 4.7) — fly to a pin without
  // importing MapLibre here (it stays in features/map). MapCanvas assigns it once ready.
  const cameraRef = useRef<{ flyToPin: (lat: number, lng: number) => void } | null>(null);
  // Post-payoff "keep your map" prompt (Story 2.3): opens the account sheet ONCE right after the
  // onboarding payoff. Only for an anon user who hasn't seen it — never a returning/signed-in user.
  const account = useAccount();
  const signedIn = !account.isAnonymous && Boolean(account.email);
  const [promptAccount, setPromptAccount] = useState(false);

  useEffect(() => {
    // Client-only read: deciding from localStorage on mount (not during SSR) is what avoids a
    // hydration mismatch / overlay flash for returning users — the legitimate effect-setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readDefaultView() === null) setOnboarding("question");
  }, []);

  // After the view question, drop into backfill (Story 4.3) — the user marks rapidly before
  // the map is "theirs". finishBackfill closes onboarding into the filled map.
  const finishWorld = () => {
    writeDefaultView({ kind: "world" }); // stays on the world view (the map's default framing)
    setOnboarding("backfill");
  };
  const finishFocus = (countryCode: string, center: [number, number]) => {
    // Store the tapped center so a later open can frame the country (Story 4.2).
    writeDefaultView({ kind: "focus", countryCode, center });
    setOnboarding("backfill");
  };
  // Backfill's 完成 advances to the gentle hand-off line (Story 4.4); dismissing it drops the
  // user into the freshly colored map. The map is the payoff — no account nudge here (Epic 2).
  const finishBackfill = () => setOnboarding("handoff");
  const finishHandoff = () => {
    setOnboarding(null);
    // The payoff has landed — invite the anon user to keep their map (Story 2.3), once, never a nag.
    if (!signedIn && !readAccountPromptSeen()) {
      writeAccountPromptSeen();
      setPromptAccount(true);
    }
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapCanvas
          onOpenPin={setSelectedPinId}
          selectedPinId={selectedPinId}
          initialView={initialView}
          pickCountry={onboarding === "pick"}
          onCountryPick={({ countryCode, lngLat }) => finishFocus(countryCode, [lngLat.lng, lngLat.lat])}
          cameraRef={cameraRef}
        />
        {/* "Places visited" list (Story 4.7) — the accessible browse path. Hidden during the
            first-run onboarding so the payoff stays clean; available once the map is the user's. */}
        {!onboarding && (
          <PlacesPanel
            onOpenPin={setSelectedPinId}
            onFlyToPin={(lat, lng) => cameraRef.current?.flyToPin(lat, lng)}
          />
        )}
        {/* "Keep your map" sign-in (Story 2.1) — a quiet account affordance, never a gate;
            hidden during onboarding so the first-run payoff stays clean. */}
        {!onboarding && <AccountSheet autoOpen={promptAccount} />}
        {onboarding && (
          <Onboarding
            step={onboarding}
            onChooseWorld={finishWorld}
            onChooseFocus={() => setOnboarding("pick")}
            onBack={() => setOnboarding("question")}
            onDone={finishBackfill}
            onDismiss={finishHandoff}
            installMode={installMode}
            onInstall={promptInstall}
          />
        )}
      </div>
      <MemoryContainer pinId={selectedPinId} onClose={() => setSelectedPinId(null)} />
    </div>
  );
}
