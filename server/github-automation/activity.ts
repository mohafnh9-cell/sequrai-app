import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function recordRepositoryActivity(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    scanId?: string;
    eventType: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await admin.from("repository_activity").insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    scan_id: input.scanId ?? null,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    metadata: input.metadata ?? {},
    occurred_at: new Date().toISOString(),
  });
}

export async function recordTimelineEvent(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    scanId?: string;
    eventType: string;
    title: string;
    description?: string;
    securityScore?: number;
    metadata?: Record<string, unknown>;
  }
) {
  // ADR-001: risk_score is no longer computed; historical rows retain their
  // value, new rows persist null.
  await admin.from("security_timeline").insert({
    organization_id: input.organizationId,
    project_id: input.projectId,
    scan_id: input.scanId ?? null,
    event_type: input.eventType,
    title: input.title,
    description: input.description ?? null,
    security_score: input.securityScore ?? null,
    risk_score: null,
    metadata: input.metadata ?? {},
    occurred_at: new Date().toISOString(),
  });
}

export async function updateRepositoryHealth(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    healthStatus: string;
    securityScore: number;
    openFindings: number;
    criticalOpen: number;
    scoreTrend: number;
    factors: Record<string, unknown>;
  }
) {
  // ADR-001: risk_score is no longer computed. The column is preserved for
  // historical rows only; new rows persist null here.
  await admin.from("repository_health").upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      health_status: input.healthStatus,
      security_score: input.securityScore,
      risk_score: null,
      open_findings_count: input.openFindings,
      critical_open_count: input.criticalOpen,
      score_trend: input.scoreTrend,
      factors: input.factors,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "project_id" }
  );
  await admin
    .from("projects")
    .update({ repository_health: input.healthStatus })
    .eq("id", input.projectId)
    .eq("organization_id", input.organizationId);
}
