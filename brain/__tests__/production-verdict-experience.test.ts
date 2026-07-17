import { describe, expect, it } from "vitest";
import { generateProductionVerdict } from "@/brain/production-verdict/engine";
import {
  buildDeltaNarrative,
  projectSummaryCopy,
  verdictExperienceFromVerdict,
} from "@/brain/production-verdict/experience-view";
import { heroViewFromVerdict, heroScoreDisplay } from "@/brain/production-verdict/hero-view";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const SCAN = "22222222-2222-4222-8222-222222222222";

const baseInput = {
  projectId: PROJECT,
  repositoryId: PROJECT,
  scanId: SCAN,
  commitSha: "abc123def456",
  branch: "main",
  scanStatus: "completed" as const,
  securityScore: 64,
  filesAnalyzed: 120,
  filesDiscovered: 150,
  findings: [
    {
      id: "f1",
      title: "Exposed credential",
      severity: "critical",
      category: "security",
      rule_id: "secret",
      file_path: "src/env.ts",
      recommendation: "Rotate and remove secret",
      confidence: "high",
    },
    {
      id: "f2",
      title: "Missing ownership check",
      severity: "high",
      category: "authorization",
      rule_id: "authz",
      file_path: "src/api/admin.ts",
      recommendation: "Add ownership validation",
      confidence: "high",
    },
  ],
  previousScore: 72,
  previousBlockersCount: 1,
};

describe("Block 6.3 Production Verdict Experience", () => {
  it("hero ready_to_ship shows score not dash", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      findings: [],
      securityScore: 92,
      previousScore: 90,
      previousBlockersCount: 0,
    });
    if (verdict.status !== "ready_to_ship") return;
    const view = verdictExperienceFromVerdict(verdict);
    expect(view.showReadyMoment).toBe(true);
    expect(heroScoreDisplay(heroViewFromVerdict(verdict))).not.toBe("—");
  });

  it("hero insufficient_data never shows 0/100", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      filesAnalyzed: 0,
      filesDiscovered: 200,
      findings: [],
    });
    if (verdict.status !== "insufficient_data") return;
    const view = verdictExperienceFromVerdict(verdict);
    expect(view.showScore).toBe(false);
    expect(heroScoreDisplay(heroViewFromVerdict(verdict))).toBe("—");
  });

  it("hero analysis_failed surfaces failure message", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      scanStatus: "failed",
      partialScanFailure: true,
    });
    if (verdict.status !== "analysis_failed") return;
    const view = verdictExperienceFromVerdict(verdict);
    expect(view.statusMessage).toContain("could not complete");
  });

  it("limits priorities to three in contract", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    expect(verdict.topPriorities.length).toBeLessThanOrEqual(3);
  });

  it("buildDeltaNarrative explains negative delta with blockers", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    const { narrative, direction } = buildDeltaNarrative(verdict);
    if (verdict.scoreDelta == null || verdict.scoreDelta >= 0) return;
    expect(direction).toBe("down");
    expect(narrative).toContain("reduced readiness");
  });

  it("buildDeltaNarrative explains positive delta", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      findings: [],
      securityScore: 90,
      previousScore: 70,
      previousBlockersCount: 3,
    });
    if (verdict.scoreDelta == null || verdict.scoreDelta <= 0) return;
    const { direction } = buildDeltaNarrative(verdict);
    expect(direction).toBe("up");
  });

  it("projected score improvement is derived from verdict only", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    const view = verdictExperienceFromVerdict(verdict);
    if (view.score == null || view.projectedScore == null) return;
    expect(view.scoreImprovement).toBe(view.projectedScore - view.score);
  });

  it("projectSummaryCopy uses null-safe language", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      filesAnalyzed: 0,
      filesDiscovered: 100,
      findings: [],
    });
    if (verdict.score !== null) return;
    expect(projectSummaryCopy(verdict)).toContain("production review");
  });

  it("AI fallback uses deterministic executiveSummary", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    expect(verdict.executiveSummary.length).toBeGreaterThan(10);
    const view = verdictExperienceFromVerdict(verdict);
    expect(view.executiveSummary).toBe(verdict.executiveSummary);
  });

  it("coverage areas available for breakdown", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    const total =
      verdict.evaluatedAreas.length +
      verdict.partiallyEvaluatedAreas.length +
      verdict.unevaluatedAreas.length;
    expect(total).toBeGreaterThan(0);
  });
});
