import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const COOKIE_NAME = "sequrai_github_oauth_state";
const MAX_AGE_SECONDS = 900;

export type GitHubOAuthStatePayload = {
  workspaceId: string;
  userId: string;
  exp: number;
  nonce: string;
};

function stateSecret(): string {
  const secret =
    process.env.GITHUB_OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("GitHub OAuth state secret is not configured");
  }
  return secret;
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", stateSecret()).update(encodedPayload).digest("base64url");
}

export function createGitHubOAuthState(
  workspaceId: string,
  userId: string
): { cookieValue: string; maxAge: number } {
  const payload: GitHubOAuthStatePayload = {
    workspaceId,
    userId,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
    nonce: randomBytes(16).toString("hex"),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encodedPayload);
  return {
    cookieValue: `${encodedPayload}.${signature}`,
    maxAge: MAX_AGE_SECONDS,
  };
}

export function parseGitHubOAuthState(
  cookieValue: string | null | undefined
): GitHubOAuthStatePayload | null {
  if (!cookieValue) return null;
  const [encodedPayload, signature] = cookieValue.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as GitHubOAuthStatePayload;
    if (!payload.workspaceId || !payload.userId || !payload.exp || !payload.nonce) {
      return null;
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export const githubOAuthStateCookieName = COOKIE_NAME;
