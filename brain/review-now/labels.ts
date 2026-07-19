/**
 * Review source is intentionally *derived*, not stored redundantly: it is a
 * pure function of the two columns every scan already has
 * (`trigger_type`, `review_type`). This keeps a single source of truth for
 * "how did this review start" and avoids a schema migration for a value
 * that is 100% reconstructible from existing data.
 */
export type ReviewSource = "github_push" | "github_pull_request" | "web_manual" | "mcp_manual" | "unknown";

export function deriveReviewSource(
  triggerType: string | null | undefined,
  reviewType: string | null | undefined,
  eventType?: string | null
): ReviewSource {
  if (triggerType === "mcp") return "mcp_manual";
  if (triggerType === "webhook") {
    return eventType === "pull_request" ? "github_pull_request" : "github_push";
  }
  if (triggerType === "manual" && reviewType === "manual") return "web_manual";
  return "unknown";
}

const REVIEW_SOURCE_LABELS: Record<ReviewSource, string> = {
  github_push: "GitHub Push Review",
  github_pull_request: "GitHub Pull Request Review",
  web_manual: "Manual Review",
  mcp_manual: "MCP Manual Review",
  unknown: "Review",
};

export function describeReviewSource(source: ReviewSource): string {
  return REVIEW_SOURCE_LABELS[source];
}
