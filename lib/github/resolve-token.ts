import "server-only";

import type { Session } from "@supabase/supabase-js";
import { getStoredGitHubToken, saveGitHubToken } from "./token-store";

export async function resolveGitHubAccessToken(
  userId: string,
  session: Session | null
): Promise<string | undefined> {
  const sessionToken = session?.provider_token;
  if (sessionToken) {
    await saveGitHubToken(userId, sessionToken, session.provider_refresh_token);
    return sessionToken;
  }
  const stored = await getStoredGitHubToken(userId);
  return stored ?? undefined;
}
