/**
 * @deprecated Prefer generateProductionVerdict from ./engine.ts
 * This module delegates to the Production Verdict Engine and adapts to the legacy UI shape.
 */
import type { BrainPriority } from "../types";
import type { ProductionRoadmap } from "../production-experience/roadmap";
import { generateProductionVerdict } from "./engine";
import { toLegacyVerdict, LEGACY_VERDICT_LABELS, type LegacyProductionVerdict } from "./adapters/legacy";
import {
  formatGithubCheckDescription as formatGithubCheckDescriptionV1,
  formatGithubCheckSummary as formatGithubCheckSummaryV1,
  formatMcpVerdictSummary as formatMcpVerdictSummaryV1,
  githubVerdictLabel as githubVerdictLabelV1,
} from "./adapters/format";
import type { ProductionVerdictV1 } from "./schema";

export type ProductionVerdictStatus = LegacyProductionVerdict["status"];
export type ProductionVerdict = LegacyProductionVerdict;
export type ProductionVerdictPriority = LegacyProductionVerdict["priorities"][number];
export type EvaluatedArea = LegacyProductionVerdict["evaluatedAreas"][number];

export const PRODUCTION_VERDICT_LABELS = LEGACY_VERDICT_LABELS;

/**
 * Legacy input shape kept for this @deprecated adapter's call sites after the
 * legacy production-readiness engine was removed (ADR-001 cleanup). Only
 * `securityScore` is read here; the other fields are accepted so existing
 * callers/tests do not need to change their fixtures.
 */
type LegacyReadinessInput = {
  securityScore: number | null;
  severityCounts?: Record<string, number>;
  categoryCounts?: Record<string, number>;
  estimatedMinutesFromPriorities?: number;
};

export function buildProductionVerdict(input: {
  readinessInput: LegacyReadinessInput;
  previousScore?: number | null;
  previousBlockersCount?: number;
  priorities?: BrainPriority[];
  roadmap?: ProductionRoadmap | null;
  findings?: Array<{
    id?: string;
    title: string;
    severity: string;
    category?: string;
    recommendation?: string | null;
    file_path?: string;
    rule_id?: string;
  }>;
  projectId?: string;
  repositoryId?: string;
  scanId?: string;
  scanStatus?: string;
  filesAnalyzed?: number;
  aiExecutiveSummary?: string | null;
}): LegacyProductionVerdict {
  const { verdict } = generateProductionVerdict({
    projectId: input.projectId ?? "00000000-0000-4000-8000-000000000001",
    repositoryId: input.repositoryId ?? input.projectId ?? "00000000-0000-4000-8000-000000000001",
    scanId: input.scanId ?? "00000000-0000-4000-8000-000000000002",
    scanStatus: input.scanStatus ?? "completed",
    securityScore: input.readinessInput.securityScore,
    filesAnalyzed: input.filesAnalyzed ?? 10,
    findings: (input.findings ?? []).map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      category: f.category,
      recommendation: f.recommendation,
      file_path: f.file_path,
      rule_id: f.rule_id,
    })),
    previousScore: input.previousScore,
    previousBlockersCount: input.previousBlockersCount,
    aiExecutiveSummary: input.aiExecutiveSummary,
  });

  return toLegacyVerdict(verdict);
}

export function githubVerdictLabel(status: ProductionVerdictStatus): string {
  const v1Status = {
    ready_for_production: "ready_to_ship",
    almost_ready: "almost_ready",
    needs_improvements: "needs_improvement",
    not_ready: "not_ready",
    not_scanned: "insufficient_data",
  } as const;
  return githubVerdictLabelV1(v1Status[status]);
}

export function formatGithubCheckDescription(input: {
  verdict: LegacyProductionVerdict;
  blockersIntroduced?: number;
  blockersResolved?: number;
}): string {
  const v1 = input.verdict.v1;
  const merged: ProductionVerdictV1 = {
    ...v1,
    introducedBlockers: input.blockersIntroduced ?? v1.introducedBlockers,
    resolvedBlockers: input.blockersResolved ?? v1.resolvedBlockers,
  };
  return formatGithubCheckDescriptionV1(merged);
}

export function formatGithubCheckSummary(input: {
  verdict: LegacyProductionVerdict;
  reportUrl?: string;
  blockersIntroduced?: number;
  blockersResolved?: number;
}): string {
  const v1 = input.verdict.v1;
  const merged: ProductionVerdictV1 = {
    ...v1,
    introducedBlockers: input.blockersIntroduced ?? v1.introducedBlockers,
    resolvedBlockers: input.blockersResolved ?? v1.resolvedBlockers,
  };
  return formatGithubCheckSummaryV1({ verdict: merged, reportUrl: input.reportUrl });
}

export function formatMcpVerdictSummary(verdict: LegacyProductionVerdict): string {
  return formatMcpVerdictSummaryV1(verdict.v1);
}

export { generateProductionVerdict } from "./engine";
export type { ProductionVerdictV1 } from "./schema";
export {
  PRODUCTION_VERDICT_VERSION,
  VERDICT_STATUS_LABELS,
  ProductionVerdictSchema,
  parseProductionVerdict,
} from "./schema";
