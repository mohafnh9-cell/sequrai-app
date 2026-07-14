/**
 * SequrAI MCP Server
 *
 * This server exposes SequrAI's security capabilities as MCP tools.
 * AI coding assistants (Cursor, Claude Code) can use these tools
 * to trigger scans, get vulnerability data, and generate fix prompts.
 *
 * Status: Phase 6 - Architecture ready, implementation pending
 *
 * Usage (future):
 *   npx sequrai-mcp --api-key YOUR_API_KEY
 *
 * Cursor config (future ~/.cursor/mcp.json):
 * {
 *   "sequrai": {
 *     "command": "npx",
 *     "args": ["sequrai-mcp"],
 *     "env": { "SEQURAI_API_KEY": "your-key" }
 *   }
 * }
 */

import { runSecurityScanTool } from "./tools/run-security-scan";
import { getProjectVulnerabilitiesTool } from "./tools/get-vulnerabilities";
import { generateCursorFixPromptTool, generateClaudeFixPromptTool } from "./tools/generate-fix-prompts";

export const MCP_TOOLS = [
  runSecurityScanTool,
  getProjectVulnerabilitiesTool,
  generateCursorFixPromptTool,
  generateClaudeFixPromptTool,
];

export const MCP_SERVER_INFO = {
  name: "sequrai",
  version: "1.0.0",
  description: "SequrAI Security Tools — scan your app, detect vulnerabilities, generate AI fixes",
};

/**
 * Get tool definitions for MCP protocol handshake
 */
export function getToolDefinitions() {
  return MCP_TOOLS.map(({ handler: _handler, ...tool }) => tool);
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  apiKey: string
): Promise<unknown> {
  const tool = MCP_TOOLS.find((t) => t.name === toolName);
  if (!tool) throw new Error(`Unknown tool: ${toolName}`);
  return tool.handler(input, apiKey);
}
