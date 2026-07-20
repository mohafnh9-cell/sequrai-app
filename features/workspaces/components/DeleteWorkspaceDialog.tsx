"use client";

import { ConfirmModal } from "@/components/shared/Modal";
import { useI18n } from "@/lib/i18n/client";
import type { ManageableWorkspace } from "@/lib/workspaces/presentation";

interface DeleteWorkspaceDialogProps {
  workspace: ManageableWorkspace;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function DeleteWorkspaceDialog({
  workspace,
  open,
  onOpenChange,
  onConfirm,
  isLoading,
}: DeleteWorkspaceDialogProps) {
  const { t } = useI18n("workspace");

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("deleteTitle")}
      description={t("deleteDescription", { name: workspace.name })}
      confirmLabel={t("deleteConfirm")}
      cancelLabel={t("deleteCancel")}
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}
