import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { getTranslator } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { McpApiKeysPanel } from "@/features/settings/McpApiKeysPanel";
import { VerdictAutopilotToggle } from "@/features/autopilot/components/VerdictAutopilotToggle";
import { isVerdictAutopilotEnabled } from "@/server/autopilot";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { t } = await getTranslator("settings");
  const { t: ta } = await getTranslator("autopilotExperience");

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

  const org = membership?.organization as {
    id: string;
    name: string;
    slug: string;
    plan: string;
    verdict_autopilot_enabled?: boolean;
  } | null;

  const autopilotEnabled = org
    ? await isVerdictAutopilotEnabled(supabase, org.id)
    : true;

  const displayName =
    profile?.full_name ??
    user.user_metadata?.full_name ??
    user.email?.split("@")[0] ??
    "User";

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      <PageHeader title={t("title")} description={t("subtitle")} />

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("languageTitle")}</CardTitle>
          <CardDescription>{t("languageSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSelector variant="settings" />
        </CardContent>
      </Card>

      {org && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{ta("settings.title")}</CardTitle>
            <CardDescription>{ta("settings.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <VerdictAutopilotToggle enabled={autopilotEnabled} />
            <p className="text-xs text-muted-foreground">
              {autopilotEnabled ? ta("settings.enabledHelp") : ta("settings.disabledHelp")}
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("profileTitle")}</CardTitle>
          <CardDescription>{t("profileSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("displayName")}</Label>
            <Input defaultValue={displayName} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>{t("email")}</Label>
            <Input defaultValue={user.email ?? ""} disabled />
          </div>
          <Button size="sm" variant="outline" disabled>
            {t("saveSoon")}
          </Button>
        </CardContent>
      </Card>

      {org && (
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t("organizationTitle")}</CardTitle>
            <CardDescription>{t("organizationSubtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("organizationName")}</Label>
              <Input defaultValue={org.name} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>{t("plan")}</Label>
              <div>
                <Badge variant="secondary">{org.plan}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <McpApiKeysPanel />

      <Card className="border-destructive/30">
        <CardHeader className="pb-4">
          <CardTitle className="text-base text-destructive">{t("dangerTitle")}</CardTitle>
          <CardDescription>{t("dangerSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm" disabled>
            Delete account — coming soon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
