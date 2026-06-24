"use client";

import { useEffect, useRef, useState } from "react";
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
  // Keyboard-compose (Story 3.5): while editing the note on the phone sheet, force Full and
  // make the sheet non-dismissible so a drag scrolls the note, not the sheet.
  const [composing, setComposing] = useState(false);
  const panelRef = useRef<HTMLElement>(null);

  // a11y (Story 4.7): when a memory opens — especially from the keyboard "Places visited" list,
  // where activating a pin closes the list and returns focus to its trigger — move focus into the
  // memory so a screen-reader user lands on the opened memory. (Phone: vaul focuses the sheet.)
  useEffect(() => {
    if (wide && pinId && pin) panelRef.current?.focus();
  }, [wide, pinId, pin]);

  // Closing while the note is focused would otherwise leave `composing` stuck true (blur may
  // not fire), so the next open starts non-dismissible. Reset it on every close path.
  const handleClose = () => {
    setSnap(0.5); // reset to the half snap for the next open
    setComposing(false);
    onClose();
  };

  if (!pinId || !pin) return null;

  if (wide) {
    return (
      <aside
        ref={panelRef}
        tabIndex={-1}
        aria-label="回憶"
        className="relative z-10 flex h-full w-[38%] max-w-md shrink-0 flex-col gap-4 overflow-y-auto bg-card p-5 shadow-[-4px_0_16px_rgba(58,46,34,0.18)] outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="self-end text-xl leading-none text-muted-foreground"
        >
          ×
        </button>
        <MemoryCard key={pin.id} pin={pin} onDeleted={onClose} />
      </aside>
    );
  }

  return (
    <Drawer.Root
      open
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
      snapPoints={[0.5, 0.85, 1]}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      modal={false} // keep the map visible + interactive above the sheet
      dismissible={!composing} // don't let a drag close the sheet while writing a note
      repositionInputs // lift the focused note field above the on-screen keyboard
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
              onClick={handleClose}
              className="self-start text-sm text-muted-foreground"
            >
              ▾ 回到地圖
            </button>
            <Drawer.Title className="sr-only">回憶</Drawer.Title>
            <MemoryCard
              key={pin.id}
              pin={pin}
              onNoteFocus={() => {
                setSnap(1); // force Full so the field has room above the keyboard
                setComposing(true);
              }}
              onNoteBlur={() => setComposing(false)}
              onDeleted={handleClose}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
