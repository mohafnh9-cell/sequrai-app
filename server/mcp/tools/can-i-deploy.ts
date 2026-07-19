import "server-only";

import { getCurrentProductionVerdict } from "@/server/production-verdict/service";
import type { McpAuthContext } from "../auth";
import { McpError } from "../auth";
import { mapVerdictStatusToDecision } from "../decision-mapping";
import type { McpTranslator } from "../i18n";
import type { ProjectSelector } from "../project-resolution";
import { resolveMcpProject } from "../project-resolution";
import { buildProjectReportUrl } from "../report-url";
import { buildTextResponse } from "../response-format";
import { getStalenessInfo } from "../staleness";

export type CanIDeployInput = ProjectSelector;

export type CanIDeployBlocker = {
  id: string;
  title: string;
  severity: string;
  category: string;
};

export type CanIDeployResult = {
  mode: "production_review";
  project: { id: string; name: string; repositoryFullName: string | null };
  verdictStatus: string;
  score: number | null;
  scoreDelta: number | null;
  blockersCount: number;
  topBlockers: CanIDeployBlocker[];
  nextAction: string;
  evaluatedCoverage: {
    ratio: number | null;
    evaluatedAreas: number;
    partiallyEvaluatedAreas: number;
    unevaluatedAreas: number;
  };
  generatedAt: string;
  reviewedCommitSha: string | null;
  latestDetectedCommitSha: string | null;
  stale: boolean;
  reviewInProgress: boolean;
  deploymentRecommendation: "SHIP_IT" | "DO_NOT_DEPLOY" | "MORE_ANALYSIS_REQUIRED";
  reportUrl: string | null;
  summary: string;
};

/**
 * "Can I deploy this?" — retrieves the latest persisted canonical Production
 * Verdict and formats it. This handler never calculates score, status,
 * blockers, or recommendation inputs; those come only from the Production
 * Verdict Engine (ADR-001).
 */
export async function canIDeploy(
  ctx: McpAuthContext,
  input: CanIDeployInput,
  t: McpTranslator
): Promise<CanIDeployResult> {
  const project = await resolveMcpProject(ctx, input, t);

  const verdict = await getCurrentProductionVerdict(ctx.admin, project.id);
  if (!verdict) {
    throw new McpError(404, "no_verdict_available", t("errors.no_verdict_available"));
  }

  const staleness = await getStalenessInfo(ctx.admin, project.id, verdict.commitSha);

  const decision = mapVerdictStatusToDecision(verdict.status);
  const deploymentRecommendation =
    decision === "deploy" ? "SHIP_IT" : decision === "do_not_deploy" ? "DO_NOT_DEPLOY" : "MORE_ANALYSIS_REQUIRED";

  const topBlockers: CanIDeployBlocker[] = verdict.topPriorities.slice(0, 3).map((priority) => ({
    id: priority.id,
    title: priority.title,
    severity: priority.severity,
    category: priority.category,
  }));

  const lines: string[] = [];
  lines.push(t("canIDeploy.verdictLabel"));
  lines.push(verdict.status.toUpperCase().replace(/_/g, " "));
  lines.push("");
  lines.push(
    verdict.score != null ? t("canIDeploy.scoreLabel") : t("canIDeploy.scoreUnavailable")
  );
  if (verdict.score != null) lines.push(`${verdict.score} / 100`);
  lines.push("");
  lines.push(t("canIDeploy.blockersLabel"));
  lines.push(String(verdict.blockersCount));
  lines.push("");
  lines.push(t("canIDeploy.nextActionLabel"));
  lines.push(verdict.recommendedAction);
  lines.push("");
  lines.push(t("canIDeploy.recommendationLabel"));
  lines.push(
    decision === "deploy"
      ? t("canIDeploy.deploy")
      : decision === "do_not_deploy"
        ? t("canIDeploy.doNotDeploy")
        : t("canIDeploy.moreAnalysisRequired")
  );

  if (verdict.status === "insufficient_data") {
    lines.push("", t("canIDeploy.insufficientData"));
  }
  if (verdict.status === "analysis_failed") {
    lines.push("", t("canIDeploy.analysisFailed"));
  }
  if (staleness.reviewInProgress) {
    lines.push("", t("canIDeploy.reviewInProgress"));
  }
  if (staleness.stale) {
    lines.push(
      "",
      t("canIDeploy.staleWarning", { commitSha: staleness.latestDetectedCommitSha?.slice(0, 7) ?? "" })
    );
  }

  return {
    mode: "production_review",
    project,
    verdictStatus: verdict.status,
    score: verdict.score,
    scoreDelta: verdict.scoreDelta,
    blockersCount: verdict.blockersCount,
    topBlockers,
    nextAction: verdict.recommendedAction,
    evaluatedCoverage: {
      ratio: verdict.coverageRatio,
      evaluatedAreas: verdict.evaluatedAreas.length,
      partiallyEvaluatedAreas: verdict.partiallyEvaluatedAreas.length,
      unevaluatedAreas: verdict.unevaluatedAreas.length,
    },
    generatedAt: verdict.generatedAt,
    reviewedCommitSha: verdict.commitSha,
    latestDetectedCommitSha: staleness.latestDetectedCommitSha,
    stale: staleness.stale,
    reviewInProgress: staleness.reviewInProgress,
    deploymentRecommendation,
    reportUrl: buildProjectReportUrl(project.id),
    summary: buildTextResponse("production_review", t, lines),
  };
}
