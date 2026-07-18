import {
  VERDICT_STATUS_LABELS,
  type ProductionPriority,
  type VerdictStatus,
} from "@/brain/production-verdict/schema";
import type { ScanFinding } from "@/features/security-scanner/components/types";
import { findingFile } from "@/features/security-scanner/components/types";
import { guidanceForCategory } from "./category-guidance";
import { formatStackLines } from "./format-stack";
import type { FixPromptStack, ProductionFixPromptInput, ProductionFixPromptResult } from "./types";

function bulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

function section(title: string, body: string): string {
  return `${title}\n\n${body}`;
}

function severityImpact(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "Critical — blocks safe production deployment until resolved.";
    case "high":
      return "High — prevents shipping until this production blocker is fixed.";
    case "medium":
      return "Medium — improves production readiness but does not block deployment.";
    default:
      return "Low — incremental improvement to production readiness.";
  }
}

export function projectedVerdictAfterFix(input: ProductionFixPromptInput): string {
  const current = input.currentVerdictStatus ?? "not_ready";
  const projectedScore = (input.currentScore ?? 0) + (input.projectedScoreImpact ?? 0);

  if (projectedScore >= 85 && current !== "ready_to_ship") {
    return VERDICT_STATUS_LABELS.ready_to_ship;
  }
  if (projectedScore >= 70) {
    return VERDICT_STATUS_LABELS.almost_ready;
  }
  if (projectedScore >= 55) {
    return VERDICT_STATUS_LABELS.needs_improvement;
  }
  if (current === "insufficient_data" || current === "analysis_failed") {
    return VERDICT_STATUS_LABELS[current];
  }
  return VERDICT_STATUS_LABELS.not_ready;
}

export function buildProductionFixPrompt(
  input: ProductionFixPromptInput
): ProductionFixPromptResult {
  const guidance = guidanceForCategory(input.category);
  const buildCommands = input.buildCommands ?? guidance.buildRequirements;
  const projectedVerdictLabel = projectedVerdictAfterFix(input);
  const currentVerdictLabel = input.currentVerdictStatus
    ? VERDICT_STATUS_LABELS[input.currentVerdictStatus]
    : "Not Ready to Ship";

  const files =
    input.affectedFiles.length > 0
      ? bulletList(input.affectedFiles)
      : "- Review the codebase area related to this issue during implementation.";

  const stackLines = formatStackLines(input.stack).join("\n");

  const prompt = [
    section(
      "PROJECT CONTEXT",
      [
        input.projectName ? `Project: ${input.projectName}` : null,
        "Project stack:",
        stackLines,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    section(
      "ISSUE DETECTED",
      [input.issueTitle, "", input.issueDescription].filter(Boolean).join("\n")
    ),
    section(
      "WHY THIS MATTERS",
      [input.whyItMatters, "", `Estimated impact: ${input.estimatedImpact ?? severityImpact(input.severity)}`].join(
        "\n"
      )
    ),
    section(
      "GOAL",
      [
        `Resolve this ${input.category.replace(/_/g, " ")} production blocker with the smallest safe change.`,
        input.recommendedAction,
        input.estimatedFixMinutes
          ? `Target fix time: approximately ${input.estimatedFixMinutes} minutes.`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    ),
    section("FILES TO REVIEW", files),
    section("PRESERVE THE FOLLOWING", bulletList(guidance.preserve)),
    section("DO NOT MODIFY", bulletList(guidance.doNotModify)),
    section("IMPLEMENTATION REQUIREMENTS", [
      "Apply the smallest possible change that fully resolves this blocker.",
      "Match existing project conventions, naming, and file structure.",
      "Do not refactor unrelated code or redesign the architecture.",
      "",
      input.recommendedAction,
    ].join("\n")),
    section("REGRESSION TESTS", bulletList(guidance.regressionTests)),
    section(
      "VALIDATION",
      [
        "Before finishing, run:",
        bulletList(buildCommands),
        "",
        "Confirm the fix does not introduce new TypeScript, lint, or test failures.",
      ].join("\n")
    ),
    section(
      "EXPECTED RESULT",
      [
        "Current Production Verdict:",
        currentVerdictLabel,
        "",
        "Projected after this fix:",
        projectedVerdictLabel,
        input.projectedScoreImpact
          ? `(Estimated score improvement: +${input.projectedScoreImpact} points)`
          : null,
      ]
        .filter(Boolean)
        .join("\n")
    ),
  ].join("\n\n------------------------------------------------------------\n\n");

  return { prompt, projectedVerdictLabel };
}

export function fixPromptInputFromPriority(
  priority: ProductionPriority,
  options: {
    projectName?: string;
    stack?: FixPromptStack;
    findingsById?: Map<string, ScanFinding>;
    currentVerdictStatus?: VerdictStatus;
    currentScore?: number | null;
  } = {}
): ProductionFixPromptInput {
  const linkedFindings = priority.findingIds
    .map((id) => options.findingsById?.get(id))
    .filter((finding): finding is ScanFinding => Boolean(finding));

  const descriptions = linkedFindings
    .map((finding) => finding.description)
    .filter(Boolean)
    .join("\n");

  const affectedFiles =
    priority.affectedFiles.length > 0
      ? priority.affectedFiles
      : linkedFindings.map((finding) => findingFile(finding)).filter(Boolean);

  return {
    projectName: options.projectName,
    issueTitle: priority.title,
    issueDescription: descriptions || priority.reason,
    category: priority.category,
    severity: priority.severity,
    whyItMatters: priority.reason,
    affectedFiles,
    stack: options.stack ?? { languages: [], frameworks: [], services: [] },
    recommendedAction: priority.recommendedAction,
    estimatedFixMinutes: priority.estimatedMinutes,
    projectedScoreImpact: priority.projectedScoreImpact,
    currentVerdictStatus: options.currentVerdictStatus,
    currentScore: options.currentScore,
  };
}

export function fixPromptInputFromFinding(
  finding: ScanFinding,
  options: {
    projectName?: string;
    stack?: FixPromptStack;
    recommendedAction?: string;
    currentVerdictStatus?: VerdictStatus;
    currentScore?: number | null;
    projectedScoreImpact?: number;
  } = {}
): ProductionFixPromptInput {
  const path = findingFile(finding);
  return {
    projectName: options.projectName,
    issueTitle: finding.title ?? "Production blocker",
    issueDescription: finding.description ?? finding.recommendation ?? "",
    category: finding.category ?? "security",
    severity: finding.severity ?? "high",
    whyItMatters:
      finding.impact ??
      finding.description ??
      "This issue prevents safe production deployment.",
    estimatedImpact: finding.impact,
    affectedFiles: path ? [path] : [],
    stack: options.stack ?? { languages: [], frameworks: [], services: [] },
    recommendedAction:
      options.recommendedAction ??
      finding.recommendation ??
      "Apply the smallest safe fix that resolves this production blocker.",
    currentVerdictStatus: options.currentVerdictStatus,
    currentScore: options.currentScore,
    projectedScoreImpact: options.projectedScoreImpact,
  };
}

export function findingsByIdMap(findings: ScanFinding[]): Map<string, ScanFinding> {
  return new Map(
    findings
      .filter((finding) => typeof finding.id === "string" && finding.id.length > 0)
      .map((finding) => [finding.id as string, finding])
  );
}
