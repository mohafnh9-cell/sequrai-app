"use client";

import { Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { LanguageSelector } from "@/components/shared/LanguageSelector";

export function OnboardingPageHeader() {
  const { t } = useI18n("onboarding");

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4 text-center md:sticky md:top-12 md:items-start md:text-left">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" aria-hidden />
        </div>
        <LanguageSelector variant="compact" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("pageTitle")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("pageSubtitle")}</p>
      </div>
    </div>
  );
}
