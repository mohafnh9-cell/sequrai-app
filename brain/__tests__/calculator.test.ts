import { describe, expect, it } from "vitest";
import { calculateProductionReadiness, estimateRiskFromScan } from "@/brain";

describe("calculateProductionReadiness", () => {
  it("returns null overall when no security score exists", () => {
    const result = calculateProductionReadiness({
      securityScore: null,
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      categoryCounts: {},
    });

    expect(result.overall).toBeNull();
    expect(result.readyForProduction).toBe(false);
  });

  it("marks app ready when score is high and no blockers", () => {
    const result = calculateProductionReadiness({
      securityScore: 92,
      severityCounts: { critical: 0, high: 0, medium: 1, low: 2, info: 0 },
      categoryCounts: {},
    });

    expect(result.overall).toBeGreaterThanOrEqual(85);
    expect(result.blockersCount).toBe(0);
    expect(result.readyForProduction).toBe(true);
  });

  it("penalizes critical and high severity as blockers", () => {
    const result = calculateProductionReadiness({
      securityScore: 80,
      severityCounts: { critical: 2, high: 1, medium: 0, low: 0, info: 0 },
      categoryCounts: { secrets: 2 },
    });

    expect(result.blockersCount).toBe(3);
    expect(result.readyForProduction).toBe(false);
    expect(result.overall).not.toBeNull();
    expect(result.overall!).toBeLessThan(85);
  });

  it("estimates minutes from priorities when provided", () => {
    const result = calculateProductionReadiness({
      securityScore: 75,
      severityCounts: { critical: 0, high: 1, medium: 2, low: 0, info: 0 },
      categoryCounts: {},
      estimatedMinutesFromPriorities: 45,
    });

    expect(result.estimatedMinutesToReady).toBe(45);
  });
});

describe("estimateRiskFromScan", () => {
  it("increases risk with critical findings and low security score", () => {
    const high = estimateRiskFromScan({
      securityScore: 30,
      severityCounts: { critical: 3, high: 2, medium: 0, low: 0, info: 0 },
      categoryCounts: { secrets: 2 },
      findingsCount: 5,
    });

    const low = estimateRiskFromScan({
      securityScore: 90,
      severityCounts: { critical: 0, high: 0, medium: 1, low: 1, info: 0 },
      categoryCounts: {},
      findingsCount: 2,
    });

    expect(high).toBeGreaterThan(low);
  });

  it("adds stack-specific risk for Supabase and Next.js", () => {
    const withStack = estimateRiskFromScan({
      securityScore: 70,
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      categoryCounts: {},
      findingsCount: 0,
      stack: { frameworks: ["Next.js"], services: ["Supabase"] },
    });

    const withoutStack = estimateRiskFromScan({
      securityScore: 70,
      severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
      categoryCounts: {},
      findingsCount: 0,
    });

    expect(withStack).toBeGreaterThan(withoutStack);
  });
});
