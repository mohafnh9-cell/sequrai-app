import { z } from "zod";

export const mcpPostBodySchema = z
  .object({
    jsonrpc: z.literal("2.0").optional(),
    id: z.union([z.string(), z.number(), z.null()]).optional(),
    method: z.string().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    tool: z.string().optional(),
    input: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((body) => Boolean(body.method || body.tool), {
    message: "Missing method or tool",
  });

export type McpPostBody = z.infer<typeof mcpPostBodySchema>;
