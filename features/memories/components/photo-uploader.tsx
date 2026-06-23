"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePhotos, useUploadPhoto } from "@/features/memories/queries/photos-queries";
import { PhotoGrid, type PhotoTile } from "./photo-grid";
import { PhotoViewer } from "./photo-viewer";

const MAX_PER_PIN = 30; // soft cap (architecture envelope); the 2GB/user quota is monitor-only

const linkQuiet = "self-start text-sm text-[rgb(var(--terracotta-text))] hover:underline";

interface PendingItem {
  tempId: string;
  file: File;
  previewUrl: string;
  sortOrder: number;
  status: "uploading" | "error";
}

/**
 * Photo batch upload for an open pin (Story 3.6). Multi-select from the camera roll, eager:
 * thumbnails/placeholders render immediately, each file goes queued → uploading → done with a
 * calm inline "重試" on failure (never a blocking error). Durable-write: a photo becomes a
 * real thumbnail only after the upload + row insert ack. Absent photos show only the quiet
 * "＋ 加照片" invitation (no "0 photos"). The full-screen viewer is Story 3.7.
 */
export function PhotoUploader({ pinId }: { pinId: string }) {
  const { data: photos } = usePhotos(pinId);
  const uploadOne = useUploadPhoto(pinId);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const patchItem = useCallback((tempId: string, patch: Partial<PendingItem>) => {
    setPending((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, ...patch } : it)));
  }, []);

  const runUpload = useCallback(
    async (item: PendingItem) => {
      try {
        // uploadOne awaits the cache invalidation+refetch, so on resolve the persisted
        // thumbnail is already in `usePhotos` — drop the placeholder with no flicker.
        await uploadOne(item.file, item.sortOrder);
        setPending((prev) => prev.filter((it) => it.tempId !== item.tempId));
        URL.revokeObjectURL(item.previewUrl);
      } catch {
        patchItem(item.tempId, { status: "error" });
      }
    },
    [uploadOne, patchItem],
  );

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;

    const base = (photos?.length ?? 0) + pending.length;
    const items: PendingItem[] = files.map((file, i) => ({
      tempId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      sortOrder: base + i,
      status: "uploading",
    }));
    setPending((prev) => [...prev, ...items]);
    items.forEach(runUpload);
  };

  // Revoke any still-pending object URLs on unmount (e.g. a pin swap remounts the card).
  // Mirror `pending` into a ref via an effect (not during render) so the unmount cleanup
  // sees the latest list.
  const pendingRef = useRef(pending);
  useEffect(() => {
    pendingRef.current = pending;
  });
  useEffect(() => {
    return () => pendingRef.current.forEach((it) => URL.revokeObjectURL(it.previewUrl));
  }, []);

  const tiles: PhotoTile[] = [
    ...(photos ?? []).map((p, i) => ({
      key: p.id,
      src: p.url,
      state: "ready" as const,
      onOpen: () => setViewerIndex(i),
    })),
    ...pending.map((it) => ({
      key: it.tempId,
      src: it.previewUrl,
      state: it.status === "error" ? ("error" as const) : ("uploading" as const),
      onRetry:
        it.status === "error"
          ? () => {
              patchItem(it.tempId, { status: "uploading" });
              runUpload({ ...it, status: "uploading" });
            }
          : undefined,
    })),
  ];

  const atCap = (photos?.length ?? 0) + pending.length >= MAX_PER_PIN;

  return (
    <div className="flex flex-col gap-2">
      <PhotoGrid tiles={tiles} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        aria-label="加照片"
        onChange={onSelect}
      />
      {atCap ? (
        <p className="self-start text-sm text-muted-foreground">已達每個地點 {MAX_PER_PIN} 張上限</p>
      ) : (
        <button type="button" className={linkQuiet} onClick={() => inputRef.current?.click()}>
          ＋ 加照片
        </button>
      )}
      {viewerIndex !== null && photos && photos.length > 0 && (
        <PhotoViewer
          photos={photos.map((p) => ({ id: p.id, url: p.url }))}
          initialIndex={Math.min(viewerIndex, photos.length - 1)}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </div>
  );
}
