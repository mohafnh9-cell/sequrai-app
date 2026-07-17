"use client";

import Link from "next/link";
import { GitCommit, Clock, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import {
  projectSummaryCopy,
  verdictExperienceFromVerdict,
} from "@/brain/production-verdict/experience-view";
import { ProductionVerdictHero } from "./ProductionVerdictHero";
import { FastestPathForward } from "./FastestPathForward";
import { ProjectedScorePanel } from "./ProjectedScorePanel";
import { ScoreDeltaSummary } from "./ScoreDeltaSummary";
import { CoverageBreakdown } from "./CoverageBreakdown";
import { ProductionEngineerSummary } from "./ProductionEngineerSummary";
import { trackEvent } from "@/lib/analytics/track";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/client";
import { formatRelativeLocalized } from "@/lib/i18n/format";

export function ProductionVerdictExperience({
  verdict,
  projectId,
  scanId,
  scanCompleted = true,
  showEngineer = true,
  onReviewPriority,
}: {
  verdict: ProductionVerdictV1;
  projectId: string;
  scanId?: string;
  scanCompleted?: boolean;
  showEngineer?: boolean;
  onReviewPriority?: () => void;
}) {
  const view = verdictExperienceFromVerdict(verdict);
  const reportHref = scanId
    ? `/projects/${projectId}/scans/${scanId}/report`
    : undefined;
  const retryHref = `/projects/${projectId}`;

  useEffect(() => {
    trackEvent("verdict_viewed", {
      projectId,
      scanId: scanId ?? verdict.scanId,
      status: verdict.status,
      score: verdict.score,
    });
    if (verdict.topPriorities.length > 0) {
      trackEvent("roadmap_viewed", { projectId, scanId: scanId ?? verdict.scanId });
    }
  }, [projectId, scanId, verdict]);

  return (
    <div className="space-y-6">
      <ProductionVerdictHero
        verdict={verdict}
        view={view}
        reportHref={reportHref}
        retryHref={retryHref}
      />

      {verdict.topPriorities.length > 0 && view.status !== "ready_to_ship" && (
        <FastestPathForward
          priorities={verdict.topPriorities}
          onReviewPriority={onReviewPriority}
        />
      )}

      <ProjectedScorePanel view={view} />
      <ScoreDeltaSummary view={view} />

      {showEngineer && scanId && (
        <ProductionEngineerSummary
          scanId={scanId}
          verdict={verdict}
          scanCompleted={scanCompleted}
        />
      )}

      <CoverageBreakdown verdict={verdict} />
    </div>
  );
}

export function ProjectVerdictSummary({
  verdict,
  projectId,
  lastScanAt,
  webhookEnabled,
  latestScanHref,
}: {
  verdict: ProductionVerdictV1;
  projectId: string;
  lastScanAt: string | null;
  webhookEnabled?: boolean;
  latestScanHref?: string;
}) {
  const { locale } = useI18n();
  const { t } = useI18n("projects");
  const { t: tc } = useI18n("common");
  const view = verdictExperienceFromVerdict(verdict);
  const summary = projectSummaryCopy(verdict);

  const dateLabels = {
    never: tc("never"),
    justNow: tc("justNow"),
    minutesAgo: tc("minutesAgo"),
    hoursAgo: tc("hoursAgo"),
    daysAgo: tc("daysAgo"),
  };

  return (
    <div className="space-y-6">
      <ProductionVerdictHero
        verdict={verdict}
        view={view}
        reportHref={latestScanHref ? `${latestScanHref}/report` : undefined}
        retryHref={`/projects/${projectId}`}
      />

      <div className="rounded-xl border border-border/60 bg-[#101014]/50 p-5 space-y-4">
        <p className="text-sm leading-relaxed">{summary}</p>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {verdict.commitSha && (
            <span className="flex items-center gap-2">
              <GitCommit className="h-3.5 w-3.5" aria-hidden />
              {t("lastReviewed")}: <code>{verdict.commitSha.slice(0, 12)}</code>
            </span>
          )}
          {lastScanAt && (
            <span className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              {formatRelativeLocalized(locale, lastScanAt, dateLabels)}
            </span>
          )}
          <Badge variant={webhookEnabled === false ? "outline" : "secondary"} className="text-xs">
            {webhookEnabled === false ? t("automationPaused") : t("automationActive")}
          </Badge>
        </div>
        {verdict.topPriorities[0] && (
          <p className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-primary shrink-0" aria-hidden />
            {t("fastestNextAction")}: <strong>{verdict.topPriorities[0].title}</strong>
          </p>
        )}
        {latestScanHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={latestScanHref}>{t("openLatestAnalysis")}</Link>
          </Button>
        )}
      </div>

      {verdict.topPriorities.length > 0 && (
        <FastestPathForward priorities={verdict.topPriorities} />
      )}
    </div>
  );
}
