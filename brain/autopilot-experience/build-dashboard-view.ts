import { deriveAutopilotState, isApproachingProduction } from "./build-state";
import type {
  AutopilotDashboardProjectRow,
  AutopilotDashboardView,
} from "./schema";

export type AutopilotDashboardProjectInput = {
  projectId: string;
  projectName: string;
  autopilotEnabled: boolean;
  repositoryConnected: boolean;
  repositoryWaitingForChanges: boolean;
  hasActiveReview: boolean;
  latestAutomaticReviewStatus:
    | "pending"
    | "processing"
    | "completed"
    | "failed"
    | null;
  latestAutomaticReviewAt: string | null;
  verdictUpdated: boolean | null;
  currentStatus: string | null;
  scoreDelta: number | null;
};

export function buildAutopilotDashboardView(input: {
  orgAutopilotEnabled: boolean;
  projects: AutopilotDashboardProjectInput[];
}): AutopilotDashboardView {
  const rows: AutopilotDashboardProjectRow[] = input.projects.map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
    state: deriveAutopilotState({
      autopilotEnabled: input.orgAutopilotEnabled && project.autopilotEnabled,
      repositoryConnected: project.repositoryConnected,
      repositoryWaitingForChanges: project.repositoryWaitingForChanges,
      hasActiveReview: project.hasActiveReview,
      latestAutomaticReviewStatus: project.latestAutomaticReviewStatus,
      verdictUpdated: project.verdictUpdated,
    }),
    lastAutomaticReviewAt: project.latestAutomaticReviewAt,
    currentStatus: project.currentStatus as AutopilotDashboardProjectRow["currentStatus"],
    scoreDelta: project.scoreDelta,
  }));

  const activeRows = rows.filter(
    (row) =>
      input.orgAutopilotEnabled &&
      row.state !== "disabled" &&
      row.state !== "repository_disconnected"
  );

  const monitoredCount = activeRows.length;
  const waitingCount = activeRows.filter(
    (row) => row.state === "waiting_for_changes" || row.state === "enabled"
  ).length;
  const approachingProductionCount = activeRows.filter((row) =>
    isApproachingProduction(row.currentStatus)
  ).length;

  const latest = [...activeRows]
    .filter((row) => row.lastAutomaticReviewAt)
    .sort(
      (a, b) =>
        new Date(b.lastAutomaticReviewAt!).getTime() -
        new Date(a.lastAutomaticReviewAt!).getTime()
    )[0];

  return {
    autopilotEnabled: input.orgAutopilotEnabled,
    monitoredCount,
    waitingCount,
    approachingProductionCount,
    latestAutomaticReviewAt: latest?.lastAutomaticReviewAt ?? null,
    latestAutomaticReviewProjectName: latest?.projectName ?? null,
    projects: rows,
  };
}
