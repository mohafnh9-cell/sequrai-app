/**
 * MCP Tool: generate_cursor_fix_prompt
 *
 * Generates a Cursor-ready fix prompt for a specific vulnerability.
 * Returns the prompt text ready to paste into Cursor chat.
 */
export const generateCursorFixPromptTool = {
  name: "generate_cursor_fix_prompt",
  description:
    "Generate a Cursor AI-ready fix prompt for a specific vulnerability. Returns the exact prompt text to paste into Cursor.",
  inputSchema: {
    type: "object" as const,
    properties: {
      vulnerabilityId: {
        type: "string",
        description: "The vulnerability ID to generate a fix for",
      },
    },
    required: ["vulnerabilityId"],
  },
  // Block 7 target: scan finding fix prompts via /api/scans/{scanId}/findings/{findingId}/fix
  handler: async (input: Record<string, unknown>, apiKey: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://sequrai.com"}/api/ai/fix`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ vulnerabilityId: input.vulnerabilityId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate fix: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      cursorPrompt: data.cursorPrompt,
      explanation: data.explanation,
      priority: data.priority,
    };
  },
};

/**
 * MCP Tool: generate_claude_fix_prompt
 */
export const generateClaudeFixPromptTool = {
  name: "generate_claude_fix_prompt",
  description:
    "Generate a Claude Code-ready fix prompt for a specific vulnerability.",
  inputSchema: {
    type: "object" as const,
    properties: {
      vulnerabilityId: {
        type: "string",
        description: "The vulnerability ID to generate a fix for",
      },
    },
    required: ["vulnerabilityId"],
  },
  // Block 7 target: scan finding fix prompts via /api/scans/{scanId}/findings/{findingId}/fix
  handler: async (input: Record<string, unknown>, apiKey: string) => {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://sequrai.com"}/api/ai/fix`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ vulnerabilityId: input.vulnerabilityId }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to generate fix: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      claudePrompt: data.claudePrompt,
      explanation: data.explanation,
      priority: data.priority,
    };
  },
};
