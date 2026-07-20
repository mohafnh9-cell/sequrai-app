import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildRepositoryStatusView,
  type RepositoryStatusView,
  type RepositorySyncErrorCode,
} from "@/brain/repository-sync";
import { getWorkspaceGitHubConnectionView } from "@/server/github/workspace-connection-service";

type SyncStatusRow = {
  branch: string | null;
  commit_sha: string | null;
  commit_message: string | null;
  pushed_at: string | null;
  detected_at: string | null;
  last_error: string | null;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  github_repo: string | null;
  github_repository_id: number | null;
  webhook_enabled: boolean | null;
};

function parseErrorCode(value: string | null): RepositorySyncErrorCode | null {
  if (
    value === "repository_disconnected" ||
    value === "invalid_github_connection" ||
    value === "missing_repository" ||
    value === "push_detection_failed"
  ) {
    return value;
  }
  return null;
}

export async function getRepositorySyncStatus(
  supabase: SupabaseClient,
  projectId: string,
  options?: { checkOrganizationToken?: boolean }
): Promise<RepositoryStatusView | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id, github_repo, github_repository_id, webhook_enabled")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) return null;

  const p = project as ProjectRow;

  const [{ data: syncRow }, { data: webhookRow }] = await Promise.all([
    supabase
      .from("repository_sync_status")
      .select("branch, commit_sha, commit_message, pushed_at, detected_at, last_error")
      .eq("project_id", projectId)
      .maybeSingle(),
    supabase
      .from("github_webhooks")
      .select("active")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);

  const sync = syncRow as SyncStatusRow | null;

  let hasOrganizationToken = true;
  if (options?.checkOrganizationToken !== false && p.github_repo) {
    const connection = await getWorkspaceGitHubConnectionView(supabase, p.organization_id);
    hasOrganizationToken = connection.status === "connected";
  }

  return buildRepositoryStatusView({
    githubRepo: p.github_repo,
    githubRepositoryId: p.github_repository_id,
    webhookEnabled: p.webhook_enabled,
    webhookActive: webhookRow?.active ?? null,
    hasWebhookRegistration: Boolean(webhookRow),
    hasOrganizationToken,
    lastError: parseErrorCode(sync?.last_error ?? null),
    detectedAt: sync?.detected_at ?? null,
    branch: sync?.branch ?? null,
    commitSha: sync?.commit_sha ?? null,
    commitMessage: sync?.commit_message ?? null,
    pushedAt: sync?.pushed_at ?? null,
  });
}
