import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSelector } from "@/components/shared/LanguageSelector";
import { getTranslator } from "@/lib/i18n/server";
import type { Metadata } from "next";
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

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const org = membership?.organization as {
    id: string;
    name: string;
    verdict_autopilot_enabled?: boolean;
  } | null;

  const autopilotEnabled = org
    ? await isVerdictAutopilotEnabled(supabase, org.id)
    : true;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <PageHeader title={t("title")} description={t("subtitle")} />

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
          <CardTitle className="text-base">{t("languageTitle")}</CardTitle>
          <CardDescription>{t("languageSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSelector variant="settings" />
        </CardContent>
      </Card>
    </div>
  );
}
