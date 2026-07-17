"use client";

import { Clock, GitBranch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OrgSetupForm } from "@/features/organizations/components/OrgSetupForm";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingWelcomeStep({
  hasOrg,
  onContinue,
}: {
  hasOrg: boolean;
  onContinue: () => void;
}) {
  const { t } = useI18n("onboarding");
  const { t: tc } = useI18n("common");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="space-y-3 text-center sm:text-left">
        <h2 className="text-2xl font-bold tracking-tight">{t("welcomeTitle")}</h2>
        <p className="text-base text-muted-foreground leading-relaxed">
          {t("welcomeSubtitle")}
          <br />
          <span className="text-foreground font-medium">{t("welcomeAsk")}</span>
        </p>
      </div>

      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
          <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>{t("timeRequired")}</span>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>{t("noCodeChanges")}</span>
        </li>
        <li className="flex items-start gap-3 rounded-lg border border-border/50 bg-secondary/20 p-3">
          <GitBranch className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden />
          <span>{t("githubRequired")}</span>
        </li>
      </ul>

      {!hasOrg ? (
        <div className="space-y-4 rounded-xl border border-border/50 p-4">
          <div className="space-y-1">
            <Label className="text-sm font-medium">{t("createWorkspace")}</Label>
            <p className="text-xs text-muted-foreground">{t("createWorkspaceHint")}</p>
          </div>
          <OrgSetupForm />
        </div>
      ) : (
        <Button className="w-full" size="lg" onClick={onContinue}>
          {tc("continue")}
        </Button>
      )}
    </div>
  );
}
