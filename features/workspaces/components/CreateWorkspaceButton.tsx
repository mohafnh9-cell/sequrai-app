"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { CreateWorkspaceDialog } from "@/features/workspaces/components/CreateWorkspaceDialog";

export function CreateWorkspaceButton() {
  const { t } = useI18n("workspace");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        {t("createWorkspace")}
      </Button>
      <CreateWorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={() => {
          window.location.href = "/dashboard";
        }}
      />
    </>
  );
}
