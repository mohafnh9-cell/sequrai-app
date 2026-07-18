import type { ReviewStatus } from "./schema";

const PROCESSING_SCAN_STATUSES = new Set([
  "fetching_repository",
  "indexing",
  "scanning",
  "calculating_score",
]);

export function mapScanStatusToReviewStatus(
  scanStatus: string | null | undefined
): ReviewStatus {
  switch (scanStatus) {
    case "queued":
      return "pending";
    case "completed":
      return "completed";
    case "failed":
    case "cancelled":
      return "failed";
    default:
      if (scanStatus && PROCESSING_SCAN_STATUSES.has(scanStatus)) {
        return "processing";
      }
      return "pending";
  }
}

export function isActiveReviewScanStatus(scanStatus: string): boolean {
  return (
    scanStatus === "queued" || PROCESSING_SCAN_STATUSES.has(scanStatus)
  );
}
