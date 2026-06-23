"use client";

import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { usePin } from "@/features/pins/queries/pins-queries";
import { MemoryCard } from "./memory-card";

// Split threshold (EXPERIENCE): ≥840px = desktop/tablet right panel; below = phone sheet.
function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 840px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide;
}

/**
 * Opens one pin's memory, adapting to screen (Story 3.4):
 * - ≥840px: a right-docked panel rendered as a flex sibling of the map (the map cell
 *   shrinks; MapCanvas's ResizeObserver keeps the canvas correct). Map stays interactive.
 * - <840px: a Vaul bottom sheet, 3 snap points (half default / expanded / full), non-modal
 *   so the map stays visible + interactive above it. Drag handle + "▾ 回到地圖" to close.
 * Content is the memory card (title only in 3.4). Swapping pins re-renders in place.
 * NOTE: keyboard-compose (force Full + lock drag when a text field focuses) is Story 3.5 —
 * there's no editable field here yet. Phone-landscape side-layout is a later refinement.
 */
export function MemoryContainer({
  pinId,
  onClose,
}: {
  pinId: string | null;
  onClose: () => void;
}) {
  const pin = usePin(pinId);
  const wide = useIsWide();
  const [snap, setSnap] = useState<number | string | null>(0.5);

  if (!pinId || !pin) return null;

  if (wide) {
    return (
      <aside className="relative z-10 flex h-full w-[38%] max-w-md shrink-0 flex-col gap-4 overflow-y-auto bg-card p-5 shadow-[-4px_0_16px_rgba(58,46,34,0.18)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="self-end text-xl leading-none text-muted-foreground"
        >
          ×
        </button>
        <MemoryCard pin={pin} />
      </aside>
    );
  }

  return (
    <Drawer.Root
      open
      onOpenChange={(o) => {
        if (!o) {
          setSnap(0.5); // reset to the half snap for the next open (event handler — lint-safe)
          onClose();
        }
      }}
      snapPoints={[0.5, 0.85, 1]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      modal={false} // keep the map visible + interactive above the sheet
    >
      <Drawer.Portal>
        <Drawer.Content
          aria-label="回憶"
          className="fixed inset-x-0 bottom-0 z-20 flex h-[97dvh] flex-col rounded-t-[18px] bg-card shadow-[0_-4px_16px_rgba(58,46,34,0.18)] outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />
          <div className="flex flex-col gap-4 overflow-y-auto p-5">
            <button
              type="button"
              onClick={onClose}
              className="self-start text-sm text-muted-foreground"
            >
              ▾ 回到地圖
            </button>
            <Drawer.Title className="sr-only">回憶</Drawer.Title>
            <MemoryCard pin={pin} />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
