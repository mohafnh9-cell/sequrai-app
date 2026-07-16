import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BRAIN_VERSION,
  type OrgBrainSnapshot,
  type ProjectBrainSummary,
  type ReadinessDimensionKey,
  type ReadinessDimensions,
} from "@/brain";
import { buildProductionRoadmap } from "@/brain/production-experience/roadmap";
import { getProjectProductionStatus } from "@/brain/production-experience/project-status";
import { buildProjectBrain, mergeProjectActivity } from "./build-project-brain";

const DIMENSION_KEYS: ReadinessDimensionKey[] = [
  "security",
  "authentication",
  "databaseDesign",
  "bestPractices",
  "architecture",
  "performance",
  "deploymentReadiness",
];

function averageDimensions(
  dimensionSets: ReadinessDimensions[]
): ReadinessDimensions {
  const result = {} as ReadinessDimensions;
  for (const key of DIMENSION_KEYS) {
    const values = dimensionSets
      .map((set) => set[key])
      .filter((value): value is number => value !== null);
    result[key] =
      values.length > 0
        ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
        : null;
  }
  return result;
}

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
  const dimensionSets: ReadinessDimensions[] = [];
  let totalEstimatedMinutes = 0;

  for (const project of projects ?? []) {
    const brain = await buildProjectBrain(supabase, project.id);
    if (!brain) continue;
    summaries.push({
      projectId: brain.projectId,
      projectName: brain.projectName,
      productionReady: brain.productionReady.overall,
      blockersCount: brain.productionReady.blockersCount,
      healthStatus: brain.healthStatus,
      status: getProjectProductionStatus({
        score: brain.productionReady.overall,
        blockersCount: brain.productionReady.blockersCount,
      }),
    });
    if (brain.productionReady.overall !== null) {
      dimensionSets.push(brain.productionReady.dimensions);
      totalEstimatedMinutes += brain.productionReady.estimatedMinutesToReady;
    }
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

  const todayPriorities = (orgPriorities ?? []).map((item, index) => ({
    rank: item.rank ?? index + 1,
    title: item.title,
    description: item.description,
    estimatedMinutes: item.estimated_minutes ?? undefined,
    source: "ai" as const,
  }));

  const productionRoadmap = buildProductionRoadmap({
    currentScore: averageProductionReady,
    priorities: todayPriorities,
  });

  return {
    organizationId,
    averageProductionReady,
    averageDimensions: averageDimensions(dimensionSets),
    totalBlockers: summaries.reduce((sum, item) => sum + item.blockersCount, 0),
    totalEstimatedMinutes,
    productionRoadmap,
    projects: summaries,
    todayPriorities,
    recentActivity,
    snapshotAt: new Date().toISOString(),
    brainVersion: BRAIN_VERSION,
  };
}
