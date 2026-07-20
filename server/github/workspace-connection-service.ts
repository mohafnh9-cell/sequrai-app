import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getGitHubTokenScopes, getGitHubUser } from "@/lib/github";
import { decryptToken, encryptToken } from "@/lib/crypto/token-encryption";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceGitHubConnectionStatus =
  | "connected"
  | "not_connected"
  | "migration_reconnection_required"
  | "revoked"
  | "expired"
  | "insufficient_scope";

export type WorkspaceGitHubConnectionView = {
  status: WorkspaceGitHubConnectionStatus;
  githubLogin: string | null;
  connectedAt: string | null;
  connectedByUserId: string | null;
  repositoryCount: number;
  lastError: string | null;
};

type ConnectionRow = {
  id: string;
  organization_id: string;
  connected_by_user_id: string;
  github_user_id: number;
  github_login: string;
  github_account_type: string;
  access_token: string;
  refresh_token: string | null;
  token_scopes: string[] | null;
  status: string;
  connected_at: string;
  last_error: string | null;
};

function mapPublicStatus(row: ConnectionRow | null): WorkspaceGitHubConnectionView {
  if (!row) {
    return {
      status: "not_connected",
      githubLogin: null,
      connectedAt: null,
      connectedByUserId: null,
      repositoryCount: 0,
      lastError: null,
    };
  }

  if (row.status === "migration_reconnection_required") {
    return {
      status: "migration_reconnection_required",
      githubLogin: row.github_login === "legacy-backfill" ? null : row.github_login,
      connectedAt: row.connected_at,
      connectedByUserId: row.connected_by_user_id,
      repositoryCount: 0,
      lastError: row.last_error,
    };
  }

  if (row.status !== "active") {
    return {
      status: row.status as WorkspaceGitHubConnectionStatus,
      githubLogin: row.github_login,
      connectedAt: row.connected_at,
      connectedByUserId: row.connected_by_user_id,
      repositoryCount: 0,
      lastError: row.last_error,
    };
  }

  return {
    status: "connected",
    githubLogin: row.github_login,
    connectedAt: row.connected_at,
    connectedByUserId: row.connected_by_user_id,
    repositoryCount: 0,
    lastError: row.last_error,
  };
}

export async function loadWorkspaceGitHubConnection(
  admin: SupabaseClient,
  organizationId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await admin
    .from("workspace_github_connections")
    .select(
      "id, organization_id, connected_by_user_id, github_user_id, github_login, github_account_type, access_token, refresh_token, token_scopes, status, connected_at, last_error"
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data as ConnectionRow;
}

export async function getWorkspaceGitHubConnectionView(
  supabase: SupabaseClient,
  organizationId: string
): Promise<WorkspaceGitHubConnectionView> {
  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const row = admin ? await loadWorkspaceGitHubConnection(admin, organizationId) : null;
  const view = mapPublicStatus(row);

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .not("github_repository_id", "is", null);

  view.repositoryCount = count ?? 0;
  return view;
}

export async function upsertWorkspaceGitHubConnection(input: {
  organizationId: string;
  connectedByUserId: string;
  accessToken: string;
  refreshToken?: string | null;
  scopes?: string[];
}): Promise<{ connectionId: string }> {
  const admin = createAdminClient();
  const githubUser = await getGitHubUser(input.accessToken);
  if (!githubUser || typeof githubUser.id !== "number" || !githubUser.login) {
    throw new Error("Could not resolve GitHub account identity");
  }

  const scopes =
    input.scopes && input.scopes.length > 0
      ? input.scopes
      : await getGitHubTokenScopes(input.accessToken);

  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("workspace_github_connections")
    .upsert(
      {
        organization_id: input.organizationId,
        connected_by_user_id: input.connectedByUserId,
        github_user_id: githubUser.id,
        github_login: githubUser.login as string,
        github_account_type:
          (githubUser.type as string | undefined)?.toLowerCase() === "organization"
            ? "Organization"
            : "User",
        access_token: encryptToken(input.accessToken),
        refresh_token: input.refreshToken ? encryptToken(input.refreshToken) : null,
        token_scopes: scopes,
        status: scopes.includes("repo") ? "active" : "insufficient_scope",
        last_validated_at: now,
        last_error: scopes.includes("repo") ? null : "Missing repo scope",
        revoked_at: null,
        updated_at: now,
      },
      { onConflict: "organization_id" }
    )
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Could not save Workspace GitHub connection");
  }

  await admin
    .from("projects")
    .update({ github_connection_id: data.id, connected_by_user_id: input.connectedByUserId })
    .eq("organization_id", input.organizationId)
    .not("github_repository_id", "is", null);

  return { connectionId: data.id as string };
}

export async function disconnectWorkspaceGitHubConnection(
  organizationId: string
): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("workspace_github_connections")
    .update({
      status: "revoked",
      revoked_at: now,
      access_token: "",
      refresh_token: null,
      updated_at: now,
    })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  await admin
    .from("projects")
    .update({ github_connection_id: null })
    .eq("organization_id", organizationId);
}

export async function resolveWorkspaceGitHubToken(
  admin: SupabaseClient,
  organizationId: string,
  projectId?: string
): Promise<{ token: string; userId: string; connectionId: string } | null> {
  if (projectId) {
    const { data: project } = await admin
      .from("projects")
      .select("organization_id, github_connection_id, connected_by_user_id")
      .eq("id", projectId)
      .maybeSingle();

    if (!project || project.organization_id !== organizationId) return null;

    if (project.github_connection_id) {
      const { data: linked } = await admin
        .from("workspace_github_connections")
        .select("id, connected_by_user_id, access_token, status")
        .eq("id", project.github_connection_id)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (linked?.access_token && linked.status === "active") {
        return {
          token: decryptToken(linked.access_token as string),
          userId: linked.connected_by_user_id as string,
          connectionId: linked.id as string,
        };
      }
    }
  }

  const connection = await loadWorkspaceGitHubConnection(admin, organizationId);
  if (!connection || connection.status !== "active" || !connection.access_token) {
    return null;
  }

  return {
    token: decryptToken(connection.access_token),
    userId: connection.connected_by_user_id,
    connectionId: connection.id,
  };
}
