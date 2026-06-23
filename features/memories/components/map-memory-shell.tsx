"use client";

import { useState } from "react";
import { MapCanvas } from "@/features/map/components/MapCanvas";
import { MemoryContainer } from "./memory-container";

/**
 * The home surface: the map plus the memory panel/sheet (Story 3.4). Owns the ephemeral
 * `selectedPinId` (UI state, not server state) — set when a pin is tapped, cleared on close.
 * On ≥840px the panel is a flex sibling so the map cell shrinks beside it (MapCanvas resizes
 * via its ResizeObserver); on phone the memory is a non-modal Vaul sheet over the map.
 */
export function MapMemoryShell() {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  return (
    <div className="flex h-full w-full">
      <div className="relative min-w-0 flex-1">
        <MapCanvas onOpenPin={setSelectedPinId} selectedPinId={selectedPinId} />
      </div>
      <MemoryContainer pinId={selectedPinId} onClose={() => setSelectedPinId(null)} />
    </div>
  );
}
