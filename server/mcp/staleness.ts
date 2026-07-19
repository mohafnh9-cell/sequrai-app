import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type StalenessInfo = {
  latestDetectedCommitSha: string | null;
  stale: boolean;
  reviewInProgress: boolean;
};

/**
 * ADR-001: this only retrieves and compares two already-persisted commit
 * SHAs (the reviewed verdict's commit vs. the repository's latest known
 * commit). It never recalculates score, status, or blockers.
 */
export async function getStalenessInfo(
  admin: SupabaseClient,
  projectId: string,
  reviewedCommitSha: string | null
): Promise<StalenessInfo> {
  const { data: state } = await admin
    .from("repository_scan_state")
    .select("last_commit_sha, active_scan_id")
    .eq("repository_id", projectId)
    .maybeSingle();

  const latestDetectedCommitSha = state?.last_commit_sha ?? null;
  const reviewInProgress = Boolean(state?.active_scan_id);

  const stale = Boolean(
    latestDetectedCommitSha && reviewedCommitSha && latestDetectedCommitSha !== reviewedCommitSha
  );

  return { latestDetectedCommitSha, stale, reviewInProgress };
}
