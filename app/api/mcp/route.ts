import { NextResponse } from "next/server";
import { resolveMcpAuth, McpError } from "@/server/mcp/auth";
import { executeMcpTool } from "@/server/mcp/execute-tool";
import { MCP_SERVER_INFO, MCP_TOOL_DEFINITIONS } from "@/server/mcp/tool-definitions";
import { mcpPostBodySchema } from "@/server/mcp/request.schema";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
  tool?: string;
  input?: Record<string, unknown>;
};

function jsonRpcResult(id: string | number | null | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function jsonRpcError(
  id: string | number | null | undefined,
  code: number,
  message: string,
  data?: unknown
) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id: id ?? null,
    error: { code, message, ...(data !== undefined ? { data } : {}) },
  });
}

function toolCallResult(payload: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    isError: false,
  };
}

function toolCallError(message: string) {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

async function handleJsonRpc(body: JsonRpcRequest, auth: NonNullable<Awaited<ReturnType<typeof resolveMcpAuth>>>) {
  const { id, method, params } = body;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: MCP_SERVER_INFO,
    });
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: MCP_TOOL_DEFINITIONS });
  }

  if (method === "ping") {
    return jsonRpcResult(id, {});
  }

  if (method === "tools/call") {
    const name = params?.name as string | undefined;
    const args = (params?.arguments ?? {}) as Record<string, unknown>;
    if (!name) {
      return jsonRpcError(id, -32602, "Missing tool name");
    }
    try {
      const payload = await executeMcpTool(auth, name, args);
      return jsonRpcResult(id, toolCallResult(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tool execution failed";
      return jsonRpcResult(id, toolCallError(message));
    }
  }

  return jsonRpcError(id, -32601, `Method not found: ${method}`);
}

export async function GET(request: Request) {
  const rateLimited = enforceRateLimit(request);
  if (rateLimited) return rateLimited;

  const auth = await resolveMcpAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    server: MCP_SERVER_INFO,
    tools: MCP_TOOL_DEFINITIONS,
  });
}

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request);
  if (rateLimited) return rateLimited;

  const auth = await resolveMcpAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsedBody = mcpPostBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parsedBody.data as JsonRpcRequest;

  if (body.jsonrpc === "2.0" && body.method) {
    return handleJsonRpc(body, auth);
  }

  const toolName = body.tool;
  const input = (body.input ?? {}) as Record<string, unknown>;
  if (!toolName) {
    return NextResponse.json({ error: "Missing tool name" }, { status: 400 });
  }

  try {
    const result = await executeMcpTool(auth, toolName, input);
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof McpError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    const message = error instanceof Error ? error.message : "Tool execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
