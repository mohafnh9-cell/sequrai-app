"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { ProductionIntelligencePreview } from "@/brain/production-intelligence/schema";
import type { OrgBrainSnapshot } from "@/brain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";

export function DashboardProductionIntelligence({
  improvingCount,
  blockedCount,
  primaryPreview,
  primaryProjectId,
  primaryProjectName,
}: {
  improvingCount: number;
  blockedCount: number;
  primaryPreview: ProductionIntelligencePreview | null;
  primaryProjectId: string | null;
  primaryProjectName: string | null;
}) {
  const { t } = useI18n("productionIntelligence");
  const { t: tj } = useI18n("productionJourney");

  const MomentumIcon =
    primaryPreview?.momentum === "improving"
      ? TrendingUp
      : primaryPreview?.momentum === "declining"
        ? TrendingDown
        : Minus;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">{t("dashboard.title")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("dashboard.subtitle")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("dashboard.improvingProjects")}</p>
            <p className="text-xl font-bold mt-1">{improvingCount}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
            <p className="text-xs text-muted-foreground">{t("dashboard.blockedProjects")}</p>
            <p className="text-xl font-bold mt-1">{blockedCount}</p>
          </div>
          {primaryPreview && primaryProjectId && (
            <>
              <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("dashboard.doNext")}</p>
                <p className="text-sm font-medium mt-1 line-clamp-2">
                  {t(primaryPreview.recommendedAction.titleKey)}
                </p>
              </div>
              <div className="rounded-lg border border-border/60 bg-secondary/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("productionMomentum")}</p>
                <p className="flex items-center gap-1 font-medium mt-1">
                  <MomentumIcon className="h-3.5 w-3.5" aria-hidden />
                  {t(`momentum.${primaryPreview.momentum}`)}
                </p>
              </div>
            </>
          )}
        </div>

        {primaryPreview && primaryProjectId && primaryProjectName && (
          <Link
            href={`/projects/${primaryProjectId}`}
            className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div>
              <p className="font-medium">{primaryProjectName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {primaryPreview.currentScore != null && `${primaryPreview.currentScore}/100 · `}
                {primaryPreview.currentFocusKey
                  ? tj(primaryPreview.currentFocusKey)
                  : t("dashboard.whatChanged")}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
