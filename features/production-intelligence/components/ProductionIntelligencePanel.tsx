"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import type { ProductionIntelligence } from "@/brain/production-intelligence/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictStatusBadge } from "@/features/production-verdict/components/VerdictStatusBadge";
import { useI18n } from "@/lib/i18n/client";
import { useDemoNavigation } from "@/features/demo/use-demo-navigation";
import { trackEvent } from "@/lib/analytics/track";
import type { ProductionPriority } from "@/brain/production-verdict/schema";
import { fixPromptInputFromPriority } from "@/brain/fix-prompt";
import type { FixPromptContext } from "@/features/production-verdict/fix-prompt-context";
import { CopySafeFixPromptButton } from "@/features/production-verdict/components/CopySafeFixPromptButton";

function MomentumIcon({ momentum }: { momentum: ProductionIntelligence["momentum"] }) {
  if (momentum === "improving") {
    return <TrendingUp className="h-4 w-4 text-[#64D98B]" aria-hidden />;
  }
  if (momentum === "declining") {
    return <TrendingDown className="h-4 w-4 text-[#FF5C6C]" aria-hidden />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

export function ProductionIntelligencePanel({
  intelligence,
  projectId,
  latestReportHref,
  compact = false,
  topPriority,
  fixPromptContext,
}: {
  intelligence: ProductionIntelligence;
  projectId: string;
  latestReportHref?: string;
  compact?: boolean;
  topPriority?: ProductionPriority | null;
  fixPromptContext?: FixPromptContext;
}) {
  const { t } = useI18n("productionIntelligence");
  const { t: tj } = useI18n("productionJourney");
  const { href } = useDemoNavigation();

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/demo")) return;
    trackEvent("production_intelligence_viewed", { projectId });
  }, [projectId]);

  const action = intelligence.recommendedAction;
  const ctaHref =
    action.ctaKey === "recommendedAction.viewReportCta" && latestReportHref
      ? href(latestReportHref)
      : action.ctaKey === "recommendedAction.viewJourneyCta"
        ? href(`/projects/${projectId}/journey`)
        : href(`/projects/${projectId}`);

  const emptyMessage = intelligence.emptyState
    ? t(`emptyStates.${intelligence.emptyState}`)
    : null;

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t("panelTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("panelSubtitle")}</p>
        </div>
      )}

      {compact && (
        <h2 className="text-base font-semibold tracking-tight">{t("panelTitle")}</h2>
      )}

      {emptyMessage && (
        <Card className="border-dashed border-border/70">
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className={compact ? "space-y-4" : "grid gap-4 lg:grid-cols-2"}>
        {!compact && (
        <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("currentStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              {intelligence.currentStatus && (
                <VerdictStatusBadge status={intelligence.currentStatus} />
              )}
              {intelligence.currentScore != null && (
                <p className="text-3xl font-bold">{intelligence.currentScore}</p>
              )}
              {intelligence.scoreDelta != null && intelligence.scoreDelta !== 0 && (
                <Badge variant="outline" className="text-xs">
                  {intelligence.scoreDelta > 0 ? "+" : ""}
                  {intelligence.scoreDelta}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("productionMomentum")}
              </p>
              <p className="flex items-center gap-2 text-sm font-medium mt-1">
                <MomentumIcon momentum={intelligence.momentum} />
                {t(`momentum.${intelligence.momentum}`)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t(intelligence.momentumExplanationKey)}
              </p>
            </div>
          </CardContent>
        </Card>
        )}

        <Card className={compact ? "border-border/50" : "border-border/50"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" aria-hidden />
              {t("recommendedNextAction")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-medium text-sm">{t(action.titleKey)}</p>
            {action.priorityTitle && (
              <p className="text-sm text-foreground">{action.priorityTitle}</p>
            )}
            {action.descriptionKey && (
              <p className="text-xs text-muted-foreground">{t(action.descriptionKey)}</p>
            )}
            {action.estimatedMinutes != null && action.estimatedMinutes > 0 && (
              <p className="text-xs text-muted-foreground">
                {t("estimatedPath")}: {t("minutes", { count: action.estimatedMinutes })}
              </p>
            )}
            {action.ctaKey && (
              <div className="flex flex-wrap gap-2">
                {action.type === "fix_blocker" && topPriority && (
                  <CopySafeFixPromptButton
                    input={fixPromptInputFromPriority(topPriority, {
                      projectName: fixPromptContext?.projectName,
                      stack: fixPromptContext?.stack,
                      currentVerdictStatus:
                        fixPromptContext?.currentVerdictStatus ?? intelligence.currentStatus ?? undefined,
                      currentScore: fixPromptContext?.currentScore ?? intelligence.currentScore,
                    })}
                    source="intelligence"
                    priorityId={topPriority.id}
                  />
                )}
                <Button size="sm" asChild>
                  <Link
                    href={ctaHref}
                    onClick={() =>
                      trackEvent("production_intelligence_cta_clicked", {
                        projectId,
                        action: action.type,
                      })
                    }
                  >
                    {t(action.ctaKey)}
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {!compact && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("whatChangedTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!intelligence.whatChanged.hasChanges ? (
                <p className="text-sm text-muted-foreground">{t("noSignificantChanges")}</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {intelligence.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        {t("latestImprovements")}
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {intelligence.improvements.map((item) => (
                          <li key={item.id} className="flex gap-2">
                            <TrendingUp className="h-4 w-4 shrink-0 text-[#64D98B]" aria-hidden />
                            {t(item.messageKey, item.params)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {intelligence.regressions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                        {t("latestRegressions")}
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {intelligence.regressions.map((item) => (
                          <li key={item.id} className="flex gap-2">
                            <TrendingDown className="h-4 w-4 shrink-0 text-[#FF5C6C]" aria-hidden />
                            {t(item.messageKey, item.params)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("weeklyReviewTitle")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("last7Days")}</p>
                  <p className="font-medium mt-1">
                    {intelligence.weeklyReview.period7d.scoreChange != null
                      ? `${intelligence.weeklyReview.period7d.scoreChange > 0 ? "+" : ""}${intelligence.weeklyReview.period7d.scoreChange}`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {intelligence.weeklyReview.period7d.blockersResolved}{" "}
                    {t("blockersResolved")}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("last30Days")}</p>
                  <p className="font-medium mt-1">
                    {intelligence.weeklyReview.period30d.scoreChange != null
                      ? `${intelligence.weeklyReview.period30d.scoreChange > 0 ? "+" : ""}${intelligence.weeklyReview.period30d.scoreChange}`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {intelligence.weeklyReview.period30d.blockersResolved}{" "}
                    {t("blockersResolved")}
                  </p>
                </div>
                {intelligence.weeklyReview.estimatedMinutesToImprovement != null &&
                  intelligence.weeklyReview.estimatedMinutesToImprovement > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("estimatedPath")}:{" "}
                      {t("minutes", {
                        count: intelligence.weeklyReview.estimatedMinutesToImprovement,
                      })}
                    </p>
                  )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("projectHealth")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("currentFocus")}</p>
                  <p className="font-medium mt-0.5">
                    {intelligence.currentFocusKey
                      ? tj(intelligence.currentFocusKey)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("scoreEvolutionSummary")}</p>
                  <p className="font-medium mt-0.5">
                    {intelligence.journeySummary.scoreChange7d != null
                      ? `${intelligence.journeySummary.scoreChange7d > 0 ? "+" : ""}${intelligence.journeySummary.scoreChange7d} (7d)`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Best</p>
                  <p className="font-medium mt-0.5">{intelligence.bestScore ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blockers</p>
                  <p className="font-medium mt-0.5">{intelligence.currentBlockers}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {intelligence.currentFocusKey && intelligence.focusExplanationKey && (
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("currentFocus")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{tj(intelligence.currentFocusKey)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t(intelligence.focusExplanationKey)}
                </p>
              </CardContent>
            </Card>
          )}

          {intelligence.insights.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                  {t("productionInsights")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {intelligence.insights.map((insight) => (
                    <li key={insight.id} className="flex gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      {t(insight.messageKey, insight.params)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/projects/${projectId}/journey`}>{t("viewJourney")}</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
