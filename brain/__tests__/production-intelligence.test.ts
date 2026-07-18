import { describe, expect, it } from "vitest";
import {
  buildProductionIntelligence,
  buildWhatChanged,
  buildRecommendedAction,
  buildProductionInsights,
  buildWeeklyReview,
} from "@/brain/production-intelligence";
import { buildProductionJourney, type VerdictJourneyRecord } from "@/brain/production-journey";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { PRODUCTION_VERDICT_VERSION } from "@/brain/production-verdict/schema";

function uuid(n: number): string {
  return `20000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function baseVerdict(overrides: Partial<ProductionVerdictV1> = {}): ProductionVerdictV1 {
  return {
    version: PRODUCTION_VERDICT_VERSION,
    projectId: uuid(1),
    repositoryId: uuid(1),
    scanId: uuid(2),
    commitSha: "abc123",
    branch: "main",
    status: "needs_improvement",
    score: 60,
    previousScore: 50,
    scoreDelta: 10,
    projectedScore: 75,
    projectedScoreIsEstimate: true,
    blockersCount: 2,
    criticalBlockersCount: 1,
    highBlockersCount: 1,
    estimatedFixMinutes: 30,
    confidence: "high",
    executiveSummary: "Summary",
    topPriorities: [],
    evaluatedAreas: [],
    partiallyEvaluatedAreas: [],
    unevaluatedAreas: [],
    introducedBlockers: 0,
    resolvedBlockers: 1,
    coverageRatio: 0.8,
    filesAnalyzed: 10,
    findingsCount: 2,
    recommendedAction: "Fix auth",
    methodologyNote: "Note",
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

type RecordInput = Partial<Omit<VerdictJourneyRecord, "verdict">> & {
  verdict?: Partial<ProductionVerdictV1>;
};

function record(index: number, overrides: RecordInput = {}): VerdictJourneyRecord {
  const generatedAt = new Date(Date.UTC(2026, 0, index + 1)).toISOString();
  const verdictOverrides = overrides.verdict ?? {};
  const verdict = baseVerdict({
    scanId: uuid(100 + index),
    generatedAt,
    ...verdictOverrides,
  });
  const { verdict: _v, ...rest } = overrides;
  return {
    id: uuid(1000 + index),
    scanId: verdict.scanId,
    projectId: verdict.projectId,
    repositoryId: verdict.repositoryId,
    generatedAt,
    commitSha: verdict.commitSha,
    branch: verdict.branch,
    status: verdict.status,
    score: verdict.score,
    previousScore: verdict.previousScore,
    scoreDelta: verdict.scoreDelta,
    blockersCount: verdict.blockersCount,
    introducedBlockers: verdict.introducedBlockers,
    resolvedBlockers: verdict.resolvedBlockers,
    verdict,
    ...rest,
  };
}

describe("Block 6.6 Production Intelligence", () => {
  it("detects improvements and regressions", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 50, scoreDelta: null } }),
      record(1, {
        verdict: {
          score: 61,
          scoreDelta: 11,
          resolvedBlockers: 2,
          introducedBlockers: 0,
        },
        resolvedBlockers: 2,
      }),
    ]);
    const changed = buildWhatChanged(journey);
    expect(changed.improvements.some((i) => i.messageKey === "whatChanged.scoreIncreased")).toBe(
      true
    );
    expect(changed.improvements.some((i) => i.messageKey === "whatChanged.blockersResolved")).toBe(
      true
    );
  });

  it("returns no significant changes when latest delta is zero", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 60, scoreDelta: null } }),
      record(1, { verdict: { score: 60, scoreDelta: 0, introducedBlockers: 0, resolvedBlockers: 0 } }),
    ]);
    expect(buildWhatChanged(journey).hasChanges).toBe(false);
  });

  it("recommends a single run review action for first review", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: null, status: "analysis_failed" } }),
    ]);
    const action = buildRecommendedAction(journey, null);
    expect(action.type).toBe("run_review");
    expect(action.titleKey).toBe("recommendedAction.runFirstReview");
  });

  it("recommends maintain readiness when ready to ship", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 90, status: "ready_to_ship", blockersCount: 0 } }),
      record(1, { verdict: { score: 92, status: "ready_to_ship", blockersCount: 0 } }),
    ]);
    const action = buildRecommendedAction(journey, baseVerdict({ status: "ready_to_ship" }));
    expect(action.type).toBe("maintain");
    expect(action.titleKey).toBe("recommendedAction.maintainReadiness");
  });

  it("recommends top priority fix when available", () => {
    const verdict = baseVerdict({
      topPriorities: [
        {
          id: "p1",
          rank: 1,
          title: "Protect admin endpoint",
          category: "Authorization",
          reason: "r",
          severity: "critical",
          confidence: "high",
          estimatedMinutes: 9,
          estimatedTimeLabel: "9m",
          projectedScoreImpact: 8,
          affectedFiles: [],
          recommendedAction: "Add auth",
          findingIds: [],
        },
      ],
    });
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 55 } }),
      record(1, { verdict: { score: 62, scoreDelta: 7 } }),
    ]);
    const action = buildRecommendedAction(journey, verdict);
    expect(action.type).toBe("fix_blocker");
    expect(action.priorityTitle).toBe("Protect admin endpoint");
    expect(action.estimatedMinutes).toBe(9);
  });

  it("builds weekly review periods from journey", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 40, scoreDelta: null, status: "not_ready" } }),
      record(10, { verdict: { score: 57, scoreDelta: 17, resolvedBlockers: 3 }, resolvedBlockers: 3 }),
    ]);
    const weekly = buildWeeklyReview(journey);
    expect(weekly.period7d.blockersResolved).toBeGreaterThanOrEqual(0);
    expect(weekly.currentFocusKey).toBeDefined();
  });

  it("builds deterministic insights", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 35, status: "not_ready" } }),
      record(1, { verdict: { score: 45, scoreDelta: 10, status: "not_ready" } }),
      record(2, { verdict: { score: 58, scoreDelta: 13, status: "needs_improvement" } }),
      record(3, { verdict: { score: 72, scoreDelta: 14, status: "almost_ready" } }),
    ]);
    const insights = buildProductionInsights(journey);
    expect(insights.some((i) => i.messageKey === "insights.improvingLastThree")).toBe(true);
  });

  it("maps production momentum from journey trend", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 35, status: "not_ready" } }),
      record(1, { verdict: { score: 45, scoreDelta: 10, status: "not_ready" } }),
      record(2, { verdict: { score: 58, scoreDelta: 13, status: "needs_improvement" } }),
      record(3, { verdict: { score: 72, scoreDelta: 14, status: "almost_ready" } }),
    ]);
    const intelligence = buildProductionIntelligence({ journey, verdict: null });
    expect(intelligence.momentum).toBe("improving");
    expect(intelligence.momentumExplanationKey).toBe("momentum.explanationImproving");
  });

  it("sets ready to ship empty state", () => {
    const journey = buildProductionJourney([
      record(0, { verdict: { score: 91, status: "ready_to_ship", blockersCount: 0 } }),
    ]);
    const intelligence = buildProductionIntelligence({
      journey,
      verdict: baseVerdict({ status: "ready_to_ship", score: 91 }),
    });
    expect(intelligence.emptyState).toBe("ready_to_ship");
  });

  it("loads productionIntelligence namespace in EN and ES", async () => {
    const { loadNamespace } = await import("@/lib/i18n/load-messages");
    const en = loadNamespace("en", "productionIntelligence");
    const es = loadNamespace("es", "productionIntelligence");
    expect(en.panelTitle).toBe("Recommendations");
    expect((es.momentum as Record<string, string>).improving).toBe("Mejorando");
    expect((en.whatChanged as Record<string, string>).scoreIncreased).toContain("{points}");
  });
});
