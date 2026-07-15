import type { PriorityLevel, ProjectSecurityContext } from "./types";

const SEVERITY_WEIGHT: Record<string, number> = {
  critical: 30,
  high: 18,
  medium: 8,
  low: 3,
  info: 0,
};

const EXPOSURE_BY_CATEGORY: Record<string, number> = {
  secrets: 1.4,
  authentication: 1.3,
  authorization: 1.25,
  injection: 1.35,
  configuration: 1.1,
  web: 1.05,
  xss: 1.2,
  dependencies: 1.15,
};

export function calculateRiskScore(context: ProjectSecurityContext): {
  riskScore: number;
  priorityLevel: PriorityLevel;
  factors: Record<string, number>;
} {
  let raw = 0;
  const factors: Record<string, number> = {};

  for (const [severity, count] of Object.entries(context.severityCounts)) {
    const weight = (SEVERITY_WEIGHT[severity.toLowerCase()] ?? 0) * count;
    factors[`severity_${severity}`] = weight;
    raw += weight;
  }

  for (const [category, count] of Object.entries(context.categoryCounts)) {
    const multiplier = EXPOSURE_BY_CATEGORY[category.toLowerCase()] ?? 1;
    const contribution = count * 4 * multiplier;
    factors[`category_${category}`] = contribution;
    raw += contribution;
  }

  if (context.stack.services.includes("Supabase")) {
    factors.supabase_stack = 8;
    raw += 8;
  }
  if (context.stack.frameworks.includes("Next.js")) {
    factors.nextjs_stack = 5;
    raw += 5;
  }
  if (context.findingsCount > 50) {
    factors.volume = 10;
    raw += 10;
  }
  if (context.securityScore < 40) {
    factors.low_security_score = 12;
    raw += 12;
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(raw)));
  const priorityLevel =
    riskScore >= 90
      ? "critical"
      : riskScore >= 75
        ? "very_high"
        : riskScore >= 55
          ? "high"
          : riskScore >= 35
            ? "medium"
            : "low";

  return { riskScore, priorityLevel, factors };
}
