import type { ProjectBrainSnapshot } from "./types";

/** Contract for Block 7 Security Copilot — read-only subset of Brain */
export type CopilotReadableContext = Pick<
  ProjectBrainSnapshot,
  | "projectId"
  | "projectName"
  | "productionReady"
  | "todayPriorities"
  | "coachTip"
  | "executiveSummary"
  | "recentActivity"
>;

export const COPILOT_BRAIN_TOOLS = [
  "get_production_readiness",
  "review_current_changes",
  "explain_production_blocker",
  "generate_blocker_fix",
  "review_before_commit",
  "list_projects",
  "get_production_blockers",
] as const;

export type CopilotBrainTool = (typeof COPILOT_BRAIN_TOOLS)[number];
