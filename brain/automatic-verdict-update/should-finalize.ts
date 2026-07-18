import type {
  AutomaticReviewScanSnapshot,
  AutomaticVerdictErrorCode,
  AutomaticVerdictFinalizeResult,
} from "./schema";

export function shouldFinalizeAutomaticVerdict(
  scan: AutomaticReviewScanSnapshot | null | undefined
): { shouldFinalize: true } | { shouldFinalize: false; errorCode: AutomaticVerdictErrorCode } {
  if (!scan) {
    return { shouldFinalize: false, errorCode: "missing_review" };
  }

  if (scan.review_type !== "automatic") {
    return { shouldFinalize: false, errorCode: "missing_review" };
  }

  if (scan.status === "failed" || scan.status === "cancelled") {
    return { shouldFinalize: false, errorCode: "automatic_review_failed" };
  }

  if (scan.status !== "completed") {
    return { shouldFinalize: false, errorCode: "missing_review" };
  }

  if (!scan.commit_sha?.trim()) {
    return { shouldFinalize: false, errorCode: "invalid_commit" };
  }

  return { shouldFinalize: true };
}

export function buildFinalizeFailure(
  errorCode: AutomaticVerdictErrorCode,
  scanId: string | null = null
): AutomaticVerdictFinalizeResult {
  return {
    ok: false,
    errorCode,
    verdictUpdated: false,
    scanId,
  };
}

export function buildFinalizeSuccess(scanId: string): AutomaticVerdictFinalizeResult {
  return {
    ok: true,
    errorCode: null,
    verdictUpdated: true,
    scanId,
  };
}
