"use client";

import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingDashboardEntry() {
  const router = useRouter();
  const { t } = useI18n("onboarding");

  return (
    <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Shield className="h-7 w-7 text-primary" aria-hidden />
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-semibold">{t("dashboardReadyTitle")}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t("dashboardReadyBody")}</p>
      </div>
      <Button
        size="lg"
        className="w-full"
        onClick={() => {
          localStorage.setItem("sequrai_onboarding_complete", "1");
          router.push("/dashboard?firstVerdict=1");
        }}
      >
        {t("goToDashboard")}
      </Button>
    </div>
  );
}
