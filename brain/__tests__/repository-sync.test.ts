import { describe, expect, it } from "vitest";
import {
  buildRepositoryStatusView,
  deriveConnectionStatus,
  isValidPushHeadSha,
  parsePushDetection,
  shortCommitSha,
} from "@/brain/repository-sync";
import type { GitHubPushPayload } from "@/lib/github/push-payload";
import { branchFromRef } from "@/lib/github/push-payload";
import { loadNamespace } from "@/lib/i18n/load-messages";
import { formatRelativeLocalized } from "@/lib/i18n/format";

const samplePush: GitHubPushPayload = {
  ref: "refs/heads/main",
  before: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  after: "8a5f92bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  repository: {
    id: 12345,
    full_name: "acme/app",
    default_branch: "main",
    name: "app",
    owner: { login: "acme" },
  },
  commits: [
    {
      id: "8a5f92bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      message: "Fix auth redirect",
      timestamp: "2026-07-18T00:30:00Z",
    },
  ],
  head_commit: {
    id: "8a5f92bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    message: "Fix auth redirect",
    timestamp: "2026-07-18T00:30:00Z",
  },
};

describe("Block 7.0.1 push detection", () => {
  it("extracts branch names from refs", () => {
    expect(branchFromRef("refs/heads/main")).toBe("main");
    expect(branchFromRef("refs/tags/v1")).toBeNull();
  });

  it("rejects branch delete pushes", () => {
    expect(
      isValidPushHeadSha("0000000000000000000000000000000000000000")
    ).toBe(false);
    expect(parsePushDetection({ ...samplePush, after: "0000000000000000000000000000000000000000" })).toBeNull();
  });

  it("parses branch, commit, message, and push timestamp", () => {
    const parsed = parsePushDetection(samplePush);
    expect(parsed).toEqual({
      branch: "main",
      commitSha: "8a5f92bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      commitMessage: "Fix auth redirect",
      pushedAt: "2026-07-18T00:30:00Z",
    });
  });

  it("falls back to detection time when push timestamp is missing", () => {
    const parsed = parsePushDetection({
      ...samplePush,
      head_commit: undefined,
      commits: [{ id: samplePush.after, message: "No timestamp" }],
    });
    expect(parsed?.commitMessage).toBe("No timestamp");
    expect(parsed?.pushedAt).toBeTruthy();
  });

  it("shortens commit shas for display", () => {
    expect(shortCommitSha("8a5f92bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb")).toBe("8a5f92b");
  });
});

describe("Block 7.0.1 repository connection", () => {
  const connectedContext = {
    githubRepo: "https://github.com/acme/app",
    githubRepositoryId: 12345,
    webhookEnabled: true,
    webhookActive: true,
    hasWebhookRegistration: true,
    hasOrganizationToken: true,
    lastError: null,
    detectedAt: null,
    branch: null,
    commitSha: null,
    commitMessage: null,
    pushedAt: null,
  };

  it("marks disconnected projects without a repo URL", () => {
    expect(
      deriveConnectionStatus({ ...connectedContext, githubRepo: null })
    ).toBe("disconnected");
    expect(
      buildRepositoryStatusView({ ...connectedContext, githubRepo: null }).display
    ).toBe("disconnected");
  });

  it("shows waiting state when connected but no push detected yet", () => {
    const view = buildRepositoryStatusView(connectedContext);
    expect(view.display).toBe("connected_waiting");
    expect(view.connectionStatus).toBe("connected");
  });

  it("shows latest detected change when push data exists", () => {
    const view = buildRepositoryStatusView({
      ...connectedContext,
      detectedAt: "2026-07-18T01:00:00Z",
      branch: "main",
      commitSha: "8a5f92bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      commitMessage: "Fix auth redirect",
      pushedAt: "2026-07-18T00:30:00Z",
    });
    expect(view.display).toBe("connected_detected");
    expect(view.branch).toBe("main");
  });

  it("flags missing repository metadata", () => {
    const view = buildRepositoryStatusView({
      ...connectedContext,
      githubRepositoryId: null,
    });
    expect(view.display).toBe("connection_issue");
    expect(view.errorCode).toBe("missing_repository");
  });

  it("flags invalid GitHub connection when webhook or token is missing", () => {
    expect(
      buildRepositoryStatusView({
        ...connectedContext,
        hasWebhookRegistration: false,
      }).errorCode
    ).toBe("invalid_github_connection");

    expect(
      buildRepositoryStatusView({
        ...connectedContext,
        hasOrganizationToken: false,
      }).errorCode
    ).toBe("invalid_github_connection");
  });

  it("surfaces push detection failures", () => {
    const view = buildRepositoryStatusView({
      ...connectedContext,
      lastError: "push_detection_failed",
    });
    expect(view.display).toBe("connection_issue");
    expect(view.errorCode).toBe("push_detection_failed");
  });
});

describe("Block 7.0.1 repository sync i18n", () => {
  it("loads repositorySync namespace in English and Spanish", () => {
    const en = loadNamespace("en", "repositorySync");
    const es = loadNamespace("es", "repositorySync");

    expect(en.title).toBe("Repository Status");
    expect(es.title).toBe("Estado del repositorio");
    expect(en.connected).toBe("Connected.");
    expect(es.connected).toBe("Conectado.");
    expect((en.errors as Record<string, string>).push_detection_failed).toContain("failed");
    expect((es.errors as Record<string, string>).push_detection_failed).toContain("push");
  });

  it("formats relative detection time in Spanish", () => {
    const sixMinutesAgo = new Date(Date.now() - 6 * 60 * 1000).toISOString();
    const es = loadNamespace("es", "repositorySync");
    const relative = es.relative as Record<string, string>;
    const result = formatRelativeLocalized("es", sixMinutesAgo, {
      never: relative.never,
      justNow: relative.justNow,
      minutesAgo: relative.minutesAgo,
      hoursAgo: relative.hoursAgo,
      daysAgo: relative.daysAgo,
    });
    expect(result).toContain("6");
    expect(result).toContain("min");
  });
});
