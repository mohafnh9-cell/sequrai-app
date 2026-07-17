import "server-only";

import type { CopilotReadableContext } from "@/brain/copilot-contract";
import { toLegacyVerdict } from "@/brain/production-verdict/adapters/legacy";
import { formatMcpVerdictSummary } from "@/brain/production-verdict/adapters/format";
import { VERDICT_STATUS_LABELS } from "@/brain/production-verdict/schema";
import { verdictRecommendedAction } from "@/brain/production-verdict/status-ui";
import { buildProjectBrain } from "@/server/brain/build-project-brain";
import { buildScanProductionVerdict } from "@/server/brain/build-scan-verdict";
import { assertProjectInOrg, type McpAuthContext } from "./auth";

async function buildProjectVerdict(ctx: McpAuthContext, projectId: string) {
  const brain = await buildProjectBrain(ctx.admin, projectId);
  if (!brain) return null;

  if (brain.currentVerdict) {
    return toLegacyVerdict(brain.currentVerdict);
  }

  const { data: latestScan } = await ctx.admin
    .from("scans")
    .select("id")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestScan?.id) return null;

  return buildScanProductionVerdict(ctx.admin, {
    scanId: latestScan.id,
    projectId,
    organizationId: brain.organizationId,
    persist: true,
  });
}

export async function getProductionReadiness(
  ctx: McpAuthContext,
  projectId: string
): Promise<
  CopilotReadableContext & {
    productionLevel: string | null;
    verdict: ReturnType<typeof toLegacyVerdict> | null;
    verdictSummary: string;
    verdictLabel: string;
    recommendedAction: string;
  }
> {
  await assertProjectInOrg(ctx.admin, ctx.organizationId, projectId);
  const brain = await buildProjectBrain(ctx.admin, projectId);
  if (!brain) throw new Error("Project brain unavailable");

  const verdict = await buildProjectVerdict(ctx, projectId);
  const status = brain.currentVerdict?.status ?? "insufficient_data";

  return {
    projectId: brain.projectId,
    projectName: brain.projectName,
    productionReady: brain.productionReady,
    todayPriorities: brain.todayPriorities,
    coachTip: brain.coachTip,
    executiveSummary: brain.executiveSummary,
    recentActivity: brain.recentActivity,
    productionLevel: VERDICT_STATUS_LABELS[status],
    verdict,
    verdictSummary: verdict
      ? formatMcpVerdictSummary(verdict.v1)
      : "Run a production analysis first.",
    verdictLabel: VERDICT_STATUS_LABELS[status],
    recommendedAction:
      brain.currentVerdict?.recommendedAction ??
      verdict?.recommendedAction ??
      verdictRecommendedAction(status, brain.productionReady.blockersCount),
  };
}

export async function getTodayPriorities(ctx: McpAuthContext, projectId: string) {
  const brain = await getProductionReadiness(ctx, projectId);
  return {
    verdict: brain.verdictLabel,
    productionReadyScore: brain.productionReady.overall,
    blockersRemaining: brain.productionReady.blockersCount,
    recommendedAction: brain.recommendedAction,
    projectId: brain.projectId,
    projectName: brain.projectName,
    priorities: brain.todayPriorities,
  };
}

export async function getCoachTip(ctx: McpAuthContext, projectId: string) {
  const brain = await getProductionReadiness(ctx, projectId);
  return {
    projectId: brain.projectId,
    projectName: brain.projectName,
    mentorTip:
      brain.coachTip ??
      "Focus on eliminating production blockers first — authentication, secrets, and deployment configuration have the highest impact on your Production Ready Score.",
    productionReadyScore: brain.productionReady.overall,
    verdict: brain.verdictLabel,
  };
}

export async function getProductionTimeline(ctx: McpAuthContext, projectId: string) {
  const brain = await getProductionReadiness(ctx, projectId);
  return {
    projectId: brain.projectId,
    projectName: brain.projectName,
    events: brain.recentActivity.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt,
      eventType: event.eventType,
    })),
  };
}

export async function explainProductionBlocker(
  ctx: McpAuthContext,
  projectId: string,
  findingId: string
) {
  await assertProjectInOrg(ctx.admin, ctx.organizationId, projectId);

  const { data: finding } = await ctx.admin
    .from("scan_findings")
    .select(
      "id, title, description, severity, category, file_path, start_line, recommendation, scan_id"
    )
    .eq("id", findingId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (!finding) {
    throw new Error("Production blocker not found");
  }

  const isBlocker = finding.severity === "critical" || finding.severity === "high";

  return {
    blockerId: finding.id,
    title: finding.title,
    category: finding.category,
    severity: finding.severity,
    isProductionBlocker: isBlocker,
    whyItBlocksProduction: finding.description,
    location: finding.file_path
      ? `${finding.file_path}${finding.start_line ? `:${finding.start_line}` : ""}`
      : null,
    recommendedFix: finding.recommendation,
    engineerNote: isBlocker
      ? "This issue prevents safe production deployment. Resolve it before shipping."
      : "This improvement will increase your Production Ready Score but does not block deployment.",
    cursorPrompt: finding.recommendation
      ? `Fix this production blocker in my codebase:\n\n${finding.title}\n${finding.description}\n\nRecommended approach:\n${finding.recommendation}`
      : undefined,
  };
}

export async function getProductionBlockers(
  ctx: McpAuthContext,
  projectId: string,
  limit = 20
) {
  await assertProjectInOrg(ctx.admin, ctx.organizationId, projectId);
  const brain = await buildProjectBrain(ctx.admin, projectId);

  const { data: latestScan } = await ctx.admin
    .from("scans")
    .select("id, completed_at")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestScan) {
    return {
      projectId,
      blockers: [],
      improvements: [],
      productionReadyScore: brain?.productionReady.overall ?? null,
      blockersCount: brain?.productionReady.blockersCount ?? 0,
    };
  }

  const { data: findings } = await ctx.admin
    .from("scan_findings")
    .select("id, title, severity, category, file_path, start_line, description")
    .eq("scan_id", latestScan.id)
    .in("severity", ["critical", "high", "medium", "low"])
    .order("severity", { ascending: true })
    .limit(limit);

  const blockers = (findings ?? []).filter(
    (f) => f.severity === "critical" || f.severity === "high"
  );
  const improvements = (findings ?? []).filter(
    (f) => f.severity === "medium" || f.severity === "low"
  );

  return {
    projectId,
    scanId: latestScan.id,
    productionReadyScore: brain?.productionReady.overall ?? null,
    blockers,
    improvements,
    blockersCount: brain?.productionReady.blockersCount ?? blockers.length,
    improvementsCount: improvements.length,
  };
}
