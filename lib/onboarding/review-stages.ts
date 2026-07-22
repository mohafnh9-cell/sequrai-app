export const REVIEW_STAGE_KEYS = [
  "connectingRepository",
  "readingStructure",
  "checkingAuthentication",
  "checkingSecrets",
  "checkingDatabase",
  "checkingPayments",
  "checkingProductionConfig",
  "prioritizingRisks",
  "buildingVerdict",
] as const;

export type ReviewStageKey = (typeof REVIEW_STAGE_KEYS)[number];

const STATUS_ACTIVE_INDEX: Record<string, number> = {
  QUEUED: 0,
  FETCHING_REPOSITORY: 0,
  INDEXING: 1,
  SCANNING: 2,
  CALCULATING_SCORE: 8,
};

/**
 * Maps backend scan status + progress to an honest review stage index.
 * Stages before `activeIndex` are shown as completed; later stages stay pending.
 */
export function resolveReviewStageIndex(
  status: string | null | undefined,
  progress: number | null | undefined
): { activeIndex: number; completedThrough: number } {
  const normalized = status?.toUpperCase() ?? "QUEUED";
  let activeIndex = STATUS_ACTIVE_INDEX[normalized] ?? 0;

  if (normalized === "SCANNING") {
    const pct = Math.max(0, Math.min(100, progress ?? 20));
    const scanBand = Math.floor(((pct - 15) / 65) * 5);
    activeIndex = Math.max(2, Math.min(7, 2 + scanBand));
  }

  if (normalized === "COMPLETED") {
    return { activeIndex: REVIEW_STAGE_KEYS.length - 1, completedThrough: REVIEW_STAGE_KEYS.length - 1 };
  }

  return {
    activeIndex,
    completedThrough: Math.max(-1, activeIndex - 1),
  };
}
