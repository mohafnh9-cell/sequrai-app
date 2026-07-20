"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { WorkspaceIcon } from "@/features/workspaces/components/WorkspaceIcon";
import { DeleteWorkspaceDialog } from "@/features/workspaces/components/DeleteWorkspaceDialog";
import type { ManageableWorkspace } from "@/lib/workspaces/presentation";

export function WorkspaceManagementPanel({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: ManageableWorkspace[];
  activeWorkspaceId: string | null;
}) {
  const { t } = useI18n("workspace");
  const [isPending, startTransition] = useTransition();
  const [deleteTarget, setDeleteTarget] = useState<ManageableWorkspace | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSwitch = (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId || isPending) return;
    startTransition(async () => {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      if (!response.ok) return;
      window.location.assign("/dashboard");
    });
  };

  const handleDelete = () => {
    if (!deleteTarget || isPending) return;
    setDeleteError(null);
    startTransition(async () => {
      const response = await fetch(`/api/workspaces/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setDeleteError(payload?.error ?? t("deleteFailed"));
        return;
      }
      setDeleteTarget(null);
      window.location.assign("/settings/workspaces");
    });
  };

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("manageTitle")}</CardTitle>
          <CardDescription>{t("manageDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {deleteError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {deleteError}
            </p>
          )}
          {workspaces.map((workspace) => {
            const active = workspace.id === activeWorkspaceId;
            return (
              <div
                key={workspace.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <WorkspaceIcon name={workspace.name} logoUrl={workspace.logoUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{workspace.name}</p>
                  {workspace.plan && (
                    <p className="truncate text-xs text-muted-foreground">{workspace.plan}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {active ? (
                    <span className="inline-flex items-center gap-1 text-xs text-primary">
                      <Check className="h-3.5 w-3.5" />
                      {t("activeBadge")}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleSwitch(workspace.id)}
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        t("switchAction")
                      )}
                    </Button>
                  )}
                  {workspace.canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={t("deleteAction", { name: workspace.name })}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteTarget(workspace);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      {deleteTarget && (
        <DeleteWorkspaceDialog
          workspace={deleteTarget}
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open && !isPending) setDeleteTarget(null);
          }}
          onConfirm={handleDelete}
          isLoading={isPending}
        />
      )}
    </>
  );
}
