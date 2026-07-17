import type { VerdictStatus } from "@/brain/production-verdict/schema";

export function isValidJourneyVerdict(status: VerdictStatus, score: number | null): boolean {
  if (status === "analysis_failed") return false;
  if (score === null) return false;
  return true;
}

export function isChartableVerdict(status: VerdictStatus, score: number | null): boolean {
  return isValidJourneyVerdict(status, score);
}
