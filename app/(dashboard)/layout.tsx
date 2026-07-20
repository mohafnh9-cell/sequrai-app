import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { QueryProvider } from "@/lib/query/provider";
import { I18nShell } from "@/components/shared/I18nShell";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import {
  listAccessibleWorkspaces,
  readProfileWorkspacePreference,
  resolveActiveWorkspaceId,
} from "@/server/workspaces/service";
import { readActiveWorkspaceCookie } from "@/server/workspaces/active-workspace-cookie";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | SequrAI",
  },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");

  let workspaces = auth.organizationId
    ? [
        {
          id: auth.organizationId,
          name: auth.orgName ?? "SequrAI",
          plan: null,
          logoUrl: null,
        },
      ]
    : [];

  if (!auth.bypass) {
    workspaces = await listAccessibleWorkspaces(auth.supabase, auth.user.id);
  }

  const [profilePreferenceId, cookieId] = auth.bypass
    ? [null, null]
    : await Promise.all([
        readProfileWorkspacePreference(auth.supabase, auth.user.id),
        readActiveWorkspaceCookie(),
      ]);

  const activeWorkspaceId = auth.bypass
    ? auth.organizationId
    : await resolveActiveWorkspaceId(auth.supabase, auth.user.id, {
        profilePreferenceId,
        cookieId,
      });

  return (
    <I18nShell userId={auth.user.id}>
      <QueryProvider>
        <DashboardShell
          user={auth.user}
          orgName={auth.orgName ?? undefined}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          bypass={auth.bypass}
        >
          {children}
        </DashboardShell>
      </QueryProvider>
    </I18nShell>
  );
}
