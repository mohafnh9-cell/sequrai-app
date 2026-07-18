import { z } from "zod";
import { VerdictStatusSchema } from "@/brain/production-verdict/schema";
import { JourneyTrendSchema, MaturityStageSchema } from "@/brain/production-journey/schema";

export const IntelligenceEmptyStateSchema = z.enum([
  "first_review",
  "one_review",
  "no_activity",
  "no_blockers",
  "ready_to_ship",
  "improving",
  "declining",
]);

export type IntelligenceEmptyState = z.infer<typeof IntelligenceEmptyStateSchema>;

export const RecommendedActionTypeSchema = z.enum([
  "fix_blocker",
  "run_review",
  "maintain",
  "focus_area",
]);

export type RecommendedActionType = z.infer<typeof RecommendedActionTypeSchema>;

export const WhatChangedItemSchema = z.object({
  id: z.string(),
  kind: z.enum(["improvement", "regression", "neutral"]),
  messageKey: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type WhatChangedItem = z.infer<typeof WhatChangedItemSchema>;

export const RecommendedActionSchema = z.object({
  type: RecommendedActionTypeSchema,
  titleKey: z.string(),
  descriptionKey: z.string().optional(),
  priorityTitle: z.string().nullable(),
  estimatedMinutes: z.number().int().min(0).nullable(),
  ctaKey: z.string().nullable(),
});

export type RecommendedAction = z.infer<typeof RecommendedActionSchema>;

export const ProductionInsightSchema = z.object({
  id: z.string(),
  messageKey: z.string(),
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});

export type ProductionInsight = z.infer<typeof ProductionInsightSchema>;

export const WeeklyPeriodSummarySchema = z.object({
  scoreChange: z.number().nullable(),
  blockersResolved: z.number().int().min(0),
  blockersIntroduced: z.number().int().min(0),
});

export type WeeklyPeriodSummary = z.infer<typeof WeeklyPeriodSummarySchema>;

export const ProductionIntelligenceSchema = z.object({
  version: z.string(),
  projectId: z.string().uuid(),

  currentStatus: VerdictStatusSchema.nullable(),
  currentScore: z.number().min(0).max(100).nullable(),
  previousScore: z.number().min(0).max(100).nullable(),
  scoreDelta: z.number().nullable(),
  bestScore: z.number().min(0).max(100).nullable(),
  currentBlockers: z.number().int().min(0),

  momentum: JourneyTrendSchema,
  momentumExplanationKey: z.string(),

  whatChanged: z.object({
    hasChanges: z.boolean(),
    items: z.array(WhatChangedItemSchema),
  }),

  improvements: z.array(WhatChangedItemSchema),
  regressions: z.array(WhatChangedItemSchema),

  recommendedAction: RecommendedActionSchema,

  weeklyReview: z.object({
    period7d: WeeklyPeriodSummarySchema,
    period30d: WeeklyPeriodSummarySchema,
    currentFocusKey: z.string().nullable(),
    estimatedMinutesToImprovement: z.number().int().min(0).nullable(),
  }),

  insights: z.array(ProductionInsightSchema),

  healthSummary: z.object({
    currentVerdict: VerdictStatusSchema.nullable(),
    trend: JourneyTrendSchema,
    currentFocusKey: z.string().nullable(),
    currentMilestoneKey: z.string().nullable(),
    currentBlockers: z.number().int().min(0),
    bestScore: z.number().min(0).max(100).nullable(),
    latestChangeDelta: z.number().nullable(),
  }),

  journeySummary: z.object({
    validReviews: z.number().int().min(0),
    maturity: MaturityStageSchema,
    trend: JourneyTrendSchema,
    scoreChange7d: z.number().nullable(),
    scoreChange30d: z.number().nullable(),
  }),

  currentFocusKey: z.string().nullable(),
  focusExplanationKey: z.string().nullable(),

  emptyState: IntelligenceEmptyStateSchema.nullable(),
});

export type ProductionIntelligence = z.infer<typeof ProductionIntelligenceSchema>;

export const ProductionIntelligencePreviewSchema = ProductionIntelligenceSchema.pick({
  projectId: true,
  currentStatus: true,
  currentScore: true,
  scoreDelta: true,
  momentum: true,
  recommendedAction: true,
  currentFocusKey: true,
  emptyState: true,
});

export type ProductionIntelligencePreview = z.infer<
  typeof ProductionIntelligencePreviewSchema
>;

export function parseProductionIntelligence(data: unknown): ProductionIntelligence {
  return ProductionIntelligenceSchema.parse(data);
}
