import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/crypto/token-encryption";

export async function saveGitHubToken(
  userId: string,
  accessToken: string,
  refreshToken?: string | null
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("user_github_tokens").upsert({
      user_id: userId,
      access_token: encryptToken(accessToken),
      refresh_token: refreshToken ? encryptToken(refreshToken) : null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error("github_token_store_failed", { code: error.code, userId });
    }
  } catch (error) {
    console.error("github_token_store_unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
      userId,
    });
  }
}

export async function getStoredGitHubToken(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_github_tokens")
      .select("access_token")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      console.error("github_token_read_failed", { code: error.code, userId });
      return null;
    }
    if (!data?.access_token) return null;
    return decryptToken(data.access_token);
  } catch {
    return null;
  }
}
