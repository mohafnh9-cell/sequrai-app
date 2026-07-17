import "server-only";

import { InlineScanJobRunner } from "@/server/security-scanner/scan-job-runner";
import { resolveGitHubAccessToken } from "@/lib/github/resolve-token";
import { buildScanProductionVerdict } from "@/server/brain/build-scan-verdict";
import { formatMcpVerdictSummary } from "@/brain";
import { assertProjectInOrg, McpError, type McpAuthContext } from "./auth";

export async function runProductionCheck(
  ctx: McpAuthContext,
  projectId: string,
  scanType: "full" | "incremental" = "full"
) {
  const project = await assertProjectInOrg(ctx.admin, ctx.organizationId, projectId);
  if (!project.github_repo) {
    throw new McpError(
      422,
      "GITHUB_REQUIRED",
      "Connect a GitHub repository before running a production check"
    );
  }

  const providerToken = await resolveGitHubAccessToken(ctx.userId, null);
  if (!providerToken) {
    throw new McpError(
      403,
      "GITHUB_REAUTH_REQUIRED",
      "The API key owner must reconnect GitHub before running production checks"
    );
  }

  const { data: scan, error: insertError } = await ctx.admin
    .from("scans")
    .insert({
      organization_id: ctx.organizationId,
      project_id: projectId,
      repository_id: projectId,
      triggered_by_user_id: ctx.userId,
      trigger_type: "mcp",
      scan_type: scanType,
      status: "queued",
      progress: 0,
      progress_message: "Production check queued via MCP",
    })
    .select("id")
    .single();

  if (insertError || !scan) {
    throw new McpError(500, "SCAN_QUEUE_FAILED", "Could not queue production check");
  }

  const runner = new InlineScanJobRunner(ctx.admin);
  await runner.run({
    scanId: scan.id,
    repositoryId: projectId,
    organizationId: ctx.organizationId,
    githubRepo: project.github_repo,
    branch: "main",
    providerToken,
    scanType,
  });

  const { data: completed } = await ctx.admin
    .from("scans")
    .select(
      "id, status, security_score, critical_count, high_count, findings_count, completed_at"
    )
    .eq("id", scan.id)
    .single();

  let verdictSummary: string | null = null;
  if (completed?.status === "completed") {
    const verdict = await buildScanProductionVerdict(ctx.admin, {
      scanId: scan.id,
      projectId,
      organizationId: ctx.organizationId,
      securityScore: completed.security_score,
      severityCounts: {
        critical: completed.critical_count ?? 0,
        high: completed.high_count ?? 0,
        medium: 0,
        low: 0,
        info: 0,
      },
      findings: [],
    });
    verdictSummary = formatMcpVerdictSummary(verdict);
  }

  return {
    scanId: scan.id,
    status: completed?.status ?? "unknown",
    productionReadyScore: completed?.security_score ?? null,
    blockersCount: (completed?.critical_count ?? 0) + (completed?.high_count ?? 0),
    findingsCount: completed?.findings_count ?? 0,
    completedAt: completed?.completed_at ?? null,
    summary: verdictSummary,
    message:
      completed?.status === "completed"
        ? verdictSummary ?? "Production check completed."
        : "Production check did not complete successfully.",
  };
}
