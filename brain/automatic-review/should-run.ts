import type { ParsedPushDetection } from "@/brain/repository-sync";
import type { AutomaticReviewErrorCode, CommitValidationResult } from "./schema";

export type AutomaticReviewDecisionInput = {
  repositoryConnected: boolean;
  commitValidation: CommitValidationResult;
  detection: ParsedPushDetection | null;
  hasActiveReview: boolean;
  hasCompletedReviewForCommit: boolean;
};

export type AutomaticReviewDecision =
  | { shouldRun: true }
  | { shouldRun: false; reason: AutomaticReviewErrorCode };

export function shouldRunAutomaticReview(
  input: AutomaticReviewDecisionInput
): AutomaticReviewDecision {
  if (!input.repositoryConnected) {
    return { shouldRun: false, reason: "repository_disconnected" };
  }

  if (!input.detection) {
    return { shouldRun: false, reason: "missing_commit" };
  }

  if (!input.commitValidation.valid) {
    return {
      shouldRun: false,
      reason: input.commitValidation.errorCode ?? "missing_commit",
    };
  }

  if (input.hasCompletedReviewForCommit) {
    return { shouldRun: false, reason: "duplicate_review" };
  }

  if (input.hasActiveReview) {
    return { shouldRun: false, reason: "review_in_progress" };
  }

  return { shouldRun: true };
}
