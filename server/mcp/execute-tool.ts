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

  const { data: scores } = await ctx.admin
    .from("production_readiness_scores")
    .select("project_id, overall_score, blockers_count, calculated_at")
    .eq("organization_id", ctx.organizationId)
    .order("calculated_at", { ascending: false });

  const latestScoreByProject = new Map<
    string,
    { project_id: string; overall_score: number | null; blockers_count: number; calculated_at: string }
  >();
  for (const score of scores ?? []) {
    if (!latestScoreByProject.has(score.project_id)) {
      latestScoreByProject.set(score.project_id, score);
    }
  }

  return {
    projects: (projects ?? []).map((project) => {
      const score = latestScoreByProject.get(project.id);
      return {
        id: project.id,
        name: project.name,
        githubRepo: project.github_repo,
        productionReadyScore: score?.overall_score ?? null,
        blockersCount: score?.blockers_count ?? null,
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
    case "get_production_readiness":
      return getProductionReadiness(ctx, input.projectId as string);
    case "get_today_priorities":
      return getTodayPriorities(ctx, input.projectId as string);
    case "get_coach_tip":
      return getCoachTip(ctx, input.projectId as string);
    case "get_timeline":
      return getProductionTimeline(ctx, input.projectId as string);
    case "explain_issue":
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
    case "run_production_check":
      return runProductionCheck(
        ctx,
        input.projectId as string,
        (input.scanType as "full" | "incremental" | undefined) ?? "full"
      );
    default:
      throw new McpError(404, "UNKNOWN_TOOL", `Unknown tool: ${toolName}`);
  }
}
