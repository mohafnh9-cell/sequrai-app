/**
 * MCP (Model Context Protocol) Tools for SequrAI
 *
 * This folder contains the tool definitions for the SequrAI MCP server.
 * The MCP server allows AI coding assistants like Cursor and Claude Code
 * to interact with SequrAI directly from the editor.
 *
 * Architecture:
 * - Each tool is a separate file exporting a MCPTool definition
 * - The server.ts file composes all tools into an MCP server
 * - Tools are exposed via HTTP at /api/mcp/[tool]
 *
 * Status: Phase 1 - Architecture only (HTTP API backed)
 * Phase 6 will add: full MCP server, stdio transport, NPM package
 */

export type MCPTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      optional?: boolean;
    }>;
    required: string[];
  };
  handler: (input: Record<string, unknown>, apiKey: string) => Promise<unknown>;
};
