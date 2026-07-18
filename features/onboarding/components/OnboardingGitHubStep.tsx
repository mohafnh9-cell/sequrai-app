"use client";

import { useEffect } from "react";
import { OnboardingBackButton } from "./OnboardingBackButton";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startGitHubOAuth } from "@/lib/github/oauth-client";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingGitHubStep({
  onConnected,
  onBack,
}: {
  onConnected: () => void;
  onBack?: () => void;
}) {
  const { t } = useI18n("onboarding");

  useEffect(() => {
    const pending = localStorage.getItem("sequrai_github_connect");
    if (pending) {
      localStorage.removeItem("sequrai_github_connect");
      queueMicrotask(() => onConnected());
    }
  }, [onConnected]);

  const connect = async () => {
    localStorage.setItem("sequrai_github_connect", "1");
    await startGitHubOAuth("/onboarding?step=github");
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {onBack && <OnboardingBackButton onClick={onBack} label={t("backToStart")} />}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{t("connectGitHubTitle")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("connectGitHubBody")}</p>
      </div>

      <Button className="w-full gap-2" size="lg" onClick={() => void connect()}>
        <GitBranch className="h-4 w-4" aria-hidden />
        {t("connectGitHubCta")}
      </Button>

      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground">{t("viewScopes")}</summary>
        <p className="mt-2 pl-1">{t("scopesDetail")}</p>
      </details>
    </div>
  );
}
