import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedPushDetection, RepositorySyncErrorCode } from "@/brain/repository-sync";

export async function touchWebhookLastDelivery(
  admin: SupabaseClient,
  projectId: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from("github_webhooks")
    .update({ last_delivery_at: now, updated_at: now })
    .eq("project_id", projectId);

  if (error) {
    console.warn("github_webhook_last_delivery_update_failed", {
      projectId,
      message: error.message,
    });
  }
}

export async function initializeRepositorySyncStatus(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    githubRepositoryId: number;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin.from("repository_sync_status").upsert(
    {
      project_id: input.projectId,
      organization_id: input.organizationId,
      github_repository_id: input.githubRepositoryId,
      connection_status: "connected",
      last_error: null,
      updated_at: now,
    },
    { onConflict: "project_id" }
  );

  if (error) {
    console.warn("repository_sync_status_init_failed", {
      projectId: input.projectId,
      message: error.message,
    });
  }
}

export async function recordPushDetection(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    githubRepositoryId: number | null;
    detection: ParsedPushDetection;
  }
): Promise<void> {
  const detectedAt = new Date().toISOString();
  const { error } = await admin.from("repository_sync_status").upsert(
    {
      project_id: input.projectId,
      organization_id: input.organizationId,
      github_repository_id: input.githubRepositoryId,
      connection_status: "connected",
      branch: input.detection.branch,
      commit_sha: input.detection.commitSha,
      commit_message: input.detection.commitMessage,
      pushed_at: input.detection.pushedAt,
      detected_at: detectedAt,
      last_error: null,
      updated_at: detectedAt,
    },
    { onConflict: "project_id" }
  );

  if (error) {
    console.warn("repository_sync_push_detection_failed", {
      projectId: input.projectId,
      message: error.message,
    });
  }
}

export async function markRepositorySyncError(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    githubRepositoryId?: number | null;
    errorCode: RepositorySyncErrorCode;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin.from("repository_sync_status").upsert(
    {
      project_id: input.projectId,
      organization_id: input.organizationId,
      github_repository_id: input.githubRepositoryId ?? null,
      connection_status: "connection_issue",
      last_error: input.errorCode,
      updated_at: now,
    },
    { onConflict: "project_id" }
  );

  if (error) {
    console.warn("repository_sync_status_error_update_failed", {
      projectId: input.projectId,
      message: error.message,
    });
  }
}

export async function markRepositoryDisconnected(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin.from("repository_sync_status").upsert(
    {
      project_id: input.projectId,
      organization_id: input.organizationId,
      connection_status: "disconnected",
      last_error: "repository_disconnected",
      updated_at: now,
    },
    { onConflict: "project_id" }
  );

  if (error) {
    console.warn("repository_sync_status_disconnect_failed", {
      projectId: input.projectId,
      message: error.message,
    });
  }
}
