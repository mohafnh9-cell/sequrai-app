import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getStoredGitHubToken } from "@/lib/github/token-store";

export async function resolveOrganizationGitHubToken(
  admin: SupabaseClient,
  organizationId: string
): Promise<{ token: string; userId: string } | null> {
  const { data: members } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .limit(20);
  if (!members?.length) return null;

  for (const member of members) {
    const token = await getStoredGitHubToken(member.user_id);
    if (token) return { token, userId: member.user_id };
  }
  return null;
}
