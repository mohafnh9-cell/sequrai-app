import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Users, Crown, Shield, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Team" };

const ROLE_ICONS = {
  OWNER: Crown,
  ADMIN: Shield,
  MEMBER: User,
} as const;

const ROLE_LABELS = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
} as const;

export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/onboarding");

  const { data: members } = await supabase
    .from("organization_members")
    .select("*, profile:profiles(id, full_name, email, avatar_url)")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: true });

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <PageHeader
        title="Team"
        description={`${members?.length ?? 0} member${(members?.length ?? 0) !== 1 ? "s" : ""} in this organization`}
      />

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>People with access to this organization.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {!members || members.length === 0 ? (
            <EmptyState icon={Users} title="No members found" />
          ) : (
            <div className="space-y-2">
              {members.map((member) => {
                const profile = member.profile as {
                  id: string;
                  full_name: string | null;
                  email: string | null;
                  avatar_url: string | null;
                } | null;
                const role = member.role as keyof typeof ROLE_LABELS;
                const RoleIcon = ROLE_ICONS[role] ?? User;
                const displayName =
                  profile?.full_name ?? profile?.email?.split("@")[0] ?? "Unknown";

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/10 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary uppercase">
                        {displayName.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {profile?.email ?? "No email"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="gap-1.5 text-xs">
                      <RoleIcon className="h-3 w-3" />
                      {ROLE_LABELS[role] ?? role}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
