import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveWorkspaceGitHubToken } from "@/server/github/workspace-connection-service";

export async function resolveOrganizationGitHubToken(
  admin: SupabaseClient,
  organizationId: string,
  projectId?: string
): Promise<{ token: string; userId: string } | null> {
  const scopedAdmin = admin;
  const resolved = await resolveWorkspaceGitHubToken(scopedAdmin, organizationId, projectId);
  if (resolved) {
    return { token: resolved.token, userId: resolved.userId };
  }

  // Legacy fallback during migration only when table is missing.
  try {
    const client = createAdminClient();
    const { error } = await client.from("workspace_github_connections").select("id").limit(1);
    if (error?.code === "42P01") {
      const { getStoredGitHubToken } = await import("@/lib/github/token-store");
      const { data: members } = await admin
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("role", "OWNER")
        .limit(1);
      const ownerId = members?.[0]?.user_id;
      if (!ownerId) return null;
      const token = await getStoredGitHubToken(ownerId);
      return token ? { token, userId: ownerId } : null;
    }
  } catch {
    return null;
  }

  return null;
}
