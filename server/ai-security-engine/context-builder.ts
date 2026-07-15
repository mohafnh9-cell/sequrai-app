import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FindingContext, ProjectSecurityContext } from "@/features/ai-security-engine/types";

const MAX_FINDINGS = 40;
const MAX_SNIPPET = 240;

function summarizeFinding(row: Record<string, unknown>): FindingContext {
  return {
    id: String(row.id),
    ruleId: String(row.rule_id),
    title: String(row.title),
    description: String(row.description),
    severity: String(row.severity),
    confidence: String(row.confidence),
    category: String(row.category),
    filePath: String(row.file_path),
    startLine: Number(row.start_line),
    codeSnippet:
      typeof row.code_snippet === "string"
        ? row.code_snippet.slice(0, MAX_SNIPPET)
        : null,
    evidence:
      typeof row.evidence === "string" ? row.evidence.slice(0, MAX_SNIPPET) : null,
    recommendation: String(row.recommendation),
  };
}

export async function buildProjectSecurityContext(
  supabase: SupabaseClient,
  scanId: string
): Promise<ProjectSecurityContext | null> {
  const { data: scan, error: scanError } = await supabase
    .from("scans")
    .select(
      "id, organization_id, project_id, security_score, findings_count, critical_count, high_count, medium_count, low_count, info_count, detected_stack"
    )
    .eq("id", scanId)
    .maybeSingle();
  if (scanError || !scan) return null;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", scan.project_id)
    .maybeSingle();

  const { data: findings } = await supabase
    .from("scan_findings")
    .select(
      "id, rule_id, title, description, severity, confidence, category, file_path, start_line, code_snippet, evidence, recommendation"
    )
    .eq("scan_id", scanId)
    .order("severity", { ascending: true })
    .limit(MAX_FINDINGS);

  const { data: previousScans } = await supabase
    .from("scans")
    .select("security_score")
    .eq("project_id", scan.project_id)
    .eq("status", "completed")
    .not("security_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: patterns } = await supabase
    .from("security_patterns")
    .select("pattern_label")
    .eq("project_id", scan.project_id)
    .order("occurrence_count", { ascending: false })
    .limit(5);

  const severityCounts = {
    critical: scan.critical_count ?? 0,
    high: scan.high_count ?? 0,
    medium: scan.medium_count ?? 0,
    low: scan.low_count ?? 0,
    info: scan.info_count ?? 0,
  };

  const categoryCounts: Record<string, number> = {};
  for (const finding of findings ?? []) {
    const key = String(finding.category).toLowerCase();
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
  }

  const stackRaw = (scan.detected_stack ?? {}) as Record<string, unknown>;
  const stack = {
    languages: Array.isArray(stackRaw.languages) ? stackRaw.languages.map(String) : [],
    frameworks: Array.isArray(stackRaw.frameworks) ? stackRaw.frameworks.map(String) : [],
    services: Array.isArray(stackRaw.services) ? stackRaw.services.map(String) : [],
    packageManagers: Array.isArray(stackRaw.packageManagers)
      ? stackRaw.packageManagers.map(String)
      : [],
  };

  return {
    organizationId: scan.organization_id,
    projectId: scan.project_id,
    projectName: project?.name ?? "Project",
    scanId: scan.id,
    securityScore: scan.security_score ?? 0,
    findingsCount: scan.findings_count ?? findings?.length ?? 0,
    severityCounts,
    categoryCounts,
    stack,
    findings: (findings ?? []).map((row) => summarizeFinding(row as Record<string, unknown>)),
    previousScores: (previousScans ?? [])
      .map((item) => item.security_score)
      .filter((score): score is number => typeof score === "number"),
    recurringPatterns: (patterns ?? []).map((item) => String(item.pattern_label)),
  };
}
