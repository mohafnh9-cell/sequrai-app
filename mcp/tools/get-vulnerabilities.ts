/**
 * MCP Tool: get_project_vulnerabilities
 *
 * Fetches all open vulnerabilities for a project.
 * Supports filtering by severity and status.
 */
export const getProjectVulnerabilitiesTool = {
  name: "get_project_vulnerabilities",
  description:
    "Get all vulnerabilities for a SequrAI project. Filter by severity (CRITICAL, HIGH, MEDIUM, LOW) or status (OPEN, FIXED, IGNORED).",
  inputSchema: {
    type: "object" as const,
    properties: {
      projectId: {
        type: "string",
        description: "The SequrAI project ID",
      },
      severity: {
        type: "string",
        description: "Filter by severity level",
        enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
        optional: true,
      },
      status: {
        type: "string",
        description: "Filter by vulnerability status",
        enum: ["OPEN", "FIXED", "IGNORED"],
        optional: true,
      },
    },
    required: ["projectId"],
  },
  handler: async (input: Record<string, unknown>, apiKey: string) => {
    const params = new URLSearchParams({ projectId: input.projectId as string });
    if (input.severity) params.set("severity", input.severity as string);
    if (input.status) params.set("status", input.status as string);

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://sequrai.com"}/api/vulnerabilities?${params}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch vulnerabilities: ${response.statusText}`);
    }

    return response.json();
  },
};
