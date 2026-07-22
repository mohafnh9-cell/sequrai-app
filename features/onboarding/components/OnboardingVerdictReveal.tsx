"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductionVerdictHero } from "@/features/production-verdict/components/ProductionVerdictHero";
import { verdictExperienceFromVerdict } from "@/brain/production-verdict/experience-view";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { useI18n } from "@/lib/i18n/client";

function countCriticalAndHigh(verdict: ProductionVerdictV1): { critical: number; high: number } {
  let critical = 0;
  let high = 0;
  for (const priority of verdict.topPriorities) {
    if (priority.severity === "critical") critical += 1;
    if (priority.severity === "high") high += 1;
  }
  return { critical, high };
}

export function OnboardingVerdictReveal({
  verdict,
  projectId,
  onContinue,
}: {
  verdict: ProductionVerdictV1;
  projectId?: string | null;
  onContinue: () => void;
}) {
  const { t } = useI18n("onboarding");
  const [phase, setPhase] = useState<"building" | "reveal">("building");
  const view = verdictExperienceFromVerdict(verdict);
  const { critical, high } = countCriticalAndHigh(verdict);
  const topPriority = verdict.topPriorities[0] ?? null;

  useEffect(() => {
    const timer = window.setTimeout(() => setPhase("reveal"), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const blockerLine =
    view.blockersCount > 0
      ? t("blockersIntro", { count: view.blockersCount })
      : view.statusMessage;

  return (
    <div className="space-y-8 min-h-[420px]">
      {phase === "building" ? (
        <div className="rounded-3xl border border-border/60 bg-secondary/20 p-10 text-center animate-in fade-in duration-500">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm font-medium">{t("verdictBuilding")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("verdictBuildingHint")}</p>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-700">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary text-center sm:text-left">
            {t("productionVerdictLabel")}
          </p>
          <ProductionVerdictHero verdict={verdict} view={view} variant="product" />

          <div className="rounded-2xl border border-border/60 bg-secondary/20 p-5 text-sm space-y-3">
            <p className="leading-relaxed">{blockerLine}</p>
            {(critical > 0 || high > 0) && (
              <p className="text-muted-foreground">
                {t("criticalHighSummary", { critical, high })}
              </p>
            )}
            {topPriority ? (
              <div className="border-t border-border/50 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("nextActionLabel")}
                </p>
                <p className="mt-1 font-medium">{topPriority.title}</p>
                <p className="mt-1 text-muted-foreground">{topPriority.recommendedAction}</p>
              </div>
            ) : view.status === "ready_to_ship" ? (
              <p className="text-muted-foreground">{t("readyNoBlockers")}</p>
            ) : null}
            {view.estimatedFixMinutes > 0 && view.status !== "ready_to_ship" && (
              <p>{t("estimatedProduction", { minutes: view.estimatedFixMinutes })}</p>
            )}
          </div>

          <Button className="w-full h-12 text-base" size="lg" onClick={onContinue}>
            {t("viewProductionVerdict")}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
          </Button>
          {projectId && (
            <p className="text-xs text-center text-muted-foreground">{t("verdictContinueHint")}</p>
          )}
        </div>
      )}
    </div>
  );
}
