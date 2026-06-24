"use client";

import { useEffect, useState } from "react";
import { MapCanvas } from "@/features/map/components/MapCanvas";
import { Onboarding } from "@/features/onboarding/components/onboarding";
import { readDefaultView, writeDefaultView } from "@/features/onboarding/lib/onboarding-prefs";
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
  const [onboarding, setOnboarding] = useState<"question" | "pick" | null>(null);

  useEffect(() => {
    // Client-only read: deciding from localStorage on mount (not during SSR) is what avoids a
    // hydration mismatch / overlay flash for returning users — the legitimate effect-setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readDefaultView() === null) setOnboarding("question");
  }, []);

  const finishWorld = () => {
    writeDefaultView({ kind: "world" }); // stays on the world view (the map's default framing)
    setOnboarding(null);
  };
  const finishFocus = (countryCode: string) => {
    writeDefaultView({ kind: "focus", countryCode });
    setOnboarding(null);
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapCanvas
          onOpenPin={setSelectedPinId}
          selectedPinId={selectedPinId}
          pickCountry={onboarding === "pick"}
          onCountryPick={({ countryCode }) => finishFocus(countryCode)}
        />
        {onboarding && (
          <Onboarding
            step={onboarding}
            onChooseWorld={finishWorld}
            onChooseFocus={() => setOnboarding("pick")}
            onBack={() => setOnboarding("question")}
          />
        )}
      </div>
      <MemoryContainer pinId={selectedPinId} onClose={() => setSelectedPinId(null)} />
    </div>
  );
}
