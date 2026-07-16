import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BRAIN_VERSION, type OrgBrainSnapshot, type ProjectBrainSummary } from "@/brain";
import { buildProjectBrain, mergeProjectActivity } from "./build-project-brain";

export async function buildOrgBrain(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgBrainSnapshot> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  const summaries: ProjectBrainSummary[] = [];
  for (const project of projects ?? []) {
    const brain = await buildProjectBrain(supabase, project.id);
    if (!brain) continue;
    summaries.push({
      projectId: brain.projectId,
      projectName: brain.projectName,
      productionReady: brain.productionReady.overall,
      blockersCount: brain.productionReady.blockersCount,
      healthStatus: brain.healthStatus,
    });
  }

  const scored = summaries.filter((item) => item.productionReady !== null);
  const averageProductionReady =
    scored.length > 0
      ? Math.round(
          scored.reduce((sum, item) => sum + (item.productionReady ?? 0), 0) / scored.length
        )
      : null;

  const { data: orgPriorities } = await supabase
    .from("ai_priorities")
    .select("rank, title, description, estimated_minutes")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(5);

  const recentActivity = await mergeProjectActivity(supabase, organizationId, undefined, 15);

  return {
    organizationId,
    averageProductionReady,
    projects: summaries,
    todayPriorities: (orgPriorities ?? []).map((item, index) => ({
      rank: item.rank ?? index + 1,
      title: item.title,
      description: item.description,
      estimatedMinutes: item.estimated_minutes ?? undefined,
      source: "ai" as const,
    })),
    recentActivity,
    snapshotAt: new Date().toISOString(),
    brainVersion: BRAIN_VERSION,
  };
}
