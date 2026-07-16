import type { ProductionReadyScore, ReadinessDimensionKey, ReadinessDimensions } from "../types";
import { CATEGORY_TO_DIMENSIONS, DIMENSION_CATEGORY_MAP, DIMENSION_WEIGHTS } from "./dimensions";

export type ReadinessInput = {
  securityScore: number | null;
  severityCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  categoryCounts: Record<string, number>;
  estimatedMinutesFromPriorities?: number;
};

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

function scoreDimension(
  baseSecurity: number,
  categoryCounts: Record<string, number>,
  dimension: ReadinessDimensionKey
): number {
  const categories = DIMENSION_CATEGORY_MAP[dimension];
  let penalty = 0;
  for (const category of categories) {
    const count = categoryCounts[category] ?? 0;
    const weight = category === "secrets" ? 4 : category === "authentication" ? 3 : 2;
    penalty += count * weight;
  }

  if (dimension === "architecture") {
    return clampScore(baseSecurity * 0.92 - penalty * 0.5);
  }
  if (dimension === "performance") {
    return clampScore(baseSecurity * 0.88 - penalty * 0.3);
  }

  return clampScore(baseSecurity - penalty);
}

function distributeCategoryPenalties(categoryCounts: Record<string, number>): Partial<ReadinessDimensions> {
  const adjustments: Partial<Record<ReadinessDimensionKey, number>> = {};
  for (const [category, count] of Object.entries(categoryCounts)) {
    const dimensions = CATEGORY_TO_DIMENSIONS[category.toLowerCase()] ?? ["security"];
    for (const dimension of dimensions) {
      adjustments[dimension] = (adjustments[dimension] ?? 0) + count * 2;
    }
  }
  return adjustments;
}

export function calculateProductionReadiness(input: ReadinessInput): ProductionReadyScore {
  const base = input.securityScore;
  const blockersCount = input.severityCounts.critical + input.severityCounts.high;
  const improvementsCount = input.severityCounts.medium + input.severityCounts.low;

  if (base === null) {
    return {
      overall: null,
      dimensions: {
        security: null,
        architecture: null,
        bestPractices: null,
        performance: null,
        authentication: null,
        databaseDesign: null,
        deploymentReadiness: null,
      },
      blockersCount,
      improvementsCount,
      estimatedMinutesToReady: 0,
      readyForProduction: false,
    };
  }

  const dimensions: ReadinessDimensions = {
    security: scoreDimension(base, input.categoryCounts, "security"),
    architecture: scoreDimension(base, input.categoryCounts, "architecture"),
    bestPractices: scoreDimension(base, input.categoryCounts, "bestPractices"),
    performance: scoreDimension(base, input.categoryCounts, "performance"),
    authentication: scoreDimension(base, input.categoryCounts, "authentication"),
    databaseDesign: scoreDimension(base, input.categoryCounts, "databaseDesign"),
    deploymentReadiness: scoreDimension(base, input.categoryCounts, "deploymentReadiness"),
  };

  distributeCategoryPenalties(input.categoryCounts);

  let weightedSum = 0;
  let weightTotal = 0;
  for (const [key, weight] of Object.entries(DIMENSION_WEIGHTS) as Array<
    [ReadinessDimensionKey, number]
  >) {
    const value = dimensions[key];
    if (value !== null) {
      weightedSum += value * weight;
      weightTotal += weight;
    }
  }

  const overall = weightTotal > 0 ? clampScore(weightedSum / weightTotal) : null;

  const fallbackMinutes =
    blockersCount * 10 + improvementsCount * 4 + (overall !== null && overall < 70 ? 15 : 0);
  const estimatedMinutesToReady = Math.min(
    120,
    input.estimatedMinutesFromPriorities && input.estimatedMinutesFromPriorities > 0
      ? input.estimatedMinutesFromPriorities
      : fallbackMinutes
  );

  return {
    overall,
    dimensions,
    blockersCount,
    improvementsCount,
    estimatedMinutesToReady,
    readyForProduction: overall !== null && overall >= 85 && blockersCount === 0,
  };
}

export function estimateRiskFromScan(input: {
  securityScore: number;
  severityCounts: ReadinessInput["severityCounts"];
  categoryCounts: Record<string, number>;
  findingsCount: number;
  stack?: { frameworks?: string[]; services?: string[] };
}): number {
  let raw = 0;
  for (const [severity, count] of Object.entries(input.severityCounts)) {
    raw += (SEVERITY_PENALTY[severity] ?? 0) * count;
  }
  for (const count of Object.values(input.categoryCounts)) {
    raw += count * 2;
  }
  if (input.stack?.services?.includes("Supabase")) raw += 8;
  if (input.stack?.frameworks?.includes("Next.js")) raw += 5;
  if (input.findingsCount > 50) raw += 10;
  if (input.securityScore < 40) raw += 12;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
