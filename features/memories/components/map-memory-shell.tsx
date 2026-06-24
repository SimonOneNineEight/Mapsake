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
  const [onboarding, setOnboarding] = useState<"question" | "pick" | "backfill" | null>(null);
  // The saved view read ONCE for the opening camera (Story 4.2 — land on it). Lazy initializer:
  // SSR returns null (window guard); consumed only inside MapCanvas's client build effect, so no
  // hydration mismatch. A returning focus user opens already framed on their country.
  const [initialView] = useState(() => readDefaultView());

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
  const finishBackfill = () => setOnboarding(null);

  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapCanvas
          onOpenPin={setSelectedPinId}
          selectedPinId={selectedPinId}
          initialView={initialView}
          pickCountry={onboarding === "pick"}
          onCountryPick={({ countryCode, lngLat }) => finishFocus(countryCode, [lngLat.lng, lngLat.lat])}
        />
        {onboarding && (
          <Onboarding
            step={onboarding}
            onChooseWorld={finishWorld}
            onChooseFocus={() => setOnboarding("pick")}
            onBack={() => setOnboarding("question")}
            onDone={finishBackfill}
          />
        )}
      </div>
      <MemoryContainer pinId={selectedPinId} onClose={() => setSelectedPinId(null)} />
    </div>
  );
}
