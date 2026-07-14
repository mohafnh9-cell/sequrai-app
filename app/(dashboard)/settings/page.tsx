import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const org = membership?.organization as { id: string; name: string; slug: string; plan: string } | null;

  const displayName =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "User";

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <PageHeader title="Settings" description="Manage your account and organization." />

      {/* Profile */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your personal account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input defaultValue={displayName} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input defaultValue={user.email ?? ""} disabled />
          </div>
          <Button size="sm" variant="outline" disabled>
            Save changes — coming soon
          </Button>
        </CardContent>
      </Card>

      {/* Organization */}
      {org && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Organization</CardTitle>
            <CardDescription>Settings for your organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Organization name</Label>
              <Input defaultValue={org.name} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input defaultValue={org.slug} disabled />
            </div>
            <div className="flex items-center gap-2">
              <Label>Plan</Label>
              <Badge variant="secondary">{org.plan}</Badge>
            </div>
            <Button size="sm" variant="outline" disabled>
              Save changes — coming soon
            </Button>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Irreversible actions for your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="sm" variant="destructive" disabled>
            Delete account — coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
