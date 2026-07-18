import type { ProductionFixPromptInput } from "./types";

export type ImplementationRisk = "LOW" | "MEDIUM" | "HIGH";
export type ScopeComplexity = "low" | "medium" | "high";

export type SafeFixAssessment = {
  safeFixConfidence: number;
  implementationRisk: ImplementationRisk;
  riskReason: string;
  estimatedScope: {
    filesExpected: number;
    estimatedLocMin: number;
    estimatedLocMax: number;
    complexity: ScopeComplexity;
    complexityLabel: string;
  };
};

const HIGH_RISK_CATEGORIES = new Set(["authorization", "database"]);
const MEDIUM_RISK_CATEGORIES = new Set(["authentication", "security"]);

function normalizeCategory(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "_");
}

function complexityLabel(complexity: ScopeComplexity): string {
  switch (complexity) {
    case "low":
      return "Low — localized change in one or two files.";
    case "medium":
      return "Medium — coordinated changes across a small set of files.";
    case "high":
      return "High — cross-cutting change requiring careful validation.";
  }
}

function assessRisk(input: ProductionFixPromptInput): {
  implementationRisk: ImplementationRisk;
  riskReason: string;
} {
  const category = normalizeCategory(input.category);
  const fileCount = Math.max(input.affectedFiles.length, 1);
  const severity = input.severity.toLowerCase();

  if (HIGH_RISK_CATEGORIES.has(category) || (severity === "critical" && fileCount >= 3)) {
    return {
      implementationRisk: "HIGH",
      riskReason:
        category === "authorization" || category === "database"
          ? "Database or authorization policy changes can affect access for all users."
          : "Multiple critical touchpoints increase regression risk.",
    };
  }

  if (
    MEDIUM_RISK_CATEGORIES.has(category) ||
    severity === "critical" ||
    fileCount >= 2
  ) {
    const reason =
      category === "authentication"
        ? "Authentication flow updates affect sign-in and session behaviour."
        : category === "security"
          ? "Security hardening may touch request handling or middleware."
          : "More than one file may need a coordinated safe change.";
    return { implementationRisk: "MEDIUM", riskReason: reason };
  }

  return {
    implementationRisk: "LOW",
    riskReason: "Single-file or configuration-level change with narrow blast radius.",
  };
}

function assessConfidence(input: ProductionFixPromptInput, risk: ImplementationRisk): number {
  let score = 88;

  const fileCount = input.affectedFiles.length;
  if (fileCount === 1) score += 6;
  else if (fileCount === 2) score += 3;
  else if (fileCount === 0) score -= 8;
  else if (fileCount >= 4) score -= 6;

  if (input.recommendedAction.trim().length >= 40) score += 4;

  const severity = input.severity.toLowerCase();
  if (severity === "critical") score -= 6;
  if (severity === "high") score -= 2;

  const category = normalizeCategory(input.category);
  if (HIGH_RISK_CATEGORIES.has(category)) score -= 10;
  else if (MEDIUM_RISK_CATEGORIES.has(category)) score -= 5;

  if (risk === "LOW") score += 4;
  if (risk === "HIGH") score -= 6;

  if (input.estimatedFixMinutes != null && input.estimatedFixMinutes <= 10) score += 3;

  return Math.max(70, Math.min(98, score));
}

function assessScope(
  input: ProductionFixPromptInput,
  risk: ImplementationRisk
): SafeFixAssessment["estimatedScope"] {
  const filesExpected = Math.max(input.affectedFiles.length, 1);
  const minutes = input.estimatedFixMinutes ?? Math.max(5, filesExpected * 8);

  let complexity: ScopeComplexity = "low";
  if (risk === "HIGH" || filesExpected >= 3) complexity = "high";
  else if (risk === "MEDIUM" || filesExpected === 2) complexity = "medium";

  const locPerMinute = complexity === "low" ? 3 : complexity === "medium" ? 4 : 5;
  const estimatedLocMin = Math.max(3, Math.round(minutes * locPerMinute * 0.4));
  const estimatedLocMax = Math.max(
    estimatedLocMin + 5,
    Math.round(minutes * locPerMinute * 1.1)
  );

  return {
    filesExpected,
    estimatedLocMin,
    estimatedLocMax,
    complexity,
    complexityLabel: complexityLabel(complexity),
  };
}

export function assessSafeFix(input: ProductionFixPromptInput): SafeFixAssessment {
  const { implementationRisk, riskReason } = assessRisk(input);
  const safeFixConfidence = assessConfidence(input, implementationRisk);
  const estimatedScope = assessScope(input, implementationRisk);

  return {
    safeFixConfidence,
    implementationRisk,
    riskReason,
    estimatedScope,
  };
}

export function formatEstimatedFixTime(minutes?: number): string {
  if (minutes == null || minutes <= 0) return "5 minutes";
  if (minutes === 1) return "1 minute";
  return `${minutes} minutes`;
}

export function riskColor(risk: ImplementationRisk): string {
  switch (risk) {
    case "LOW":
      return "text-[#64D98B]";
    case "MEDIUM":
      return "text-[#F7C65F]";
    case "HIGH":
      return "text-[#FF5C6C]";
  }
}
