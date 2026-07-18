import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedPushDetection } from "@/brain/repository-sync";
import {
  shouldRunAutomaticReview,
  validateCommitForReview,
} from "@/brain/automatic-review";
import { AUTOMATIC_VERDICT_UPDATE_CONFIG } from "@/brain/automatic-verdict-update";
import { InlineScanJobRunner } from "@/server/security-scanner/scan-job-runner";
import { finalizeProjectStateAfterAutomaticReview } from "@/server/automatic-verdict-update";
import {
  buildCommitValidationInput,
  hasActiveRepositoryReview,
  hasCompletedAutomaticReviewForCommit,
} from "./queries";

type ProjectRow = {
  id: string;
  organization_id: string;
  github_repo: string | null;
  github_repository_id: number | null;
};

export type AutomaticReviewRunResult =
  | {
      ok: true;
      action: "automatic_review_started";
      scanId: string;
      status: "completed" | "failed";
      verdictUpdated: boolean;
      verdictError?: string;
    }
  | {
      ok: true;
      action: "automatic_review_skipped";
      reason: string;
    }
  | {
      ok: false;
      action: "automatic_review_failed";
      reason: string;
    };

export async function runAutomaticProductionReview(
  admin: SupabaseClient,
  input: {
    project: ProjectRow;
    detection: ParsedPushDetection;
    token: string;
    userId: string;
  }
): Promise<AutomaticReviewRunResult> {
  const repositoryConnected = Boolean(
    input.project.github_repo && input.project.github_repository_id
  );

  const commitValidation = validateCommitForReview(
    buildCommitValidationInput({
      detection: input.detection,
      githubRepositoryId: input.project.github_repository_id,
    })
  );

  const [hasCompletedReviewForCommit, hasActiveReview] = await Promise.all([
    hasCompletedAutomaticReviewForCommit(
      admin,
      input.project.id,
      input.detection.commitSha
    ),
    hasActiveRepositoryReview(admin, input.project.id),
  ]);

  const decision = shouldRunAutomaticReview({
    repositoryConnected,
    commitValidation,
    detection: input.detection,
    hasActiveReview,
    hasCompletedReviewForCommit,
  });

  if (!decision.shouldRun) {
    return {
      ok: true,
      action: "automatic_review_skipped",
      reason: decision.reason,
    };
  }

  const { data: scan, error: insertError } = await admin
    .from("scans")
    .insert({
      organization_id: input.project.organization_id,
      project_id: input.project.id,
      repository_id: input.project.id,
      triggered_by_user_id: input.userId,
      trigger_type: "webhook",
      review_type: "automatic",
      scan_type: "full",
      status: "queued",
      progress: 0,
      progress_message: "Automatic production review queued",
      branch: input.detection.branch,
      commit_sha: input.detection.commitSha,
    })
    .select("id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return {
        ok: true,
        action: "automatic_review_skipped",
        reason: "duplicate_review",
      };
    }
    return {
      ok: false,
      action: "automatic_review_failed",
      reason: insertError.message,
    };
  }

  await admin.from("repository_scan_state").upsert(
    {
      repository_id: input.project.id,
      organization_id: input.project.organization_id,
      active_scan_id: scan.id,
    },
    { onConflict: "repository_id" }
  );

  const runner = new InlineScanJobRunner(admin);

  try {
    await runner.run({
      scanId: scan.id,
      repositoryId: input.project.id,
      organizationId: input.project.organization_id,
      githubRepo: input.project.github_repo!,
      branch: input.detection.branch,
      providerToken: input.token,
      persistMode: "review_only",
    });
  } catch (error) {
    return {
      ok: false,
      action: "automatic_review_failed",
      reason: error instanceof Error ? error.message : "review_failed",
    };
  }

  const { data: completed } = await admin
    .from("scans")
    .select("status")
    .eq("id", scan.id)
    .single();

  const reviewStatus = completed?.status === "completed" ? "completed" : "failed";
  let verdictUpdated = false;
  let verdictError: string | undefined;

  if (
    reviewStatus === "completed" &&
    AUTOMATIC_VERDICT_UPDATE_CONFIG.enabled
  ) {
    const finalizeResult = await finalizeProjectStateAfterAutomaticReview(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      scanId: scan.id,
    });
    verdictUpdated = finalizeResult.verdictUpdated;
    if (!finalizeResult.ok && finalizeResult.errorCode) {
      verdictError = finalizeResult.errorCode;
    }
  }

  return {
    ok: true,
    action: "automatic_review_started",
    scanId: scan.id,
    status: reviewStatus,
    verdictUpdated,
    ...(verdictError ? { verdictError } : {}),
  };
}
