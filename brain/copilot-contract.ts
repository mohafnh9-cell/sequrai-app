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

// ADR-001 / MCP V1: this must mirror server/mcp/tool-definitions.ts exactly
// (5 public, canonical tools). See server/mcp/__tests__/tool-surface.test.ts
// and docs/MCP_V1_IMPLEMENTATION.md.
export const COPILOT_BRAIN_TOOLS = [
  "can_i_deploy",
  "safe_fix",
  "what_changed",
  "production_history",
  "deployment_confidence",
] as const;

export type CopilotBrainTool = (typeof COPILOT_BRAIN_TOOLS)[number];
