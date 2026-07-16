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

export const MCP_TOOL_DEFINITIONS: McpToolDefinition[] = [
  {
    name: "list_projects",
    description:
      "List all projects in your organization with Production Ready Score and blocker counts.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_production_readiness",
    description:
      "Get the full Production Ready Score snapshot for a project — score, dimensions, blockers, mentor tip, and recent activity.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID (same as repository ID)" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "get_today_priorities",
    description:
      "Get today's top production priorities for a project — what to fix first to increase your Production Ready Score.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "get_coach_tip",
    description:
      "Get a senior engineer mentor tip for improving production readiness on a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "get_timeline",
    description: "Get recent production activity timeline for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "explain_issue",
    description:
      "Explain a production blocker (scan finding) — why it blocks deployment and how to fix it. Returns a Cursor-ready fix prompt.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
        findingId: { type: "string", description: "Scan finding / blocker ID" },
      },
      required: ["projectId", "findingId"],
    },
  },
  {
    name: "get_production_blockers",
    description:
      "List production blockers and improvements from the latest completed scan on a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
        limit: { type: "number", description: "Max findings to return (default 20)" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "run_production_check",
    description:
      "Run a full production readiness check on a project. Requires GitHub connected. Returns updated score when complete.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
        scanType: {
          type: "string",
          description: "Scan type",
          enum: ["full", "incremental"],
        },
      },
      required: ["projectId"],
    },
  },
];

export const MCP_SERVER_INFO = {
  name: "sequrai",
  version: "1.0.0",
  description:
    "SequrAI Production Copilot — check production readiness, list blockers, run scans, and get fix prompts from Cursor.",
};
