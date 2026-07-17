import { z } from "zod";
import { VerdictStatusSchema } from "@/brain/production-verdict/schema";

export const JourneyTrendSchema = z.enum([
  "improving",
  "stable",
  "declining",
  "insufficient_data",
]);

export type JourneyTrend = z.infer<typeof JourneyTrendSchema>;

export const MaturityStageSchema = z.enum([
  "unassessed",
  "early_build",
  "production_aware",
  "approaching_production",
  "production_ready",
  "production_maintained",
]);

export type MaturityStage = z.infer<typeof MaturityStageSchema>;

export const MilestoneTypeSchema = z.enum([
  "first_verdict",
  "first_blocker_resolved",
  "score_50",
  "score_70",
  "almost_ready",
  "ready_to_ship",
  "ten_reviews",
  "all_critical_resolved",
  "best_score",
  "recovered_after_regression",
]);

export type MilestoneType = z.infer<typeof MilestoneTypeSchema>;

export const ProductionJourneyPointSchema = z.object({
  verdictId: z.string().uuid(),
  scanId: z.string().uuid(),
  commitSha: z.string().nullable(),
  branch: z.string().nullable(),
  score: z.number().min(0).max(100).nullable(),
  status: VerdictStatusSchema,
  scoreDelta: z.number().nullable(),
  blockersCount: z.number().int().min(0),
  introducedBlockersCount: z.number().int().min(0),
  resolvedBlockersCount: z.number().int().min(0),
  generatedAt: z.string().datetime(),
  isValidForScoreChart: z.boolean(),
});

export type ProductionJourneyPoint = z.infer<typeof ProductionJourneyPointSchema>;

export const ProductionMilestoneSchema = z.object({
  id: z.string(),
  type: MilestoneTypeSchema,
  titleKey: z.string(),
  descriptionKey: z.string().optional(),
  reachedAt: z.string().datetime(),
  score: z.number().min(0).max(100).nullable(),
  verdictId: z.string().uuid(),
});

export type ProductionMilestone = z.infer<typeof ProductionMilestoneSchema>;

export const AreaProgressSchema = z.object({
  key: z.string(),
  label: z.string(),
  previousScore: z.number().min(0).max(100).nullable(),
  currentScore: z.number().min(0).max(100).nullable(),
  status: z.enum(["evaluated", "partial", "not_evaluated"]),
});

export type AreaProgress = z.infer<typeof AreaProgressSchema>;

export const JourneyHighlightSchema = z.object({
  id: z.string(),
  titleKey: z.string(),
  descriptionKey: z.string(),
  occurredAt: z.string().datetime(),
});

export type JourneyHighlight = z.infer<typeof JourneyHighlightSchema>;

export const ProductionJourneySchema = z.object({
  version: z.string(),
  projectId: z.string().uuid(),
  repositoryId: z.string().uuid(),

  currentScore: z.number().min(0).max(100).nullable(),
  previousScore: z.number().min(0).max(100).nullable(),
  bestScore: z.number().min(0).max(100).nullable(),
  lowestScore: z.number().min(0).max(100).nullable(),

  currentStatus: VerdictStatusSchema.nullable(),
  previousStatus: VerdictStatusSchema.nullable(),
  bestStatus: VerdictStatusSchema.nullable(),

  totalReviews: z.number().int().min(0),
  validReviews: z.number().int().min(0),
  completedReviews: z.number().int().min(0),
  failedReviews: z.number().int().min(0),

  blockersResolved: z.number().int().min(0),
  blockersIntroduced: z.number().int().min(0),
  currentBlockers: z.number().int().min(0),
  netBlockerImprovement: z.number().int(),

  scoreChange7d: z.number().nullable(),
  scoreChange30d: z.number().nullable(),

  currentFocus: z.string().nullable(),
  currentFocusKey: z.string().nullable(),
  currentMilestone: ProductionMilestoneSchema.nullable(),
  nextMilestoneKey: z.string().nullable(),

  firstReviewedAt: z.string().datetime().nullable(),
  lastReviewedAt: z.string().datetime().nullable(),
  bestScoreAt: z.string().datetime().nullable(),

  trend: JourneyTrendSchema,
  maturity: MaturityStageSchema,

  timeline: z.array(ProductionJourneyPointSchema),
  milestones: z.array(ProductionMilestoneSchema),
  highlights: z.array(JourneyHighlightSchema),
  areasProgress: z.array(AreaProgressSchema),

  latestIntroducedTitles: z.array(z.string()).max(5),
  latestResolvedTitles: z.array(z.string()).max(5),
  skippedInvalidVerdicts: z.number().int().min(0),
});

export type ProductionJourney = z.infer<typeof ProductionJourneySchema>;

export const ProductionJourneyPreviewSchema = ProductionJourneySchema.pick({
  projectId: true,
  currentScore: true,
  previousScore: true,
  bestScore: true,
  scoreChange7d: true,
  trend: true,
  maturity: true,
  currentFocusKey: true,
  currentMilestone: true,
  latestIntroducedTitles: true,
  latestResolvedTitles: true,
  validReviews: true,
}).extend({
  latestScoreDelta: z.number().nullable(),
});

export type ProductionJourneyPreview = z.infer<typeof ProductionJourneyPreviewSchema>;

export function parseProductionJourney(data: unknown): ProductionJourney {
  return ProductionJourneySchema.parse(data);
}
