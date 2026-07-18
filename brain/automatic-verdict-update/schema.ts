import { z } from "zod";

export const AutomaticVerdictErrorCodeSchema = z.enum([
  "automatic_review_failed",
  "verdict_generation_failed",
  "journey_update_failed",
  "missing_repository",
  "missing_review",
  "invalid_commit",
]);

export type AutomaticVerdictErrorCode = z.infer<
  typeof AutomaticVerdictErrorCodeSchema
>;

export const AutomaticVerdictFinalizeResultSchema = z.object({
  ok: z.boolean(),
  errorCode: AutomaticVerdictErrorCodeSchema.nullable(),
  verdictUpdated: z.boolean(),
  scanId: z.string().uuid().nullable(),
});

export type AutomaticVerdictFinalizeResult = z.infer<
  typeof AutomaticVerdictFinalizeResultSchema
>;

export type AutomaticReviewScanSnapshot = {
  id: string;
  status: string;
  review_type: string;
  commit_sha: string | null;
  security_score: number | null;
  findings_count: number | null;
  completed_at: string | null;
};
