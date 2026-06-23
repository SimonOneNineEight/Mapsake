"use client";

import { useState } from "react";
import type { Pin } from "@/data/pins";
import { useUpdatePin } from "@/features/pins/queries/pins-queries";
import { PhotoUploader } from "./photo-uploader";

// zh-TW date display for a YYYY-MM-DD `memory_date` (no "Date: —" when absent).
function formatZhDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${+y} 年 ${+m} 月 ${+day} 日`;
}

const linkQuiet =
  "self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline";

/**
 * The memory card (Story 3.4 title + Story 3.5 note/date). The pin's name is always shown.
 * The note + optional date are quiet "+ add" invitations (DESIGN link-quiet) — present
 * everywhere, never required, and absent values render as the invitation, NOT an empty slot
 * or "Date: —". Edits save durably (optimistic + ack-gated "已儲存", retained-on-failure).
 * `onNoteFocus`/`onNoteBlur` let the phone sheet force Full while composing (Story 3.5 AC4).
 */
export function MemoryCard({
  pin,
  onNoteFocus,
  onNoteBlur,
}: {
  pin: Pin;
  onNoteFocus?: () => void;
  onNoteBlur?: () => void;
}) {
  const updatePin = useUpdatePin();
  const [editingNote, setEditingNote] = useState(false);
  const [showDate, setShowDate] = useState(false);

  const showNoteField = Boolean(pin.note) || editingNote;
  const showDateField = Boolean(pin.memoryDate) || showDate;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="font-serif text-2xl font-medium text-foreground">{pin.name}</h2>

      {/* Note */}
      {showNoteField ? (
        <textarea
          key={`note-${pin.id}`} // reset across pin swaps (no bleed)
          defaultValue={pin.note ?? ""}
          autoFocus={editingNote && !pin.note}
          rows={3}
          placeholder="寫下這個地方的回憶…"
          className="w-full resize-y rounded-md bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          onFocus={onNoteFocus}
          onBlur={(e) => {
            onNoteBlur?.();
            const val = e.currentTarget.value.trim();
            const current = pin.note ?? "";
            if (val !== current) updatePin.mutate({ id: pin.id, note: val || null });
            if (!val && !pin.note) setEditingNote(false);
          }}
        />
      ) : (
        <button type="button" className={linkQuiet} onClick={() => setEditingNote(true)}>
          ＋ 寫筆記
        </button>
      )}

      {/* Optional date — skipping is first-class */}
      {showDateField ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {pin.memoryDate && <span>{formatZhDate(pin.memoryDate)}</span>}
          <input
            key={`date-${pin.id}`}
            type="date"
            defaultValue={pin.memoryDate ?? ""}
            aria-label="日期"
            className="bg-transparent text-muted-foreground outline-none"
            onChange={(e) => updatePin.mutate({ id: pin.id, memoryDate: e.target.value || null })}
          />
          {pin.memoryDate && (
            <button
              type="button"
              className="text-[rgb(var(--terracotta-text))] hover:underline"
              onClick={() => {
                updatePin.mutate({ id: pin.id, memoryDate: null });
                setShowDate(false);
              }}
            >
              清除
            </button>
          )}
        </div>
      ) : (
        <button type="button" className={linkQuiet} onClick={() => setShowDate(true)}>
          ＋ 加日期
        </button>
      )}

      {/* Photos (Story 3.6) — quiet "＋ 加照片"; absent shows only the invitation, no "0 photos". */}
      <PhotoUploader pinId={pin.id} />

      {/* Quiet durable-write status (ack-gated "saved"; calm retry on failure). */}
      {updatePin.isPending && <p className="text-xs text-muted-foreground">儲存中…</p>}
      {updatePin.isSuccess && <p className="text-xs text-muted-foreground">已儲存</p>}
      {updatePin.isError && (
        <button
          type="button"
          className="self-start text-xs text-[rgb(var(--terracotta-text))]"
          onClick={() => updatePin.variables && updatePin.mutate(updatePin.variables)}
        >
          無法儲存，重試
        </button>
      )}
    </div>
  );
}
