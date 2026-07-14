import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { QueryProvider } from "@/lib/query/provider";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the org name for the sidebar
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization:organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const orgName =
    (membership?.organization as { name?: string } | null)?.name ?? undefined;

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <DashboardSidebar user={user} orgName={orgName} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </QueryProvider>
  );
}
