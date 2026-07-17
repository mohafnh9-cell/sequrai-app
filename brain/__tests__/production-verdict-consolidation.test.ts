import { describe, expect, it } from "vitest";
import { generateProductionVerdict } from "@/brain/production-verdict/engine";
import {
  assertConsumerConsistency,
  dashboardAdapter,
  githubAdapter,
  mcpAdapter,
  projectAdapter,
  scanAdapter,
} from "@/brain/production-verdict/adapters/consistency";
import {
  heroScoreDisplay,
  heroViewFromVerdict,
} from "@/brain/production-verdict/hero-view";
import {
  EMPTY_PRODUCTION_READY,
  productionReadyFromVerdict,
} from "@/server/brain/verdict-view-model";
import { PRODUCTION_VERDICT_VERSION } from "@/brain/production-verdict/schema";

const baseInput = {
  projectId: "11111111-1111-4111-8111-111111111111",
  repositoryId: "11111111-1111-4111-8111-111111111111",
  scanId: "22222222-2222-4222-8222-222222222222",
  commitSha: "abc123",
  branch: "main",
  scanStatus: "completed" as const,
  securityScore: 72,
  filesAnalyzed: 120,
  filesDiscovered: 150,
  findings: [
    {
      id: "f1",
      title: "Missing rate limiting",
      severity: "high",
      category: "security",
      rule_id: "rate-limit",
      file_path: "src/api/route.ts",
      recommendation: "Add rate limiting",
      confidence: "high",
    },
  ],
  previousScore: 68,
  previousBlockersCount: 2,
};

describe("Block 6.2 consolidation", () => {
  it("contract adapters return consistent core fields", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    expect(assertConsumerConsistency(verdict)).toBe(true);

    const snapshot = dashboardAdapter(verdict);
    for (const adapter of [projectAdapter, scanAdapter, mcpAdapter, githubAdapter]) {
      const result = adapter(verdict);
      expect(result.status).toBe(snapshot.status);
      expect(result.score).toBe(snapshot.score);
      expect(result.scoreDelta).toBe(snapshot.scoreDelta);
      expect(result.blockersCount).toBe(snapshot.blockersCount);
      expect(result.priorityTitles).toEqual(snapshot.priorityTitles);
    }
  });

  it("productionReadyFromVerdict does not invent score when verdict has null score", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      filesAnalyzed: 0,
      filesDiscovered: 100,
      findings: [],
    });

    if (verdict.status === "insufficient_data") {
      expect(verdict.score).toBeNull();
      expect(productionReadyFromVerdict(verdict).overall).toBeNull();
    }
  });

  it("EMPTY_PRODUCTION_READY keeps null score (no fake zero)", () => {
    expect(EMPTY_PRODUCTION_READY.overall).toBeNull();
    expect(EMPTY_PRODUCTION_READY.blockersCount).toBe(0);
  });

  it("ProductionHero shows More Analysis Required for insufficient_data", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      filesAnalyzed: 0,
      filesDiscovered: 200,
      findings: [],
    });

    if (verdict.status !== "insufficient_data") return;

    const view = heroViewFromVerdict(verdict);
    expect(heroScoreDisplay(view)).toBe("—");
    expect(view.headline).toContain("MORE ANALYSIS");
  });

  it("ProductionHero surfaces analysis_failed copy", () => {
    const { verdict } = generateProductionVerdict({
      ...baseInput,
      scanStatus: "failed",
      partialScanFailure: true,
    });

    if (verdict.status !== "analysis_failed") return;

    const view = heroViewFromVerdict(verdict);
    expect(view.analysisError).toBeTruthy();
    expect(heroScoreDisplay(view)).toBe("—");
  });

  it("uses supported schema version", () => {
    const { verdict } = generateProductionVerdict(baseInput);
    expect(verdict.version).toBe(PRODUCTION_VERDICT_VERSION);
  });
});
