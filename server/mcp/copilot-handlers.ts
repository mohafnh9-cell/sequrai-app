import "server-only";

import type { CopilotReadableContext } from "@/brain/copilot-contract";
import { buildProjectBrain } from "@/server/brain/build-project-brain";
import { assertProjectInOrg, type McpAuthContext } from "./auth";

export async function getProductionReadiness(
  ctx: McpAuthContext,
  projectId: string
): Promise<CopilotReadableContext & { productionLevel: string | null }> {
  await assertProjectInOrg(ctx.admin, ctx.organizationId, projectId);
  const brain = await buildProjectBrain(ctx.admin, projectId);
  if (!brain) throw new Error("Project brain unavailable");

  const score = brain.productionReady.overall;
  let productionLevel: string | null = null;
  if (score !== null) {
    if (score >= 90 && brain.productionReady.blockersCount === 0) {
      productionLevel = "Senior Engineer Approved";
    } else if (score >= 75) productionLevel = "Production Ready";
    else if (score >= 50) productionLevel = "Startup Ready";
    else if (score >= 25) productionLevel = "Beta Ready";
    else productionLevel = "Prototype";
  }

  return {
    projectId: brain.projectId,
    projectName: brain.projectName,
    productionReady: brain.productionReady,
    todayPriorities: brain.todayPriorities,
    coachTip: brain.coachTip,
    executiveSummary: brain.executiveSummary,
    recentActivity: brain.recentActivity,
    productionLevel,
  };
}

export async function getTodayPriorities(ctx: McpAuthContext, projectId: string) {
  const brain = await getProductionReadiness(ctx, projectId);
  return {
    projectId: brain.projectId,
    projectName: brain.projectName,
    priorities: brain.todayPriorities,
    productionReadyScore: brain.productionReady.overall,
    blockersRemaining: brain.productionReady.blockersCount,
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

  const { data: latestScan } = await ctx.admin
    .from("scans")
    .select("id, security_score, completed_at")
    .eq("project_id", projectId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latestScan) {
    return { projectId, blockers: [], improvements: [], productionReadyScore: null };
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
    productionReadyScore: latestScan.security_score,
    blockers,
    improvements,
    blockersCount: blockers.length,
    improvementsCount: improvements.length,
  };
}
