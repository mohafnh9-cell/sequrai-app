export type AnalyticsEvent =
  | "verdict_viewed"
  | "roadmap_viewed"
  | "priority_opened"
  | "fix_requested"
  | "technical_findings_opened"
  | "retry_scan_clicked"
  | "ready_to_ship_reached"
  | "coverage_methodology_opened";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

export function trackEvent(event: AnalyticsEvent, payload?: AnalyticsPayload): void {
  if (process.env.NODE_ENV === "development") {
    console.info({ component: "analytics", event, ...payload });
  }
  // Provider hook: wire PostHog/Segment here when available.
}
