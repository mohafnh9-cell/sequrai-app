import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getRepositorySyncStatus } from "@/server/repository-sync/get-repository-sync-status";

export type ProjectWebhookHealth = {
  projectId: string;
  projectName: string;
  githubRepo: string | null;
  webhookRegistered: boolean;
  webhookActive: boolean;
  connectionStatus: string;
  lastError: string | null;
  healthy: boolean;
};

export async function getWorkspaceWebhookHealth(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ProjectWebhookHealth[]> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, github_repo, webhook_enabled")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!projects?.length) return [];

  const results = await Promise.all(
    projects.map(async (project) => {
      const sync = await getRepositorySyncStatus(supabase, project.id);
      const connectionStatus = sync?.connectionStatus ?? "disconnected";
      const lastError = sync?.errorCode ?? null;
      const healthy = connectionStatus === "connected";

      return {
        projectId: project.id,
        projectName: project.name,
        githubRepo: project.github_repo,
        webhookRegistered: connectionStatus !== "disconnected",
        webhookActive: healthy,
        connectionStatus,
        lastError,
        healthy,
      };
    })
  );

  return results;
}
