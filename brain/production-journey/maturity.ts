import type { ProductionJourneyPoint, MaturityStage } from "./schema";
import type { VerdictStatus } from "@/brain/production-verdict/schema";
import { JOURNEY_CONFIG } from "./config";
import { isValidJourneyVerdict } from "./valid-verdict";
import type { JourneyTrend } from "./schema";

export function calculateMaturity(input: {
  validReviews: number;
  currentStatus: VerdictStatus | null;
  currentScore: number | null;
  trend: JourneyTrend;
  blockersResolved: number;
  timeline: ProductionJourneyPoint[];
}): MaturityStage {
  if (input.validReviews === 0) return "unassessed";

  const validTimeline = input.timeline.filter((p) =>
    isValidJourneyVerdict(p.status, p.score)
  );

  const recentReady = validTimeline
    .slice(-JOURNEY_CONFIG.maintainedReviewCount)
    .every((p) => p.status === "ready_to_ship");

  const hadRegression = validTimeline.some(
    (p, index) =>
      index > 0 &&
      p.status === "not_ready" &&
      validTimeline[index - 1].status === "ready_to_ship"
  );

  if (
    input.currentStatus === "ready_to_ship" &&
    recentReady &&
    !hadRegression
  ) {
    return "production_maintained";
  }

  if (input.currentStatus === "ready_to_ship") {
    return "production_ready";
  }

  if (
    input.currentStatus === "almost_ready" ||
    (input.currentScore !== null && input.currentScore >= JOURNEY_CONFIG.approachingScoreThreshold)
  ) {
    return "approaching_production";
  }

  if (
    input.validReviews >= 2 &&
    (input.blockersResolved > 0 || input.trend === "improving" || input.trend === "stable")
  ) {
    return "production_aware";
  }

  if (
    input.currentStatus === "not_ready" ||
    (input.currentScore !== null && input.currentScore < JOURNEY_CONFIG.earlyBuildScoreThreshold)
  ) {
    return "early_build";
  }

  return "production_aware";
}
