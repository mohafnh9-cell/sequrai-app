import { describe, expect, it } from "vitest";
import { deriveReviewSource, describeReviewSource } from "../labels";

describe("deriveReviewSource", () => {
  it("labels an MCP-triggered review as mcp_manual", () => {
    expect(deriveReviewSource("mcp", "manual")).toBe("mcp_manual");
  });

  it("labels a webhook-triggered push review as github_push", () => {
    expect(deriveReviewSource("webhook", "automatic")).toBe("github_push");
  });

  it("labels a webhook-triggered pull_request event as github_pull_request", () => {
    expect(deriveReviewSource("webhook", "automatic", "pull_request")).toBe("github_pull_request");
  });

  it("labels a web-initiated manual scan as web_manual", () => {
    expect(deriveReviewSource("manual", "manual")).toBe("web_manual");
  });

  it("falls back to unknown for an unrecognized combination", () => {
    expect(deriveReviewSource("scheduled", "automatic")).toBe("unknown");
    expect(deriveReviewSource(null, null)).toBe("unknown");
  });
});

describe("describeReviewSource", () => {
  it("gives review_now's source a clearly distinct label", () => {
    expect(describeReviewSource("mcp_manual")).toBe("MCP Manual Review");
    expect(describeReviewSource("web_manual")).toBe("Manual Review");
    expect(describeReviewSource("github_push")).toBe("GitHub Push Review");
  });
});
