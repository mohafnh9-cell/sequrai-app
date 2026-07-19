import { describe, expect, it } from "vitest";
import { decideReviewNowAction } from "../decision";

describe("decideReviewNowAction", () => {
  it("reuses an active review when one is already processing, regardless of commit", () => {
    const decision = decideReviewNowAction({
      hasActiveReview: true,
      activeReviewId: "scan-1",
      currentVerdictCommitSha: "aaa",
      requestedCommitSha: "bbb",
    });
    expect(decision).toEqual({ action: "reuse_active", reviewId: "scan-1" });
  });

  it("reuses the completed verdict when it already covers the requested commit", () => {
    const decision = decideReviewNowAction({
      hasActiveReview: false,
      activeReviewId: null,
      currentVerdictCommitSha: "aaa",
      requestedCommitSha: "aaa",
    });
    expect(decision).toEqual({ action: "reuse_completed" });
  });

  it("starts a new review when the requested commit differs from the current verdict's commit", () => {
    const decision = decideReviewNowAction({
      hasActiveReview: false,
      activeReviewId: null,
      currentVerdictCommitSha: "aaa",
      requestedCommitSha: "bbb",
    });
    expect(decision).toEqual({ action: "start_new" });
  });

  it("starts a new review when there is no current verdict at all", () => {
    const decision = decideReviewNowAction({
      hasActiveReview: false,
      activeReviewId: null,
      currentVerdictCommitSha: null,
      requestedCommitSha: "aaa",
    });
    expect(decision).toEqual({ action: "start_new" });
  });

  it("never rescans an unchanged commit even when a force-like input is not present (no force parameter in V1)", () => {
    const decision = decideReviewNowAction({
      hasActiveReview: false,
      activeReviewId: null,
      currentVerdictCommitSha: "same-sha",
      requestedCommitSha: "same-sha",
    });
    expect(decision.action).toBe("reuse_completed");
  });
});
