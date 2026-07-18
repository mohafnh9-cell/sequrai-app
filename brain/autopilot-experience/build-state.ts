import type { AutopilotState, AutopilotStateInput } from "./schema";

export function deriveAutopilotState(input: AutopilotStateInput): AutopilotState {
  if (!input.autopilotEnabled) {
    return "disabled";
  }

  if (!input.repositoryConnected) {
    return "repository_disconnected";
  }

  if (
    input.hasActiveReview ||
    input.latestAutomaticReviewStatus === "pending" ||
    input.latestAutomaticReviewStatus === "processing"
  ) {
    return "reviewing_changes";
  }

  if (input.latestAutomaticReviewStatus === "failed") {
    return "review_failed";
  }

  if (
    input.latestAutomaticReviewStatus === "completed" &&
    input.verdictUpdated !== false
  ) {
    return "up_to_date";
  }

  if (input.repositoryWaitingForChanges) {
    return "waiting_for_changes";
  }

  return "enabled";
}

export function isApproachingProduction(
  status: string | null | undefined
): boolean {
  return status === "almost_ready" || status === "ready_to_ship";
}

export function isCloserToProduction(scoreDelta: number | null): boolean {
  return scoreDelta != null && scoreDelta > 0;
}
