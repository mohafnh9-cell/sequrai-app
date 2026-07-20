import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import { getTranslator } from "@/lib/i18n/server";
import { WorkspaceManagementPanel } from "@/features/workspaces/components/WorkspaceManagementPanel";
import { CreateWorkspaceButton } from "@/features/workspaces/components/CreateWorkspaceButton";
import {
  listAccessibleWorkspaces,
  resolveActiveWorkspaceIdForUser,
} from "@/server/workspaces/service";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Workspaces" };

export default async function WorkspacesSettingsPage() {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");

  const { t } = await getTranslator("workspace");
  const [workspaces, activeWorkspaceId] = await Promise.all([
    listAccessibleWorkspaces(auth.supabase, auth.user.id),
    resolveActiveWorkspaceIdForUser(auth.supabase, auth.user.id),
  ]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <PageHeader
        title={t("manageTitle")}
        description={t("manageDescription")}
        action={<CreateWorkspaceButton />}
      />
      <WorkspaceManagementPanel workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />
      <p className="text-xs text-muted-foreground">{t("renameUnsupported")}</p>
    </div>
  );
}
