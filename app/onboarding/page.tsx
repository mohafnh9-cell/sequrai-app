import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrgSetupForm } from "@/features/organizations/components/OrgSetupForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Set up your organization | SequrAI" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // If the user already has an org, skip onboarding
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Set up your organization</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Create a workspace to manage projects, team members, and security scans.
            </p>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Organization details</CardTitle>
            <CardDescription>This will be your team workspace in SequrAI.</CardDescription>
          </CardHeader>
          <CardContent>
            <OrgSetupForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
