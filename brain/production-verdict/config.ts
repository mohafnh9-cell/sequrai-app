export const VERDICT_THRESHOLDS = {
  readyToShipScore: 85,
  almostReadyScore: 70,
  needsImprovementScore: 25,
  maxHighBlockersForAlmostReady: 2,
  maxHighBlockersForReady: 0,
  minCoverageRatio: 0.15,
  minFilesAnalyzed: 3,
  scoreDropSignificant: 5,
} as const;

export type VerdictThresholds = typeof VERDICT_THRESHOLDS;
