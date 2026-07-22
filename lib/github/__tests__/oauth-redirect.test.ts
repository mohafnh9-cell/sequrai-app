import { describe, expect, it } from "vitest";
import {
  resolveGitHubOAuthErrorRedirect,
  resolveGitHubOAuthSuccessRedirect,
} from "@/lib/github/oauth-redirect";

describe("GitHub OAuth redirect resolution", () => {
  it("returns onboarding path after successful connect during onboarding", () => {
    expect(resolveGitHubOAuthSuccessRedirect("/onboarding?step=github")).toBe(
      "/onboarding?step=github"
    );
  });

  it("falls back to onboarding when next is missing", () => {
    expect(resolveGitHubOAuthSuccessRedirect(null)).toBe("/onboarding");
  });

  it("returns integrations for settings connect flow", () => {
    expect(resolveGitHubOAuthSuccessRedirect("/integrations")).toBe("/integrations");
  });

  it("routes onboarding errors back to the github step", () => {
    expect(resolveGitHubOAuthErrorRedirect("/onboarding?step=github", "oauth_state_invalid")).toBe(
      "/onboarding?step=github&githubError=oauth_state_invalid"
    );
  });

  it("routes integrations errors to integrations", () => {
    expect(resolveGitHubOAuthErrorRedirect("/integrations", "github_connection_failed")).toBe(
      "/integrations?githubError=github_connection_failed"
    );
  });
});
