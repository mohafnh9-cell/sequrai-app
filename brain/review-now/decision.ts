/**
 * ADR-001: review_now never calculates product truth. This module only
 * decides an *orchestration* outcome — whether to start a new review, reuse
 * an already-running one, or reuse an already-completed verdict that covers
 * the requested commit. It never computes score, status, or blockers.
 */
export type ReviewNowDecisionInput = {
  /** Whether some review (of any trigger/review type) is currently active for this repository. */
  hasActiveReview: boolean;
  /** The id of the active review, when hasActiveReview is true. */
  activeReviewId: string | null;
  /** The commit currently covered by the canonical current Production Verdict, if any. */
  currentVerdictCommitSha: string | null;
  /** The commit review_now resolved to review (explicit or latest-on-branch). */
  requestedCommitSha: string;
};

export type ReviewNowDecision =
  | { action: "reuse_active"; reviewId: string }
  | { action: "reuse_completed" }
  | { action: "start_new" };

export function decideReviewNowAction(input: ReviewNowDecisionInput): ReviewNowDecision {
  if (input.hasActiveReview && input.activeReviewId) {
    return { action: "reuse_active", reviewId: input.activeReviewId };
  }
  if (input.currentVerdictCommitSha && input.currentVerdictCommitSha === input.requestedCommitSha) {
    return { action: "reuse_completed" };
  }
  return { action: "start_new" };
}
