import "server-only";

import { createClient } from "@/lib/supabase/server";

export class AIRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AIRequestError";
  }
}

export async function getScanAccessContext(scanId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AIRequestError(401, "UNAUTHORIZED", "Unauthorized");

  const { data: scan, error } = await supabase
    .from("scans")
    .select("id, organization_id, project_id, status, security_score")
    .eq("id", scanId)
    .maybeSingle();
  if (error || !scan) throw new AIRequestError(404, "SCAN_NOT_FOUND", "Scan not found");
  if (scan.status !== "completed") {
    throw new AIRequestError(422, "SCAN_NOT_COMPLETED", "AI analysis requires a completed scan");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", scan.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) throw new AIRequestError(403, "FORBIDDEN", "Access denied");

  return { supabase, user, scan };
}
