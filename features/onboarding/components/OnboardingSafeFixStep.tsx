"use client";

import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fixPromptInputFromPriority } from "@/brain/fix-prompt";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { CopySafeFixPromptButton } from "@/features/production-verdict/components/CopySafeFixPromptButton";
import { SafeFixMetrics } from "@/features/production-verdict/components/SafeFixMetrics";
import { useI18n } from "@/lib/i18n/client";

export function OnboardingSafeFixStep({
  verdict,
  projectName,
  onContinue,
}: {
  verdict: ProductionVerdictV1;
  projectName?: string;
  onContinue: () => void;
}) {
  const { t } = useI18n("onboarding");
  const { t: tc } = useI18n("common");
  const topPriority = verdict.topPriorities[0] ?? null;

  const fixPromptInput = useMemo(() => {
    if (!topPriority) return null;
    return fixPromptInputFromPriority(topPriority, {
      projectName,
      currentVerdictStatus: verdict.status,
      currentScore: verdict.score,
    });
  }, [projectName, topPriority, verdict.score, verdict.status]);

  const readyToShip = verdict.status === "ready_to_ship" || !topPriority;

  if (readyToShip) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
        <div className="rounded-3xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
            <Sparkles className="h-7 w-7 text-emerald-400" aria-hidden />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("safeFixReadyTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{t("safeFixReadyBody")}</p>
        </div>
        <Button className="w-full" size="lg" onClick={onContinue}>
          {t("connectCursorNext")}
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700">
      <div className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-medium uppercase tracking-[0.22em] text-primary">{t("safeFixEyebrow")}</p>
        <h2 className="text-2xl font-semibold tracking-tight">{t("safeFixTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("safeFixSubtitle")}</p>
      </div>

      <div className="rounded-3xl border border-primary/25 bg-gradient-to-b from-primary/10 via-[#101014]/80 to-[#101014]/60 p-6 sm:p-8 shadow-[0_0_80px_-20px_rgba(var(--primary-rgb,99,102,241),0.35)]">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-3">
          {t("fixThisFirst")}
        </p>
        <h3 className="text-xl sm:text-2xl font-semibold leading-snug tracking-tight">{topPriority!.title}</h3>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{topPriority!.reason}</p>

        {fixPromptInput && (
          <div className="mt-6 border-t border-border/50 pt-6">
            <SafeFixMetrics input={fixPromptInput} />
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {fixPromptInput && (
            <CopySafeFixPromptButton
              input={fixPromptInput}
              source="priority"
              priorityId={topPriority!.id}
              size="default"
              variant="default"
              className="w-full sm:flex-1 h-12 text-base"
            />
          )}
          <Button
            variant="outline"
            className="w-full sm:flex-1 h-12 text-base"
            onClick={() => {
              window.open("cursor://", "_self");
            }}
          >
            {t("openCursor")}
          </Button>
        </div>

        <p className="mt-4 text-xs text-muted-foreground text-center sm:text-left">{t("safeFixHint")}</p>
      </div>

      <Button className="w-full" size="lg" variant="secondary" onClick={onContinue}>
        {tc("continue")}
        <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
      </Button>
    </div>
  );
}
