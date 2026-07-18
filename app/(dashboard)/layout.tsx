import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { QueryProvider } from "@/lib/query/provider";
import { I18nShell } from "@/components/shared/I18nShell";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import type { Metadata } from "next";

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

  return (
    <I18nShell userId={auth.user.id}>
      <QueryProvider>
        <DashboardShell user={auth.user} orgName={auth.orgName ?? undefined} bypass={auth.bypass}>
          {children}
        </DashboardShell>
      </QueryProvider>
    </I18nShell>
  );
}
