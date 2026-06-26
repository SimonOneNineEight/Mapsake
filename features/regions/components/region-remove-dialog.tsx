"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("regions");
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title", { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { pinCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t("remove")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
