export type McpToolDefinition = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<
      string,
      {
        type: string;
        description: string;
        enum?: string[];
      }
    >;
    required: string[];
  };
};

const PROJECT_SELECTOR_PROPERTIES: McpToolDefinition["inputSchema"]["properties"] = {
  projectId: {
    type: "string",
    description: "SequrAI project ID. Optional if your organization has a single project.",
  },
  repositoryId: {
    type: "string",
    description: "Alias for projectId.",
  },
  repositoryFullName: {
    type: "string",
    description: "GitHub repository full name, e.g. \"owner/repo\". Alternative to projectId.",
  },
  locale: {
    type: "string",
    description: "Response locale. One of \"en\" or \"es\". Defaults to your account locale.",
    enum: ["en", "es"],
  },
};

/**
 * ADR-001 / MCP V1: the public MCP tool surface is capped at exactly five
 * canonical tools. No sixth tool, no legacy aliases. `list_projects` is now
 * purely internal plumbing used to resolve an ambiguous project reference —
 * it is never registered as a discoverable tool.
 * Enforced by server/mcp/__tests__/tool-surface.test.ts.
 */
export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "review_now",
    description:
      "Starts a real SequrAI Production Review for this project's connected repository (e.g. 'Scan this project', 'Review this repository before I deploy'). Reuses the same review pipeline as GitHub Continuous Review and manual web reviews. Returns quickly with a reviewId; the review continues asynchronously. Call can_i_deploy afterwards for the verdict.",
    inputSchema: {
      type: "object",
      properties: {
        ...PROJECT_SELECTOR_PROPERTIES,
        commitSha: {
          type: "string",
          description: "Explicit commit SHA to review. Defaults to the latest commit on the branch.",
        },
        branch: {
          type: "string",
          description: "Branch to review. Defaults to the repository's default branch.",
        },
        reason: {
          type: "string",
          description: "Why this review was requested. Analytics metadata only; never affects the result.",
          enum: ["before_deploy", "after_fix", "manual_check"],
        },
      },
      required: [],
    },
  },
  {
    name: "can_i_deploy",
    description:
      "Answers 'Can I deploy this application?' using the latest persisted Production Verdict: status, score, blockers, next action, and deployment recommendation.",
    inputSchema: {
      type: "object",
      properties: { ...PROJECT_SELECTOR_PROPERTIES },
      required: [],
    },
  },
  {
    name: "safe_fix",
    description:
      "Answers 'How do I safely fix this blocker?'. Without a blockerId, returns the current blocker list (max 5) to choose from. With a blockerId, returns a Safe Fix Prompt, confidence, risk, estimated time, and projected verdict.",
    inputSchema: {
      type: "object",
      properties: {
        ...PROJECT_SELECTOR_PROPERTIES,
        blockerId: { type: "string", description: "Blocker/priority/finding ID to fix." },
        priorityId: { type: "string", description: "Alias for blockerId." },
        findingId: { type: "string", description: "Alias for blockerId." },
      },
      required: [],
    },
  },
  {
    name: "what_changed",
    description:
      "Answers 'What changed since my previous valid Production Review?'. Compares the two most recent persisted verdicts: score delta, resolved blockers, and newly detected blockers.",
    inputSchema: {
      type: "object",
      properties: { ...PROJECT_SELECTOR_PROPERTIES },
      required: [],
    },
  },
  {
    name: "production_history",
    description:
      "Answers 'How has my project evolved?'. Returns score trend, best score, valid review count, and a concise recent-score timeline.",
    inputSchema: {
      type: "object",
      properties: {
        ...PROJECT_SELECTOR_PROPERTIES,
        range: {
          type: "string",
          description: "Time window for the recent-score timeline.",
          enum: ["7d", "30d", "all"],
        },
        limit: { type: "number", description: "Max recent verdicts to return (default 7, max 20)." },
      },
      required: [],
    },
  },
];

export const MCP_PUBLIC_TOOL_NAMES = MCP_TOOL_DEFINITIONS.map((tool) => tool.name);

export const MCP_SERVER_INFO = {
  name: "sequrai",
  version: "2.1.0",
  description:
    "SequrAI Production Engine — the last thing you ask before deploying. Trigger a real Production Review, get an independent verdict and deployment recommendation, Safe Fix prompts, and Continuous Review history for AI-built software.",
};
