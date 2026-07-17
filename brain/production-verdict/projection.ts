import type { NormalizedFinding } from "./normalize-finding";
import type { ProductionPriority } from "./schema";

const SEVERITY_PENALTY: Record<string, number> = {
  critical: 12,
  high: 6,
  medium: 2,
  low: 1,
  info: 0,
};

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreFromFindings(
  securityScore: number,
  findings: NormalizedFinding[]
): number {
  let penalty = 0;
  for (const finding of findings) {
    penalty += SEVERITY_PENALTY[finding.severity] ?? 0;
    if (finding.confidence === "high" && finding.severity === "critical") {
      penalty += 4;
    }
  }
  return clampScore(securityScore - penalty * 0.35);
}

export function calculateHonestScore(input: {
  securityScore: number | null;
  findings: NormalizedFinding[];
  hasSufficientCoverage: boolean;
}): number | null {
  if (!input.hasSufficientCoverage) return null;
  if (input.securityScore === null) return null;

  return scoreFromFindings(input.securityScore, input.findings);
}

export function projectScoreAfterPriorities(input: {
  currentScore: number | null;
  securityScore: number | null;
  allFindings: NormalizedFinding[];
  priorities: ProductionPriority[];
}): { projectedScore: number | null; impacts: number[] } {
  if (input.currentScore === null || input.securityScore === null) {
    return { projectedScore: null, impacts: [] };
  }

  const resolvedIds = new Set(input.priorities.flatMap((p) => p.findingIds));
  const remaining = input.allFindings.filter((f) => !resolvedIds.has(f.id));
  const projected = scoreFromFindings(input.securityScore, remaining);

  const impacts = input.priorities.map((priority) => {
    const withoutGroup = input.allFindings.filter((f) => !priority.findingIds.includes(f.id));
    const withGroup = input.allFindings;
    const scoreWithout = scoreFromFindings(input.securityScore!, withoutGroup);
    const scoreWith = scoreFromFindings(input.securityScore!, withGroup);
    return Math.max(0, scoreWithout - scoreWith);
  });

  return {
    projectedScore: projected,
    impacts: impacts.map((impact, index) => Math.max(impacts[index] ?? impact, 3)),
  };
}

export function applyProjectedImpacts(
  priorities: ProductionPriority[],
  impacts: number[]
): ProductionPriority[] {
  return priorities.map((priority, index) => ({
    ...priority,
    projectedScoreImpact: impacts[index] ?? 3,
  }));
}
