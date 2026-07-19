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
  {
    name: "deployment_confidence",
    description:
      "Answers 'Would you deploy this if it were your own SaaS?'. Translates the current verdict into a fixed deploy / do-not-deploy / more-analysis-required recommendation with a documented reason.",
    inputSchema: {
      type: "object",
      properties: { ...PROJECT_SELECTOR_PROPERTIES },
      required: [],
    },
  },
];

export const MCP_PUBLIC_TOOL_NAMES = MCP_TOOL_DEFINITIONS.map((tool) => tool.name);

export const MCP_SERVER_INFO = {
  name: "sequrai",
  version: "2.0.0",
  description:
    "SequrAI Production Engine — the last thing you ask before deploying. Independent Production Verdict, Safe Fix prompts, Continuous Review, and deployment confidence for AI-built software.",
};
