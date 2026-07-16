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
  "get_today_priorities",
  "get_coach_tip",
  "get_timeline",
  "explain_issue",
] as const;

export type CopilotBrainTool = (typeof COPILOT_BRAIN_TOOLS)[number];
