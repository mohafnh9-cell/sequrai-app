import { describe, expect, it } from "vitest";
import { calculateRiskScore } from "../risk-engine";
import type { ProjectSecurityContext } from "../types";

const baseContext: ProjectSecurityContext = {
  organizationId: "org",
  projectId: "project",
  projectName: "Demo",
  scanId: "scan",
  securityScore: 15,
  findingsCount: 86,
  severityCounts: { critical: 0, high: 4, medium: 32, low: 50, info: 0 },
  categoryCounts: { secrets: 2, configuration: 10 },
  stack: {
    languages: ["TypeScript"],
    frameworks: ["Next.js"],
    services: ["Supabase"],
    packageManagers: ["npm"],
  },
  findings: [],
  previousScores: [20, 30],
  recurringPatterns: ["missing rls"],
};

describe("calculateRiskScore", () => {
  it("returns higher risk than security score for exposed stacks", () => {
    const result = calculateRiskScore(baseContext);
    expect(result.riskScore).toBeGreaterThan(baseContext.securityScore);
    expect(["high", "very_high", "critical"]).toContain(result.priorityLevel);
  });
});
