"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ConfirmModal } from "@/components/shared/Modal";
import { useDeleteProject } from "@/hooks/use-projects";
import type { ProjectRow } from "@/types/database";

interface DeleteProjectDialogProps {
  project: ProjectRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const { mutateAsync: deleteProject, isPending } = useDeleteProject();

  const handleConfirm = async () => {
    await deleteProject({ id: project.id, orgId: project.organization_id });
    onOpenChange(false);
    router.push("/projects");
  };

  return (
    <ConfirmModal
      open={open}
      onOpenChange={onOpenChange}
      title="Delete project"
      description={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
      confirmLabel="Delete project"
      variant="destructive"
      onConfirm={handleConfirm}
      isLoading={isPending}
    />
  );
}
