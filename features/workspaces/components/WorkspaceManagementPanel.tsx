"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { WorkspaceIcon } from "@/features/workspaces/components/WorkspaceIcon";
import type { WorkspacePresentation } from "@/lib/workspaces/presentation";

export function WorkspaceManagementPanel({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspacePresentation[];
  activeWorkspaceId: string | null;
}) {
  const { t } = useI18n("workspace");
  const [isPending, startTransition] = useTransition();

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

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">{t("manageTitle")}</CardTitle>
        <CardDescription>{t("manageDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
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
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("switchAction")}
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
