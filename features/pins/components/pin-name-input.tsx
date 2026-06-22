"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Minimal name capture for a freshly-dropped pin (Story 3.1). NOT the full memory
 * panel/sheet (that's Story 3.4) — just enough to name the pin and save it. A name is
 * required (the `pins.name` column is NOT NULL); cancel discards the un-saved pin.
 * Renders as a small centered overlay inside the map container.
 */
export function PinNameInput({
  onSave,
  onCancel,
}: {
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const trimmed = name.trim();

  return (
    <div
      className="absolute inset-0 z-10 grid place-items-center bg-foreground/10 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="為這個回憶命名"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
      }}
    >
      <form
        className="w-full max-w-xs rounded-[14px] bg-card p-4 shadow-[0_4px_16px_rgba(58,46,34,0.18)]"
        onSubmit={(e) => {
          e.preventDefault();
          if (trimmed) onSave(trimmed);
        }}
      >
        <label htmlFor="pin-name" className="mb-2 block text-sm text-muted-foreground">
          為這個地方命名
        </label>
        <Input
          id="pin-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：京都"
          maxLength={120}
        />
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit" disabled={!trimmed}>
            儲存
          </Button>
        </div>
      </form>
    </div>
  );
}
