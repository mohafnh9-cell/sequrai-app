export type ProjectProductionStatus =
  | "ready_for_production"
  | "almost_ready"
  | "needs_improvements"
  | "not_ready"
  | "not_scanned";

export const PROJECT_STATUS_LABELS: Record<ProjectProductionStatus, string> = {
  ready_for_production: "Ready to Ship",
  almost_ready: "Almost Ready",
  needs_improvements: "Needs Improvement",
  not_ready: "Not Ready",
  not_scanned: "Not Analyzed",
};

export function getProjectProductionStatus(input: {
  score: number | null;
  blockersCount: number;
}): ProjectProductionStatus {
  const { score, blockersCount } = input;
  if (score === null) return "not_scanned";
  if (score >= 85 && blockersCount === 0) return "ready_for_production";
  if (score >= 70 && blockersCount <= 2) return "almost_ready";
  if (score >= 25) return "needs_improvements";
  return "not_ready";
}

export function getProjectStatusBadgeVariant(
  status: ProjectProductionStatus
): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "ready_for_production":
      return "default";
    case "almost_ready":
      return "secondary";
    case "needs_improvements":
      return "outline";
    case "not_ready":
      return "destructive";
    case "not_scanned":
      return "outline";
  }
}

export function getHeroHeadline(input: {
  score: number | null;
  blockersCount: number;
}): string {
  const { score, blockersCount } = input;
  if (score === null) return "YOUR APPLICATION HAS NOT BEEN ANALYZED";
  if (score >= 90 && blockersCount === 0) {
    return "YOUR APPLICATION IS READY FOR PRODUCTION";
  }
  if (score >= 85 && blockersCount === 0) {
    return "YOUR APPLICATION IS READY FOR PRODUCTION";
  }
  return "YOUR APPLICATION IS NOT READY FOR PRODUCTION";
}

export function getHeroSubheadline(input: {
  score: number | null;
  blockersCount: number;
  estimatedMinutes: number;
}): string {
  const { score, blockersCount, estimatedMinutes } = input;
  if (score === null) {
    return "Run a production readiness check to see how close you are to deploying.";
  }
  if (score >= 85 && blockersCount === 0) {
    return "Your Senior Production Engineer has approved this application for deployment.";
  }
  const blockerLine =
    blockersCount === 0
      ? "No production blockers remaining."
      : `${blockersCount} production blocker${blockersCount === 1 ? "" : "s"} remaining.`;
  const timeLine =
    estimatedMinutes > 0
      ? `Estimated time to production: ${estimatedMinutes} minutes.`
      : "Complete the roadmap below to reach production.";
  return `${blockerLine} ${timeLine}`;
}
