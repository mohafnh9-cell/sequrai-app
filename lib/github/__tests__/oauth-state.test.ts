import { describe, expect, it } from "vitest";
import {
  createGitHubOAuthState,
  parseGitHubOAuthState,
} from "@/lib/github/oauth-state";

describe("GitHub OAuth state", () => {
  it("creates and validates signed workspace state", () => {
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-secret";
    const { cookieValue } = createGitHubOAuthState("workspace-a", "user-a");
    const parsed = parseGitHubOAuthState(cookieValue);
    expect(parsed?.workspaceId).toBe("workspace-a");
    expect(parsed?.userId).toBe("user-a");
  });

  it("rejects tampered state", () => {
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-secret";
    const { cookieValue } = createGitHubOAuthState("workspace-a", "user-a");
    const parsed = parseGitHubOAuthState(`${cookieValue}x`);
    expect(parsed).toBeNull();
  });

  it("rejects workspace substitution when signature does not match payload", () => {
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-secret";
    const { cookieValue } = createGitHubOAuthState("workspace-a", "user-a");
    const [encodedPayload] = cookieValue.split(".");
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        workspaceId: "workspace-b",
        userId: "user-a",
        exp: Math.floor(Date.now() / 1000) + 900,
        nonce: "abc",
      })
    ).toString("base64url");
    const crypto = require("crypto") as typeof import("crypto");
    const signature = crypto
      .createHmac("sha256", "test-secret")
      .update(encodedPayload)
      .digest("base64url");
    expect(parseGitHubOAuthState(`${tamperedPayload}.${signature}`)).toBeNull();
  });

  it("rejects expired state", () => {
    process.env.GITHUB_OAUTH_STATE_SECRET = "test-secret";
    const payload = Buffer.from(
      JSON.stringify({
        workspaceId: "workspace-a",
        userId: "user-a",
        exp: 1,
        nonce: "abc",
      })
    ).toString("base64url");
    const crypto = require("crypto") as typeof import("crypto");
    const signature = crypto
      .createHmac("sha256", "test-secret")
      .update(payload)
      .digest("base64url");
    expect(parseGitHubOAuthState(`${payload}.${signature}`)).toBeNull();
  });
});
