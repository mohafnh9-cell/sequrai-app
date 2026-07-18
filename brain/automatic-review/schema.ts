import { z } from "zod";

export const ReviewTypeSchema = z.enum(["manual", "automatic"]);
export type ReviewType = z.infer<typeof ReviewTypeSchema>;

export const ReviewStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const AutomaticReviewErrorCodeSchema = z.enum([
  "invalid_repository",
  "missing_commit",
  "duplicate_review",
  "review_failed",
  "repository_disconnected",
  "review_in_progress",
]);
export type AutomaticReviewErrorCode = z.infer<
  typeof AutomaticReviewErrorCodeSchema
>;

export const CommitValidationInputSchema = z.object({
  commitSha: z.string(),
  branch: z.string(),
  githubRepositoryId: z.number().int().positive().nullable(),
  expectedRepositoryId: z.number().int().positive().nullable(),
  pushedAt: z.string(),
});

export type CommitValidationInput = z.infer<typeof CommitValidationInputSchema>;

export const CommitValidationResultSchema = z.object({
  valid: z.boolean(),
  errorCode: AutomaticReviewErrorCodeSchema.nullable(),
});

export type CommitValidationResult = z.infer<typeof CommitValidationResultSchema>;

export const AutomaticReviewPanelViewSchema = z.object({
  enabled: z.boolean(),
  reviewType: ReviewTypeSchema.nullable(),
  status: ReviewStatusSchema.nullable(),
  latestReviewAt: z.string().datetime().nullable(),
  verdictUpdated: z.boolean().nullable(),
  errorCode: AutomaticReviewErrorCodeSchema.nullable(),
});

export type AutomaticReviewPanelView = z.infer<
  typeof AutomaticReviewPanelViewSchema
>;
