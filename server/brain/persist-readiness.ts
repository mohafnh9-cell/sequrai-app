import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProductionReadyScore } from "@/brain";

function log(event: string, fields: Record<string, unknown>) {
  console.warn({ component: "persist-readiness", event, deprecated: true, ...fields });
}

/**
 * @deprecated Block 6.2 — Production Verdict Engine is the sole writer.
 * Use generateAndPersistProductionVerdict from server/production-verdict/service instead.
 */
export async function persistProductionReadiness(
  _admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    scanId: string;
    securityScore: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    infoCount: number;
    estimatedMinutesFromPriorities?: number;
  }
): Promise<ProductionReadyScore | null> {
  log("deprecated_writer_invoked", {
    organizationId: input.organizationId,
    projectId: input.projectId,
    scanId: input.scanId,
  });
  return null;
}
