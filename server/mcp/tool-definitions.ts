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
    name: "get_production_readiness",
    description:
      "Primary readiness tool. Returns Production Verdict, score, top priorities, and recommended next action for a project.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID (same as repository ID)" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "review_current_changes",
    description:
      "Run a production check on the latest code and return the updated Production Verdict when complete.",
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
  {
    name: "explain_production_blocker",
    description:
      "Explain why a production blocker prevents shipping and how to fix it. Returns a Cursor-ready fix prompt.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
        findingId: { type: "string", description: "Production blocker / scan finding ID" },
      },
      required: ["projectId", "findingId"],
    },
  },
  {
    name: "generate_blocker_fix",
    description:
      "Generate a Cursor-ready fix prompt for a production blocker. Alias of explain_production_blocker focused on remediation.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
        findingId: { type: "string", description: "Production blocker / scan finding ID" },
      },
      required: ["projectId", "findingId"],
    },
  },
  {
    name: "review_before_commit",
    description:
      "Review production readiness before committing. Returns verdict, score, priorities, and recommended action.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
      },
      required: ["projectId"],
    },
  },
  {
    name: "list_projects",
    description:
      "List all projects with Production Ready Score, verdict context, and blocker counts.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_production_blockers",
    description:
      "List production blockers from the latest completed scan. Use after get_production_readiness for technical detail.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "SequrAI project ID" },
        limit: { type: "number", description: "Max findings to return (default 20)" },
      },
      required: ["projectId"],
    },
  },
];

export const MCP_SERVER_INFO = {
  name: "sequrai",
  version: "1.1.0",
  description:
    "SequrAI Production Copilot — get your Production Verdict, fastest path forward, and fix prompts from Cursor.",
};
