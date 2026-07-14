import { SEVERITY_WEIGHT } from "./constants";
import type { Finding, ScoreBreakdown, Severity } from "./types";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info"];
const CONFIDENCE_FACTOR = { high: 1, medium: 0.8, low: 0.5 } as const;
const MAX_OCCURRENCES_PER_RULE = 3;

export function scoreFindings(findings: Finding[]): ScoreBreakdown {
  const counts = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<Severity, number>;
  const deductions = Object.fromEntries(SEVERITIES.map((severity) => [severity, 0])) as Record<Severity, number>;
  const ruleSeverityDeductions = new Map<string, number>();
  for (const finding of findings) {
    counts[finding.severity] += 1;
    const weighted =
      SEVERITY_WEIGHT[finding.severity] * CONFIDENCE_FACTOR[finding.confidence];
    const bucket = `${finding.ruleId}:${finding.severity}`;
    const current = ruleSeverityDeductions.get(bucket) ?? 0;
    const cap = SEVERITY_WEIGHT[finding.severity] * MAX_OCCURRENCES_PER_RULE;
    const applied = Math.max(0, Math.min(weighted, cap - current));
    ruleSeverityDeductions.set(bucket, current + applied);
    deductions[finding.severity] += applied;
  }
  for (const severity of SEVERITIES) deductions[severity] = Math.round(deductions[severity]);
  const score = Math.max(
    0,
    100 - Object.values(deductions).reduce((sum, value) => sum + value, 0)
  );
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";
  return { score, grade, counts, deductions };
}
