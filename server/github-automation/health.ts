import "server-only";

const CRITICAL_PATHS =
  /(?:^|\/)(?:package\.json|package-lock\.json|pnpm-lock\.yaml|yarn\.lock|next\.config\.(?:js|mjs|ts)|middleware\.(?:js|ts)|auth\.(?:js|ts)|prisma\/schema\.prisma|\.env(?:\.example)?)$/i;

export function isCriticalPath(path: string): boolean {
  return CRITICAL_PATHS.test(path);
}

export function extractCriticalPaths(paths: string[]): string[] {
  return paths.filter(isCriticalPath);
}

export type HealthStatus = "excellent" | "good" | "needs_attention" | "critical";

/**
 * ADR-001: this is an internal GitHub-automation health label used for the
 * activity feed and repository badge only. It is NOT a product-level
 * readiness decision and must never be treated as, or substituted for, the
 * Production Verdict. It is derived exclusively from the same scanner
 * outputs already feeding the Verdict Engine (security score, open findings,
 * critical count, score trend) — never from an independently computed risk
 * score.
 */
export function calculateRepositoryHealth(input: {
  securityScore: number;
  openFindings: number;
  criticalOpen: number;
  scoreTrend: number;
}): { status: HealthStatus; factors: Record<string, unknown> } {
  let status: HealthStatus = "excellent";
  if (input.criticalOpen > 0 || input.securityScore < 40) {
    status = "critical";
  } else if (input.securityScore < 60 || input.openFindings > 30) {
    status = "needs_attention";
  } else if (input.securityScore < 80 || input.openFindings > 10) {
    status = "good";
  }

  return {
    status,
    factors: {
      securityScore: input.securityScore,
      openFindings: input.openFindings,
      criticalOpen: input.criticalOpen,
      scoreTrend: input.scoreTrend,
    },
  };
}

export function securityCheckStatus(input: {
  securityScore: number;
  criticalCount: number;
  highCount: number;
}): "passed" | "failed" | "warning" {
  if (input.criticalCount > 0) return "failed";
  if (input.highCount > 0 || input.securityScore < 70) return "warning";
  return "passed";
}
