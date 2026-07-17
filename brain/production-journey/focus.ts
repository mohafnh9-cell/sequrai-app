import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";

const FOCUS_CATEGORY_MAP: Record<string, string> = {
  authentication: "focus.authentication",
  authorization: "focus.authorization",
  secrets: "focus.secretManagement",
  "secret management": "focus.secretManagement",
  security: "focus.dataProtection",
  "data protection": "focus.dataProtection",
  dependencies: "focus.dependencies",
  deployment: "focus.deploymentConfiguration",
  "deployment configuration": "focus.deploymentConfiguration",
  database: "focus.databaseAccess",
  performance: "focus.performance",
  reliability: "focus.reliability",
};

function normalizeCategory(category: string): string {
  return category.trim().toLowerCase();
}

export function determineCurrentFocus(
  verdict: ProductionVerdictV1 | null
): { focus: string | null; focusKey: string | null } {
  if (!verdict) {
    return { focus: null, focusKey: null };
  }

  const top = verdict.topPriorities[0];
  if (top) {
    const key = FOCUS_CATEGORY_MAP[normalizeCategory(top.category)];
    if (key) return { focus: top.category, focusKey: key };
    return { focus: top.category, focusKey: "focus.technicalReview" };
  }

  const partial = verdict.partiallyEvaluatedAreas[0];
  if (partial) {
    const key = FOCUS_CATEGORY_MAP[normalizeCategory(partial.label)] ?? FOCUS_CATEGORY_MAP[partial.key];
    if (key) return { focus: partial.label, focusKey: key };
  }

  if (verdict.blockersCount > 0) {
    return { focus: null, focusKey: "focus.technicalReview" };
  }

  return { focus: null, focusKey: null };
}
