import { z } from "zod";
import { VerdictStatusSchema } from "@/brain/production-verdict/schema";

export const AutopilotStateSchema = z.enum([
  "enabled",
  "reviewing_changes",
  "up_to_date",
  "waiting_for_changes",
  "review_failed",
  "repository_disconnected",
  "disabled",
]);

export type AutopilotState = z.infer<typeof AutopilotStateSchema>;

export const AutopilotProjectViewSchema = z.object({
  state: AutopilotStateSchema,
  autopilotEnabled: z.boolean(),
  lastAutomaticReviewAt: z.string().datetime().nullable(),
  scoreDelta: z.number().nullable(),
  currentStatus: VerdictStatusSchema.nullable(),
  recommendedActionTitle: z.string().nullable(),
  latestImprovementKey: z.string().nullable(),
  latestImprovementParams: z
    .record(z.string(), z.union([z.string(), z.number()]))
    .nullable(),
  closerToProduction: z.boolean(),
});

export type AutopilotProjectView = z.infer<typeof AutopilotProjectViewSchema>;

export const AutopilotDashboardProjectRowSchema = z.object({
  projectId: z.string().uuid(),
  projectName: z.string(),
  state: AutopilotStateSchema,
  lastAutomaticReviewAt: z.string().datetime().nullable(),
  currentStatus: VerdictStatusSchema.nullable(),
  scoreDelta: z.number().nullable(),
});

export type AutopilotDashboardProjectRow = z.infer<
  typeof AutopilotDashboardProjectRowSchema
>;

export const AutopilotDashboardViewSchema = z.object({
  autopilotEnabled: z.boolean(),
  monitoredCount: z.number().int().min(0),
  waitingCount: z.number().int().min(0),
  approachingProductionCount: z.number().int().min(0),
  latestAutomaticReviewAt: z.string().datetime().nullable(),
  latestAutomaticReviewProjectName: z.string().nullable(),
  projects: z.array(AutopilotDashboardProjectRowSchema),
});

export type AutopilotDashboardView = z.infer<typeof AutopilotDashboardViewSchema>;

export type AutopilotStateInput = {
  autopilotEnabled: boolean;
  repositoryConnected: boolean;
  repositoryWaitingForChanges: boolean;
  hasActiveReview: boolean;
  latestAutomaticReviewStatus: "pending" | "processing" | "completed" | "failed" | null;
  verdictUpdated: boolean | null;
};
