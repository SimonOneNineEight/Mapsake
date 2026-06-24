"use client";

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

/**
 * "Remove this place" confirm (Story 3.10). Shown only when the region holds pins/memories —
 * a bare mark is removed with no friction (handled upstream). Durability-first copy that names
 * the loss + count so the user knows exactly what's removed. Reuses the calm 3.8 AlertDialog.
 */
export function RegionRemoveDialog({
  open,
  name,
  pinCount,
  onConfirm,
  onClose,
}: {
  open: boolean;
  name: string;
  pinCount: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>移除「{name}」？</AlertDialogTitle>
          <AlertDialogDescription>
            這會一併刪除這個地區的 {pinCount} 個地點與其照片。此動作無法復原。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>移除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
