import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const KEY_PREFIX = "seq_live_";

export function hashMcpApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateMcpApiKey(): { rawKey: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("hex");
  const rawKey = `${KEY_PREFIX}${secret}`;
  return {
    rawKey,
    prefix: rawKey.slice(0, 16),
    hash: hashMcpApiKey(rawKey),
  };
}

export type McpAuthContext = {
  keyId: string;
  organizationId: string;
  userId: string;
  admin: SupabaseClient;
};

export async function resolveMcpAuth(request: Request): Promise<McpAuthContext | null> {
  const header = request.headers.get("authorization");
  const rawKey = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  if (!rawKey || !rawKey.startsWith(KEY_PREFIX)) return null;

  let admin: SupabaseClient;
  try {
    admin = createAdminClient();
  } catch {
    return null;
  }

  const keyHash = hashMcpApiKey(rawKey);
  const { data: row } = await admin
    .from("mcp_api_keys")
    .select("id, organization_id, created_by_user_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (!row) return null;

  void admin
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    keyId: row.id,
    organizationId: row.organization_id,
    userId: row.created_by_user_id,
    admin,
  };
}

export async function assertProjectInOrg(
  admin: SupabaseClient,
  organizationId: string,
  projectId: string
) {
  const { data: project } = await admin
    .from("projects")
    .select("id, organization_id, name, github_repo")
    .eq("id", projectId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!project) {
    throw new McpError(404, "project_not_found", "Project not found in your organization");
  }
  return project;
}

export class McpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "McpError";
  }
}
