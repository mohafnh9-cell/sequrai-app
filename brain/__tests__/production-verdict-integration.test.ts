import { describe, expect, it } from "vitest";
import { generateProductionVerdict } from "@/brain/production-verdict/engine";
import { parseProductionVerdict, ProductionVerdictSchema } from "@/brain/production-verdict/schema";
import { toLegacyVerdict } from "@/brain/production-verdict/adapters/legacy";
import { formatMcpVerdictSummary } from "@/brain/production-verdict/adapters/format";

/**
 * Integration-style test (no database): scan findings → engine → schema → adapters
 */
describe("Production Verdict integration pipeline", () => {
  it("produces a valid v1 contract consumable by all adapters", () => {
    const findings = [
      {
        id: "finding-1",
        title: "Hardcoded Stripe secret key",
        severity: "critical",
        category: "secrets",
        rule_id: "exposed-credential",
        file_path: "src/lib/stripe.ts",
        recommendation: "Move to environment variables and rotate the key.",
      },
      {
        id: "finding-2",
        title: "Admin API route without auth",
        severity: "high",
        category: "authorization",
        file_path: "src/app/api/admin/route.ts",
      },
      {
        id: "finding-3",
        title: "Missing rate limiting on login",
        severity: "high",
        category: "web",
        file_path: "src/app/api/auth/login/route.ts",
      },
    ];

    const { verdict } = generateProductionVerdict({
      projectId: "11111111-1111-4111-8111-111111111111",
      repositoryId: "11111111-1111-4111-8111-111111111111",
      scanId: "22222222-2222-4222-8222-222222222222",
      commitSha: "abc123",
      branch: "main",
      scanStatus: "completed",
      securityScore: 58,
      filesAnalyzed: 120,
      findings,
      previousScore: 66,
      previousBlockersCount: 1,
    });

    const parsed = parseProductionVerdict(verdict);
    expect(ProductionVerdictSchema.safeParse(parsed).success).toBe(true);
    expect(parsed.status).toBe("not_ready");
    expect(parsed.topPriorities.length).toBeGreaterThanOrEqual(1);
    expect(parsed.topPriorities.length).toBeLessThanOrEqual(3);
    expect(parsed.score).not.toBeNull();

    const legacy = toLegacyVerdict(parsed);
    expect(legacy.v1.scanId).toBe(parsed.scanId);
    expect(legacy.priorities.length).toBeGreaterThanOrEqual(1);

    const mcpSummary = formatMcpVerdictSummary(parsed);
    expect(mcpSummary).toContain("Fastest path forward");
    expect(mcpSummary).toContain("Recommended action");
  });
});
