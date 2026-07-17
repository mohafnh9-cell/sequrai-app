import { describe, expect, it } from "vitest";
import {
  buildProductionVerdict,
  formatGithubCheckDescription,
  githubVerdictLabel,
} from "@/brain/production-verdict/build-verdict";

const PROJECT = "11111111-1111-4111-8111-111111111111";
const SCAN = "22222222-2222-4222-8222-222222222222";

describe("Production Verdict legacy adapter", () => {
  it("returns NOT READY for very low score with blockers", () => {
    const verdict = buildProductionVerdict({
      projectId: PROJECT,
      repositoryId: PROJECT,
      scanId: SCAN,
      filesAnalyzed: 40,
      readinessInput: {
        securityScore: 20,
        severityCounts: { critical: 1, high: 2, medium: 1, low: 0, info: 0 },
        categoryCounts: { secrets: 1, authentication: 1 },
      },
      previousScore: 28,
      findings: [
        { title: "Revoke exposed credential", severity: "critical", category: "secrets" },
        { title: "Protect admin endpoint", severity: "high", category: "authorization" },
        { title: "Add rate limiting", severity: "high", category: "web" },
      ],
    });

    expect(verdict.headline).toBe("NOT READY TO SHIP");
    expect(verdict.blockersCount).toBe(3);
    expect(verdict.priorities).toHaveLength(3);
    expect(verdict.v1.status).toBe("not_ready");
  });

  it("returns NEEDS IMPROVEMENT for moderate score with blockers", () => {
    const verdict = buildProductionVerdict({
      projectId: PROJECT,
      repositoryId: PROJECT,
      scanId: SCAN,
      filesAnalyzed: 40,
      readinessInput: {
        securityScore: 64,
        severityCounts: { critical: 1, high: 2, medium: 1, low: 0, info: 0 },
        categoryCounts: { secrets: 1, authentication: 1 },
      },
      previousScore: 68,
      findings: [
        { title: "Revoke exposed credential", severity: "critical", category: "secrets", rule_id: "exposed-credential" },
        { title: "Protect admin endpoint", severity: "high", category: "authorization" },
        { title: "Add rate limiting", severity: "high", category: "web" },
      ],
    });

    expect(verdict.v1.status).toBe("not_ready");
    expect(verdict.blockersCount).toBe(3);
  });

  it("returns READY TO SHIP for high score without blockers", () => {
    const verdict = buildProductionVerdict({
      projectId: PROJECT,
      repositoryId: PROJECT,
      scanId: SCAN,
      filesAnalyzed: 50,
      readinessInput: {
        securityScore: 92,
        severityCounts: { critical: 0, high: 0, medium: 1, low: 1, info: 0 },
        categoryCounts: {},
      },
    });

    expect(verdict.headline).toBe("READY TO SHIP");
    expect(githubVerdictLabel(verdict.status)).toBe("SequrAI — Ready to Ship");
  });

  it("formats compact GitHub check descriptions", () => {
    const verdict = buildProductionVerdict({
      projectId: PROJECT,
      repositoryId: PROJECT,
      scanId: SCAN,
      filesAnalyzed: 40,
      readinessInput: {
        securityScore: 64,
        severityCounts: { critical: 0, high: 3, medium: 0, low: 0, info: 0 },
        categoryCounts: {},
      },
      previousScore: 70,
      findings: [
        { title: "A", severity: "high", category: "web" },
        { title: "B", severity: "high", category: "web" },
        { title: "C", severity: "high", category: "web" },
      ],
    });

    const description = formatGithubCheckDescription({ verdict });
    expect(description).toContain("SequrAI — Not Ready");
    expect(description).toContain("3 blockers");
    expect(description.length).toBeLessThanOrEqual(140);
  });

  it("marks architecture as partially evaluated in v1 contract", () => {
    const verdict = buildProductionVerdict({
      projectId: PROJECT,
      repositoryId: PROJECT,
      scanId: SCAN,
      filesAnalyzed: 30,
      readinessInput: {
        securityScore: 50,
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
        categoryCounts: {},
      },
    });

    const performance = verdict.v1.unevaluatedAreas.find(
      (a: { key: string }) => a.key === "performance"
    );
    expect(performance?.status).toBe("not_evaluated");
  });
});
