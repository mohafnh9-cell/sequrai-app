"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductionVerdictHero } from "@/features/production-verdict/components/ProductionVerdictHero";
import { verdictExperienceFromVerdict } from "@/brain/production-verdict/experience-view";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingVerdictReveal({
  verdict,
  onContinue,
}: {
  verdict: ProductionVerdictV1;
  onContinue: () => void;
}) {
  const { t } = useI18n("onboarding");
  const [revealed, setRevealed] = useState(false);
  const view = verdictExperienceFromVerdict(verdict);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const blockerLine =
    view.blockersCount > 0
      ? t("blockersIntro", { count: view.blockersCount })
      : view.statusMessage;

  return (
    <div className="space-y-6">
      <div
        className={`transition-all duration-700 ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <ProductionVerdictHero verdict={verdict} view={view} />

        <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm space-y-2">
          <p>{blockerLine}</p>
          {view.estimatedFixMinutes > 0 && view.status !== "ready_to_ship" && (
            <p>{t("estimatedProduction", { minutes: view.estimatedFixMinutes })}</p>
          )}
          {view.projectedScore != null && view.showScore && (
            <p>{t("projectedScore", { score: view.projectedScore })}</p>
          )}
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={onContinue}
        disabled={!revealed}
      >
        {t("reviewFastestPath")}
      </Button>
    </div>
  );
}
