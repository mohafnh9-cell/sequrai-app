import { describe, expect, it } from "vitest";
import {
  branchFromRef,
  parseRepositoryFullName,
  verifyGitHubWebhookSignature,
} from "../webhook-utils";
import { createHmac } from "node:crypto";

describe("verifyGitHubWebhookSignature", () => {
  it("accepts valid sha256 signatures", () => {
    const secret = "test-secret";
    const payload = '{"ref":"refs/heads/main"}';
    const digest = createHmac("sha256", secret).update(payload).digest("hex");
    expect(verifyGitHubWebhookSignature(payload, `sha256=${digest}`, secret)).toBe(true);
  });

  it("rejects invalid signatures", () => {
    expect(verifyGitHubWebhookSignature("{}", "sha256=deadbeef", "secret")).toBe(false);
  });

  it("rejects missing signature header", () => {
    expect(verifyGitHubWebhookSignature("{}", null, "secret")).toBe(false);
  });

  it("rejects sha1-only signatures", () => {
    expect(verifyGitHubWebhookSignature("{}", "sha1=abc", "secret")).toBe(false);
  });
});

describe("branchFromRef", () => {
  it("extracts branch names", () => {
    expect(branchFromRef("refs/heads/main")).toBe("main");
    expect(branchFromRef("refs/tags/v1")).toBeNull();
  });
});

describe("parseRepositoryFullName", () => {
  it("parses owner/repo", () => {
    expect(parseRepositoryFullName("acme/app")).toEqual({ owner: "acme", repo: "app" });
    expect(parseRepositoryFullName("invalid")).toBeNull();
  });
});
