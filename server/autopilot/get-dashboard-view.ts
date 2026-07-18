import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAutopilotDashboardView,
  type AutopilotDashboardView,
} from "@/brain/autopilot-experience";
import { mapScanStatusToReviewStatus } from "@/brain/automatic-review";
import { buildRepositoryStatusView } from "@/brain/repository-sync";
import { getCurrentProductionVerdict } from "@/server/production-verdict/service";
import { createAdminClient } from "@/server/security-scanner/admin-client";
import { isVerdictAutopilotEnabled } from "./is-enabled";

export async function getAutopilotDashboardView(
  supabase: SupabaseClient,
  organizationId: string
): Promise<AutopilotDashboardView> {
  const orgAutopilotEnabled = await isVerdictAutopilotEnabled(supabase, organizationId);

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, github_repo, github_repository_id, webhook_enabled")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (!projects?.length) {
    return buildAutopilotDashboardView({ orgAutopilotEnabled, projects: [] });
  }

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const projectInputs = await Promise.all(
    projects.map(async (project) => {
      const [{ data: webhookRow }, { data: latestReview }, activeScanResult] =
        await Promise.all([
          supabase
            .from("github_webhooks")
            .select("active")
            .eq("project_id", project.id)
            .maybeSingle(),
          supabase
            .from("scans")
            .select("id, status, completed_at, failed_at, created_at, review_type")
            .eq("repository_id", project.id)
            .eq("review_type", "automatic")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          admin
            ? admin
                .from("scans")
                .select("id")
                .eq("repository_id", project.id)
                .in("status", [
                  "queued",
                  "fetching_repository",
                  "indexing",
                  "scanning",
                  "calculating_score",
                ])
                .limit(1)
                .maybeSingle()
            : Promise.resolve({ data: null, error: null }),
        ]);

      const connection = buildRepositoryStatusView({
        githubRepo: project.github_repo,
        githubRepositoryId: project.github_repository_id,
        webhookEnabled: project.webhook_enabled,
        webhookActive: webhookRow?.active ?? null,
        hasWebhookRegistration: Boolean(webhookRow),
        hasOrganizationToken: true,
        lastError: null,
        detectedAt: null,
        branch: null,
        commitSha: null,
        commitMessage: null,
        pushedAt: null,
      });

      const reviewStatus = latestReview
        ? mapScanStatusToReviewStatus(latestReview.status)
        : null;

      let verdictUpdated: boolean | null = null;
      if (latestReview && reviewStatus === "completed") {
        const verdict = await getProductionVerdictByScanSafe(
          supabase,
          latestReview.id
        );
        verdictUpdated = Boolean(verdict);
      }

      const verdict = await getCurrentProductionVerdict(supabase, project.id).catch(
        () => null
      );

      return {
        projectId: project.id,
        projectName: project.name,
        autopilotEnabled: orgAutopilotEnabled,
        repositoryConnected: connection.connectionStatus === "connected",
        repositoryWaitingForChanges: connection.display === "connected_waiting",
        hasActiveReview: Boolean(activeScanResult.data),
        latestAutomaticReviewStatus: reviewStatus,
        latestAutomaticReviewAt:
          latestReview?.completed_at ??
          latestReview?.failed_at ??
          latestReview?.created_at ??
          null,
        verdictUpdated,
        currentStatus: verdict?.status ?? null,
        scoreDelta: verdict?.scoreDelta ?? null,
      };
    })
  );

  return buildAutopilotDashboardView({
    orgAutopilotEnabled,
    projects: projectInputs,
  });
}

async function getProductionVerdictByScanSafe(
  client: SupabaseClient,
  scanId: string
) {
  const { data } = await client
    .from("production_verdicts")
    .select("id")
    .eq("scan_id", scanId)
    .maybeSingle();
  return data;
}
