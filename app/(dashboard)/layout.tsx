import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
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
        <div className="flex h-screen overflow-hidden bg-background">
          <DashboardSidebar user={auth.user} orgName={auth.orgName ?? undefined} />
          <main className="flex-1 overflow-y-auto">
            {auth.bypass && (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
                Auth bypass active (SEQURAI_BYPASS_AUTH) — remove before production
              </div>
            )}
            {children}
          </main>
        </div>
      </QueryProvider>
    </I18nShell>
  );
}
