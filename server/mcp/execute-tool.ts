import "server-only";

import type { McpAuthContext } from "./auth";
import { McpError } from "./auth";
import { getMcpTranslator, resolveMcpLocale } from "./i18n";
import { logMcpCall } from "./observability";
import { MCP_PUBLIC_TOOL_NAMES } from "./tool-definitions";
import { canIDeploy } from "./tools/can-i-deploy";
import { deploymentConfidence } from "./tools/deployment-confidence";
import { productionHistory } from "./tools/production-history";
import { safeFix } from "./tools/safe-fix";
import { whatChanged } from "./tools/what-changed";

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function range(value: unknown): "7d" | "30d" | "all" | undefined {
  return value === "7d" || value === "30d" || value === "all" ? value : undefined;
}

function projectSelector(input: Record<string, unknown>) {
  return {
    projectId: str(input.projectId),
    repositoryId: str(input.repositoryId),
    repositoryFullName: str(input.repositoryFullName),
  };
}

/**
 * ADR-001 / MCP V1: this switch may only dispatch to the exactly-five
 * canonical public tools registered in ./tool-definitions.ts. Every handler
 * below only retrieves, compares, aggregates, formats, or translates
 * already-persisted Production Verdict Engine output — never independent
 * product truth. Enforced by server/mcp/__tests__/tool-surface.test.ts.
 */
export async function executeMcpTool(
  ctx: McpAuthContext,
  toolName: string,
  input: Record<string, unknown>
): Promise<unknown> {
  if (!MCP_PUBLIC_TOOL_NAMES.includes(toolName)) {
    throw new McpError(404, "unknown_tool", `Unknown tool: ${toolName}`);
  }

  const startedAt = Date.now();
  const locale = await resolveMcpLocale(ctx.admin, ctx.userId, str(input.locale));
  const t = getMcpTranslator(locale);

  try {
    const result = await dispatch(ctx, toolName, input, t);
    logMcpCall({
      tool: toolName,
      organizationId: ctx.organizationId,
      projectId: (result as { project?: { id?: string } })?.project?.id ?? null,
      durationMs: Date.now() - startedAt,
      result: "success",
    });
    return result;
  } catch (error) {
    logMcpCall({
      tool: toolName,
      organizationId: ctx.organizationId,
      durationMs: Date.now() - startedAt,
      result: "error",
      errorCode: error instanceof McpError ? error.code : "internal_error",
    });
    throw error;
  }
}

async function dispatch(
  ctx: McpAuthContext,
  toolName: string,
  input: Record<string, unknown>,
  t: ReturnType<typeof getMcpTranslator>
): Promise<unknown> {
  switch (toolName) {
    case "can_i_deploy":
      return canIDeploy(ctx, projectSelector(input), t);

    case "safe_fix":
      return safeFix(
        ctx,
        {
          ...projectSelector(input),
          blockerId: str(input.blockerId),
          priorityId: str(input.priorityId),
          findingId: str(input.findingId),
        },
        t
      );

    case "what_changed":
      return whatChanged(ctx, projectSelector(input), t);

    case "production_history":
      return productionHistory(
        ctx,
        {
          ...projectSelector(input),
          range: range(input.range),
          limit: num(input.limit),
        },
        t
      );

    case "deployment_confidence":
      return deploymentConfidence(ctx, projectSelector(input), t);

    default:
      throw new McpError(404, "unknown_tool", `Unknown tool: ${toolName}`);
  }
}
