/**
 * MCP Tool: run_security_scan
 *
 * Triggers a security scan on a SequrAI project.
 * Can be invoked from Cursor or Claude Code via MCP.
 */
export const runSecurityScanTool = {
  name: "run_security_scan",
  description:
    "Trigger a security scan on a SequrAI project. Returns scan ID and initial status.",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "The SequrAI project ID to scan",
      },
      trigger: {
        type: "string",
        description: "What triggered the scan",
        enum: ["mcp", "manual"],
      },
    },
    required: ["projectId"],
  },
  // In Phase 6, this calls the SequrAI API with the user's API key
  handler: async (input: Record<string, unknown>, apiKey: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://sequrai.com"}/api/scans`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          projectId: input.projectId,
          trigger: input.trigger ?? "mcp",
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Scan failed: ${response.statusText}`);
    }

    return response.json();
  },
};
