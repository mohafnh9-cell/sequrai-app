import "server-only";

import {
  explainProductionBlocker,
  getCoachTip,
  getProductionBlockers,
  getProductionReadiness,
  getProductionTimeline,
  getTodayPriorities,
} from "./copilot-handlers";
import { runProductionCheck } from "./scan-handlers";
import { McpError, type McpAuthContext } from "./auth";

export async function listProjects(ctx: McpAuthContext) {
  const { data: projects } = await ctx.admin
    .from("projects")
    .select("id, name, github_repo")
    .eq("organization_id", ctx.organizationId)
    .order("name");

  const { data: verdictRows } = await ctx.admin
    .from("production_verdicts")
    .select("project_id, score, blockers_count, status, generated_at")
    .eq("organization_id", ctx.organizationId)
    .order("generated_at", { ascending: false });

  const latestVerdictByProject = new Map<
    string,
    {
      project_id: string;
      score: number | null;
      blockers_count: number;
      status: string;
      generated_at: string;
    }
  >();
  for (const row of verdictRows ?? []) {
    if (!latestVerdictByProject.has(row.project_id)) {
      latestVerdictByProject.set(row.project_id, row);
    }
  }

  return {
    projects: (projects ?? []).map((project) => {
      const verdict = latestVerdictByProject.get(project.id);
      return {
        id: project.id,
        name: project.name,
        githubRepo: project.github_repo,
        productionReadyScore: verdict?.score ?? null,
        blockersCount: verdict?.blockers_count ?? null,
        verdictStatus: verdict?.status ?? "insufficient_data",
      };
    }),
  };
}

export async function executeMcpTool(
  ctx: McpAuthContext,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  switch (toolName) {
    case "list_projects":
      return listProjects(ctx);
    case "get_production_readiness": {
      const result = await getProductionReadiness(ctx, input.projectId as string);
      return {
        summary: result.verdictSummary,
        verdictLabel: result.verdictLabel,
        score: result.productionReady.overall,
        blockersCount: result.productionReady.blockersCount,
        priorities: result.todayPriorities.slice(0, 3),
        recommendedAction: result.recommendedAction,
        executiveSummary: result.executiveSummary,
        productionReady: result.productionReady,
        projectId: result.projectId,
        projectName: result.projectName,
        verdict: result.verdict,
        coachTip: result.coachTip,
        recentActivity: result.recentActivity,
      };
    }
    case "review_before_commit": {
      const result = await getProductionReadiness(ctx, input.projectId as string);
      return {
        summary: result.verdictSummary,
        verdict: result.verdictLabel,
        score: result.productionReady.overall,
        priorities: result.todayPriorities.slice(0, 3),
        recommendedAction: result.recommendedAction,
      };
    }
    case "review_current_changes":
    case "run_production_check":
      return runProductionCheck(
        ctx,
        input.projectId as string,
        (input.scanType as "full" | "incremental" | undefined) ?? "full"
      );
    case "get_today_priorities":
      return getTodayPriorities(ctx, input.projectId as string);
    case "get_coach_tip":
      return getCoachTip(ctx, input.projectId as string);
    case "get_timeline":
      return getProductionTimeline(ctx, input.projectId as string);
    case "explain_production_blocker":
    case "explain_issue":
    case "generate_blocker_fix":
      return explainProductionBlocker(
        ctx,
        input.projectId as string,
        input.findingId as string
      );
    case "get_production_blockers":
      return getProductionBlockers(
        ctx,
        input.projectId as string,
        typeof input.limit === "number" ? input.limit : 20
      );
    default:
      throw new McpError(404, "UNKNOWN_TOOL", `Unknown tool: ${toolName}`);
  }
}
