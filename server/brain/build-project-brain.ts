import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BRAIN_VERSION,
  estimateRiskFromScan,
  type BrainActivityEvent,
  type BrainPriority,
  type ProjectBrainSnapshot,
} from "@/brain";
import {
  getCurrentProductionVerdict,
} from "@/server/production-verdict/service";
import {
  EMPTY_PRODUCTION_READY,
  prioritiesFromVerdict,
  productionReadyFromVerdict,
} from "./verdict-view-model";

function log(event: string, fields: Record<string, unknown>) {
  console.info({ component: "build-project-brain", event, ...fields });
}

export async function mergeProjectActivity(
  supabase: SupabaseClient,
  organizationId: string,
  projectId?: string,
  limit = 10
): Promise<BrainActivityEvent[]> {
  let activityQuery = supabase
    .from("repository_activity")
    .select("id, event_type, title, description, occurred_at")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (projectId) activityQuery = activityQuery.eq("project_id", projectId);

  let timelineQuery = supabase
    .from("security_timeline")
    .select("id, event_type, title, description, occurred_at")
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (projectId) timelineQuery = timelineQuery.eq("project_id", projectId);

  const [activity, timeline] = await Promise.all([activityQuery, timelineQuery]);

  const merged: BrainActivityEvent[] = [
    ...(activity.data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      occurredAt: row.occurred_at,
      source: "repository_activity" as const,
    })),
    ...(timeline.data ?? []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      title: row.title,
      description: row.description,
      occurredAt: row.occurred_at,
      source: "security_timeline" as const,
    })),
  ];

  return merged
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    .slice(0, limit);
}

export async function buildProjectBrain(
  supabase: SupabaseClient,
  projectId: string
): Promise<ProjectBrainSnapshot | null> {
  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, organization_id, name, github_repo, security_score, last_scan_at, webhook_enabled, repository_health"
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return null;

  const [scanState, health, latestScan, currentVerdict, priorities, latestReport, activity] =
    await Promise.all([
      supabase
        .from("repository_scan_state")
        .select("last_commit_sha, last_security_score, open_findings_count")
        .eq("repository_id", projectId)
        .maybeSingle(),
      supabase.from("repository_health").select("*").eq("project_id", projectId).maybeSingle(),
      supabase
        .from("scans")
        .select(
          "id, security_score, critical_count, high_count, medium_count, low_count, info_count, findings_count, completed_at, detected_stack"
        )
        .eq("project_id", projectId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getCurrentProductionVerdict(supabase, projectId).catch((error) => {
        log("verdict_read_failed", { projectId, error: String(error) });
        return null;
      }),
      supabase
        .from("ai_priorities")
        .select("rank, title, description, estimated_minutes")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_reports")
        .select("executive_summary, coach_tip, risk_score, security_score")
        .eq("project_id", projectId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      mergeProjectActivity(supabase, project.organization_id, projectId, 10),
    ]);

  const categoryCounts: Record<string, number> = {};
  if (latestScan.data?.id) {
    const { data: categoryRows } = await supabase
      .from("scan_findings")
      .select("category")
      .eq("scan_id", latestScan.data.id);
    for (const row of categoryRows ?? []) {
      const key = row.category.toLowerCase();
      categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
    }
  }

  const securityScore =
    latestScan.data?.security_score ??
    health.data?.security_score ??
    project.security_score ??
    scanState.data?.last_security_score ??
    null;

  const productionReady = currentVerdict
    ? productionReadyFromVerdict(currentVerdict)
    : EMPTY_PRODUCTION_READY;

  const todayPriorities: BrainPriority[] = currentVerdict
    ? prioritiesFromVerdict(currentVerdict)
    : (priorities.data ?? []).map((item, index) => ({
        rank: item.rank ?? index + 1,
        title: item.title,
        description: item.description,
        estimatedMinutes: item.estimated_minutes ?? undefined,
        source: "ai" as const,
      }));

  const stack = latestScan.data?.detected_stack as
    | { frameworks?: string[]; services?: string[] }
    | undefined;

  let riskScore = latestReport.data?.risk_score ?? health.data?.risk_score ?? null;
  if (riskScore === null && securityScore !== null && latestScan.data) {
    riskScore = estimateRiskFromScan({
      securityScore,
      severityCounts: {
        critical: latestScan.data.critical_count ?? 0,
        high: latestScan.data.high_count ?? 0,
        medium: latestScan.data.medium_count ?? 0,
        low: latestScan.data.low_count ?? 0,
        info: latestScan.data.info_count ?? 0,
      },
      categoryCounts,
      findingsCount: latestScan.data.findings_count ?? 0,
      stack,
    });
  }

  if (!currentVerdict && latestScan.data) {
    log("verdict_missing_for_analyzed_repo", { projectId, scanId: latestScan.data.id });
  }

  return {
    projectId: project.id,
    organizationId: project.organization_id,
    projectName: project.name,
    githubRepo: project.github_repo,
    currentVerdict,
    productionReady,
    securityScore,
    riskScore,
    healthStatus: health.data?.health_status ?? project.repository_health ?? null,
    lastScanAt: project.last_scan_at ?? latestScan.data?.completed_at ?? null,
    lastCommitSha: currentVerdict?.commitSha ?? scanState.data?.last_commit_sha ?? null,
    webhookEnabled: project.webhook_enabled !== false,
    todayPriorities,
    coachTip: latestReport.data?.coach_tip ?? null,
    executiveSummary:
      currentVerdict?.executiveSummary ?? latestReport.data?.executive_summary ?? null,
    recentActivity: activity,
    snapshotAt: new Date().toISOString(),
    brainVersion: BRAIN_VERSION,
  };
}
