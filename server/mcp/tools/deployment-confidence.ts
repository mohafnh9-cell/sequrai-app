import "server-only";

import { getCurrentProductionVerdict } from "@/server/production-verdict/service";
import type { McpAuthContext } from "../auth";
import { McpError } from "../auth";
import { mapVerdictStatusToDecision, type DeploymentDecision } from "../decision-mapping";
import type { McpTranslator } from "../i18n";
import type { ProjectSelector } from "../project-resolution";
import { resolveMcpProject } from "../project-resolution";
import { buildTextResponse } from "../response-format";
import { getStalenessInfo } from "../staleness";

export type DeploymentConfidenceInput = ProjectSelector;

export type DeploymentConfidenceResult = {
  mode: "deployment_confidence";
  project: { id: string; name: string; repositoryFullName: string | null };
  decision: DeploymentDecision;
  confidenceBand: "high" | "medium" | "low";
  reason: string;
  blockersCount: number;
  coverageSummary: string;
  nextAction: string;
  reviewedCommitSha: string | null;
  latestDetectedCommitSha: string | null;
  stale: boolean;
  freshnessStatus: "current" | "stale" | "unknown";
  disclaimer: string;
  summary: string;
};

/**
 * "Would you deploy this if it were your own SaaS?" — translates the
 * canonical verdict into a fixed deploy / do-not-deploy / more-analysis
 * decision. This tool calculates nothing: decision comes from a documented
 * static mapping (../decision-mapping.ts) and confidenceBand is the
 * Production Verdict Engine's own `confidence` field (ADR-001).
 */
export async function deploymentConfidence(
  ctx: McpAuthContext,
  input: DeploymentConfidenceInput,
  t: McpTranslator
): Promise<DeploymentConfidenceResult> {
  const project = await resolveMcpProject(ctx, input, t);

  const verdict = await getCurrentProductionVerdict(ctx.admin, project.id);
  if (!verdict) {
    throw new McpError(404, "no_verdict_available", t("errors.no_verdict_available"));
  }

  const staleness = await getStalenessInfo(ctx.admin, project.id, verdict.commitSha);
  const engineDecision = mapVerdictStatusToDecision(verdict.status);
  // A failed automatic review is positive proof of an unreviewed newer
  // commit — never let a "deploy" recommendation stand on a verdict known to
  // be outdated for that reason. This still only translates already-known
  // facts (ADR-001): it does not recompute score, status, or blockers.
  const decision: DeploymentDecision =
    staleness.reviewFailed && engineDecision === "deploy" ? "more_analysis_required" : engineDecision;

  const reason =
    verdict.status === "insufficient_data"
      ? t("deploymentConfidence.reasons.insufficientData")
      : verdict.status === "analysis_failed"
        ? t("deploymentConfidence.reasons.analysisFailed")
        : verdict.blockersCount > 0
          ? t("deploymentConfidence.reasons.blockers", { count: verdict.blockersCount })
          : t("deploymentConfidence.reasons.ready");

  const totalAreas =
    verdict.evaluatedAreas.length + verdict.partiallyEvaluatedAreas.length + verdict.unevaluatedAreas.length;
  const coverageSummary =
    totalAreas > 0 ? `${verdict.evaluatedAreas.length}/${totalAreas}` : "—";

  const decisionLabel =
    decision === "deploy"
      ? t("deploymentConfidence.deploy")
      : decision === "do_not_deploy"
        ? t("deploymentConfidence.doNotDeploy")
        : t("deploymentConfidence.moreAnalysisRequired");

  const lines = [
    t("deploymentConfidence.recommendationLabel"),
    decisionLabel,
    "",
    t("deploymentConfidence.confidenceLabel"),
    verdict.confidence.toUpperCase(),
    "",
    t("deploymentConfidence.reasonLabel"),
    reason,
    "",
    t("deploymentConfidence.nextActionLabel"),
    verdict.recommendedAction,
  ];
  if (staleness.freshnessStatus === "stale") {
    lines.push("", t("deploymentConfidence.staleNote"));
  } else if (staleness.freshnessStatus === "unknown") {
    lines.push("", t("deploymentConfidence.freshnessUnknown"));
  }
  if (staleness.reviewFailed) {
    lines.push("", t("deploymentConfidence.reviewFailedWarning"));
  }

  return {
    mode: "deployment_confidence",
    project,
    decision,
    confidenceBand: verdict.confidence,
    reason,
    blockersCount: verdict.blockersCount,
    coverageSummary,
    nextAction: verdict.recommendedAction,
    reviewedCommitSha: verdict.commitSha,
    latestDetectedCommitSha: staleness.latestDetectedCommitSha,
    stale: staleness.stale,
    freshnessStatus: staleness.freshnessStatus,
    disclaimer: t("deploymentConfidence.disclaimer"),
    summary: buildTextResponse("deployment_confidence", t, lines),
  };
}
