"use client";

import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { verdictExperienceFromVerdict } from "@/brain/production-verdict/experience-view";
import { ProductionVerdictHero } from "./ProductionVerdictHero";
import { FastestPathForward } from "./FastestPathForward";
import { ProjectedScorePanel } from "./ProjectedScorePanel";
import { ScoreDeltaSummary } from "./ScoreDeltaSummary";
import { CoverageBreakdown } from "./CoverageBreakdown";
import { ProductionEngineerSummary } from "./ProductionEngineerSummary";
import { trackEvent } from "@/lib/analytics/track";
import { useEffect } from "react";

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
  latestScanHref,
}: {
  verdict: ProductionVerdictV1;
  projectId: string;
  lastScanAt?: string | null;
  webhookEnabled?: boolean;
  latestScanHref?: string;
}) {
  const view = verdictExperienceFromVerdict(verdict);

  return (
    <ProductionVerdictHero
      verdict={verdict}
      view={view}
      reportHref={latestScanHref ? `${latestScanHref}/report` : undefined}
      retryHref={`/projects/${projectId}`}
    />
  );
}
