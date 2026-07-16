/**
 * SequrAI MCP Server — Production Copilot tools for Cursor and Claude Code.
 *
 * HTTP transport: POST /api/mcp (JSON-RPC or legacy { tool, input })
 * Stdio transport: node mcp/stdio-bridge.mjs
 */

import {
  MCP_TOOL_DEFINITIONS,
  MCP_SERVER_INFO,
  type McpToolDefinition,
} from "../server/mcp/tool-definitions";

export { MCP_TOOL_DEFINITIONS, MCP_SERVER_INFO, type McpToolDefinition };

export function getToolDefinitions() {
  return MCP_TOOL_DEFINITIONS;
}
