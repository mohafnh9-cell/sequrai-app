import { redactEvidence } from "../redaction";
import type { Confidence, FindingDraft, NormalizedFile, Severity } from "../types";

export interface PatternSpec {
  pattern: RegExp;
  title: string;
  description: string;
  severity: Severity;
  confidence: Confidence;
  category: string;
  remediation: string;
  path?: RegExp;
  excludePath?: RegExp;
}

export function patternFindings(ruleId: string, files: readonly NormalizedFile[], specs: PatternSpec[]): FindingDraft[] {
  const findings: FindingDraft[] = [];
  for (const file of files) {
    for (let index = 0; index < file.lines.length; index += 1) {
      const line = file.lines[index];
      for (const spec of specs) {
        if (spec.path && !spec.path.test(file.path)) continue;
        if (spec.excludePath?.test(file.path)) continue;
        spec.pattern.lastIndex = 0;
        const match = spec.pattern.exec(line);
        if (!match) continue;
        findings.push({
          ruleId,
          title: spec.title,
          description: spec.description,
          severity: spec.severity,
          confidence: spec.confidence,
          category: spec.category,
          location: { path: file.path, line: index + 1, column: match.index + 1 },
          evidence: redactEvidence(line.trim()),
          remediation: spec.remediation,
          fingerprintMaterial: match[0].replace(/\s+/g, " "),
        });
      }
    }
  }
  return findings;
}
