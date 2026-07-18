import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { buildAutopilotProjectView } from "@/brain/autopilot-experience";
import type { AutopilotProjectView } from "@/brain/autopilot-experience";
import { getAutomaticReviewPanelView } from "@/server/automatic-review";
import { hasActiveRepositoryReview } from "@/server/automatic-review/queries";
import { getProductionIntelligence } from "@/server/production-intelligence/service";
import { getRepositorySyncStatus } from "@/server/repository-sync";
import { createAdminClient } from "@/server/security-scanner/admin-client";
import { isVerdictAutopilotEnabled } from "./is-enabled";

export async function getAutopilotProjectView(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<AutopilotProjectView | null> {
  const { data: project, error } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error || !project) return null;

  const autopilotEnabled = await isVerdictAutopilotEnabled(
    supabase,
    project.organization_id
  );

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    admin = null;
  }

  const [repositoryStatus, automaticReview, intelligence, hasActiveReview] =
    await Promise.all([
      getRepositorySyncStatus(supabase, projectId),
      getAutomaticReviewPanelView(supabase, projectId),
      getProductionIntelligence(supabase, projectId, userId).catch(() => null),
      admin
        ? hasActiveRepositoryReview(admin, projectId)
        : Promise.resolve(false),
    ]);

  return buildAutopilotProjectView({
    autopilotEnabled,
    repositoryStatus,
    automaticReview,
    intelligence,
    hasActiveReview,
  });
}
