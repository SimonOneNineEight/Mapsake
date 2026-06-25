"use client";

import { useState } from "react";
import type { Pin } from "@/data/pins";
import { useDeletePin, useUpdatePin } from "@/features/pins/queries/pins-queries";
import { usePhotos } from "@/features/memories/queries/photos-queries";
import { useOffline } from "@/features/pwa/use-offline";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SaveStatus } from "@/components/save-status";
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
  onDeleted,
  reliveMore = 0,
  onReliveNext,
}: {
  pin: Pin;
  onNoteFocus?: () => void;
  onNoteBlur?: () => void;
  onDeleted?: () => void; // close the memory after a successful delete (Story 3.8)
  // "N more from this day" (Story 5.5): on a re-live landing, the count of other same-day memories
  // and a tap to cycle to the next one. 0 → no chip (normal browsing).
  reliveMore?: number;
  onReliveNext?: () => void;
}) {
  const updatePin = useUpdatePin();
  const deletePin = useDeletePin();
  const { data: photos } = usePhotos(pin.id);
  // Offline = read-only (Story 4.6): writes need a connection, so the edit/add/delete affordances
  // are replaced by read-only text + a calm line — never let a mutation fire offline and fail.
  const offline = useOffline();
  const [editingNote, setEditingNote] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showNoteField = Boolean(pin.note) || editingNote;
  const showDateField = Boolean(pin.memoryDate) || showDate;

  // A name-only pin deletes with no friction; a pin holding a note, a date, or photos gets a
  // gentle confirm (durability is sacred — never imply accidental loss). NOTE: this reads the
  // loaded photo list; a photo-ONLY pin (no note/date) clicked within the brief usePhotos load
  // window could delete without a confirm. Accepted as a low-risk edge (the grid renders above
  // this link, so the list is usually warm) — treating loading as content was rejected because
  // it breaks the "name-only deletes with no friction" AC during the load window.
  const hasContent = Boolean(pin.note) || Boolean(pin.memoryDate) || (photos?.length ?? 0) > 0;
  const runDelete = () => deletePin.mutate(pin, { onSuccess: () => onDeleted?.() });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="font-serif text-2xl font-medium text-foreground">{pin.name}</h2>

      {offline && (
        <p className="text-xs text-muted-foreground">僅供瀏覽 — 重新連線後可編輯</p>
      )}

      {/* Note */}
      {offline ? (
        pin.note ? (
          <p className="whitespace-pre-wrap text-sm text-foreground">{pin.note}</p>
        ) : null
      ) : showNoteField ? (
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
      {offline ? (
        pin.memoryDate ? (
          <p className="text-sm text-muted-foreground">{formatZhDate(pin.memoryDate)}</p>
        ) : null
      ) : showDateField ? (
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

      {/* Photos (Story 3.6) — quiet "＋ 加照片"; absent shows only the invitation, no "0 photos".
          Offline: read-only grid (no add/delete) per Story 4.6. */}
      <PhotoUploader pinId={pin.id} readOnly={offline} />

      {/* Quiet durable-write status (ack-gated "saved"; calm retry on failure) — shared surface. */}
      <SaveStatus
        phase={
          updatePin.isPending
            ? "pending"
            : updatePin.isError
              ? "error"
              : updatePin.isSuccess
                ? "success"
                : "idle"
        }
        variant="inline"
        onRetry={() => updatePin.variables && updatePin.mutate(updatePin.variables)}
      />

      {/* "N more from this day" (Story 5.5) — only on a re-live landing with same-day siblings.
          Tapping cycles to the next same-day memory (fly + glow + open). zh-TW draft (6-1 pass). */}
      {reliveMore > 0 && (
        <button type="button" className={linkQuiet} onClick={onReliveNext}>
          這天還有 {reliveMore} 個回憶 →
        </button>
      )}

      {/* Delete the memory. Name-only → no friction; content-bearing → gentle confirm.
          Hidden offline (Story 4.6) — delete is a write and needs a connection. */}
      {!offline && (
        <div className="mt-2 flex flex-col gap-1">
          <button
            type="button"
            className="self-start text-sm text-muted-foreground hover:text-foreground"
            onClick={() => (hasContent ? setConfirmOpen(true) : runDelete())}
          >
            刪除回憶
          </button>
          {/* Delete status — no "saved" success (the card closes on a successful delete). */}
          <SaveStatus
            phase={deletePin.isPending ? "pending" : deletePin.isError ? "error" : "idle"}
            kind="delete"
            variant="inline"
            onRetry={runDelete}
          />
        </div>
      )}

      <AlertDialog open={confirmOpen && !offline} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>刪除「{pin.name}」這個回憶？</AlertDialogTitle>
            <AlertDialogDescription>
              這個地方的筆記、日期和照片都會一起移除。此動作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={runDelete}>刪除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
