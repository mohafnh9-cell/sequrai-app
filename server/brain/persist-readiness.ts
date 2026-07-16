import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateProductionReadiness } from "@/brain";

export async function persistProductionReadiness(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    scanId: string;
    securityScore: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    estimatedMinutesFromPriorities?: number;
  }
) {
  const { data: findings } = await admin
    .from("scan_findings")
    .select("category")
    .eq("scan_id", input.scanId);

  const categoryCounts: Record<string, number> = {};
  for (const row of findings ?? []) {
    const key = row.category.toLowerCase();
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
  }

  const productionReady = calculateProductionReadiness({
    securityScore: input.securityScore,
    severityCounts: {
      critical: input.criticalCount,
      high: input.highCount,
      medium: input.mediumCount,
      low: input.lowCount,
      info: input.infoCount,
    },
    categoryCounts,
    estimatedMinutesFromPriorities: input.estimatedMinutesFromPriorities,
  });

  await admin.from("production_readiness_scores").upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      scan_id: input.scanId,
      overall_score: productionReady.overall,
      dimensions: productionReady.dimensions,
      blockers_count: productionReady.blockersCount,
      improvements_count: productionReady.improvementsCount,
      estimated_minutes: productionReady.estimatedMinutesToReady,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "scan_id" }
  );

  return productionReady;
}
