/**
 * MCP (Model Context Protocol) types for SequrAI Production Copilot.
 *
 * Tool definitions live in server/mcp/tool-definitions.ts.
 * Execution is handled server-side via POST /api/mcp (JSON-RPC).
 * Stdio transport: mcp/stdio-bridge.mjs
 */

export type { McpToolDefinition } from "@/server/mcp/tool-definitions";
