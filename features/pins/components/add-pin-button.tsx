"use client";

import { Button } from "@/components/ui/button";

/**
 * The deliberate "+ add memory / pin" affordance (Story 3.1). Toggles drop mode; while
 * active, the next map tap lands a pin (handled in MapCanvas). Keeping the drop gesture
 * behind an explicit affordance is what stops a plain tap from accidentally dropping a
 * pin (EXPERIENCE: a plain tap marks the region). Positioned by the parent.
 */
export function AddPinButton({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "default"}
      disabled={disabled}
      onClick={onToggle}
      aria-pressed={active}
      className="shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
    >
      {active ? "輕觸地圖放置 · 取消" : "＋ 新增回憶"}
    </Button>
  );
}
