import type { ProductionIntelligence } from "@/brain/production-intelligence/schema";
import type { AutomaticReviewPanelView } from "@/brain/automatic-review/schema";
import type { RepositoryStatusView } from "@/brain/repository-sync";
import {
  deriveAutopilotState,
  isCloserToProduction,
} from "./build-state";
import type { AutopilotProjectView } from "./schema";

export function buildAutopilotProjectView(input: {
  autopilotEnabled: boolean;
  repositoryStatus: RepositoryStatusView | null;
  automaticReview: AutomaticReviewPanelView | null;
  intelligence: ProductionIntelligence | null;
  hasActiveReview: boolean;
}): AutopilotProjectView {
  const repositoryConnected =
    input.repositoryStatus?.connectionStatus === "connected";
  const repositoryWaitingForChanges =
    input.repositoryStatus?.display === "connected_waiting";

  const state = deriveAutopilotState({
    autopilotEnabled: input.autopilotEnabled,
    repositoryConnected,
    repositoryWaitingForChanges,
    hasActiveReview: input.hasActiveReview,
    latestAutomaticReviewStatus: input.automaticReview?.status ?? null,
    verdictUpdated: input.automaticReview?.verdictUpdated ?? null,
  });

  const scoreDelta =
    input.intelligence?.scoreDelta ??
    (input.intelligence?.currentScore != null &&
    input.intelligence?.previousScore != null
      ? input.intelligence.currentScore - input.intelligence.previousScore
      : null);

  const latestImprovement = input.intelligence?.improvements[0] ?? null;

  return {
    state,
    autopilotEnabled: input.autopilotEnabled,
    lastAutomaticReviewAt: input.automaticReview?.latestReviewAt ?? null,
    scoreDelta,
    currentStatus: input.intelligence?.currentStatus ?? null,
    recommendedActionTitle: input.intelligence?.recommendedAction.priorityTitle ?? null,
    latestImprovementKey: latestImprovement?.messageKey ?? null,
    latestImprovementParams: latestImprovement?.params ?? null,
    closerToProduction: isCloserToProduction(scoreDelta),
  };
}
