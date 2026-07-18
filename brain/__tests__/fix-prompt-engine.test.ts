import { describe, expect, it } from "vitest";
import {
  buildProductionFixPrompt,
  fixPromptInputFromFinding,
  fixPromptInputFromPriority,
  projectedVerdictAfterFix,
  stackFromDetectedStack,
} from "@/brain/fix-prompt";
import type { ProductionPriority } from "@/brain/production-verdict/schema";

const basePriority: ProductionPriority = {
  id: "p1",
  rank: 1,
  title: "Harden authentication and session handling",
  category: "authentication",
  reason: "Session tokens can be replayed without rotation after password reset.",
  severity: "critical",
  confidence: "high",
  estimatedMinutes: 45,
  estimatedTimeLabel: "~45 min",
  projectedScoreImpact: 18,
  affectedFiles: ["src/middleware.ts", "src/lib/auth/session.ts"],
  recommendedAction:
    "Rotate session tokens on password reset and enforce secure cookie flags.",
  findingIds: ["f1"],
};

describe("Production Fix Prompt Engine", () => {
  it("builds a complete senior-engineer prompt with all required sections", () => {
    const { prompt } = buildProductionFixPrompt({
      projectName: "Acme SaaS",
      issueTitle: basePriority.title,
      issueDescription: basePriority.reason,
      category: basePriority.category,
      severity: basePriority.severity,
      whyItMatters: basePriority.reason,
      affectedFiles: basePriority.affectedFiles,
      stack: {
        languages: ["TypeScript"],
        frameworks: ["Next.js", "React"],
        services: ["Supabase"],
      },
      recommendedAction: basePriority.recommendedAction,
      estimatedFixMinutes: 45,
      projectedScoreImpact: 18,
      currentVerdictStatus: "not_ready",
      currentScore: 42,
    });

    expect(prompt).toContain("PROJECT CONTEXT");
    expect(prompt).toContain("ISSUE DETECTED");
    expect(prompt).toContain("WHY THIS MATTERS");
    expect(prompt).toContain("GOAL");
    expect(prompt).toContain("FILES TO REVIEW");
    expect(prompt).toContain("PRESERVE THE FOLLOWING");
    expect(prompt).toContain("DO NOT MODIFY");
    expect(prompt).toContain("IMPLEMENTATION REQUIREMENTS");
    expect(prompt).toContain("REGRESSION TESTS");
    expect(prompt).toContain("VALIDATION");
    expect(prompt).toContain("EXPECTED RESULT");
    expect(prompt).toContain("Next.js");
    expect(prompt).toContain("Supabase");
    expect(prompt).toContain("npm run build");
    expect(prompt).toContain("smallest possible change");
  });

  it("derives prompt input from a production priority", () => {
    const input = fixPromptInputFromPriority(basePriority, {
      projectName: "Northwind API",
      stack: { languages: ["TypeScript"], frameworks: ["Next.js"], services: [] },
      currentVerdictStatus: "not_ready",
      currentScore: 50,
    });

    const { prompt } = buildProductionFixPrompt(input);
    expect(prompt).toContain("Northwind API");
    expect(prompt).toContain("src/middleware.ts");
    expect(prompt).toContain("Rotate session tokens");
  });

  it("derives prompt input from an individual finding", () => {
    const input = fixPromptInputFromFinding(
      {
        id: "f1",
        title: "Service role referenced in client bundle",
        description: "Admin client imported from a client component.",
        severity: "CRITICAL",
        category: "secrets",
        recommendation: "Move service role usage to server-only code.",
        file_path: "src/lib/supabase/admin-client.ts",
      },
      {
        stack: {
          languages: ["TypeScript"],
          frameworks: ["Next.js"],
          services: ["Supabase"],
        },
        currentVerdictStatus: "not_ready",
        currentScore: 30,
      }
    );

    const { prompt } = buildProductionFixPrompt(input);
    expect(prompt).toContain("Service role referenced in client bundle");
    expect(prompt).toContain("src/lib/supabase/admin-client.ts");
    expect(prompt).toContain("Server-only secrets");
  });

  it("detects enriched stack labels from detected_stack dependencies", () => {
    const stack = stackFromDetectedStack({
      languages: ["TypeScript"],
      frameworks: ["Next.js"],
      services: ["Supabase"],
      dependencies: {
        stripe: "^14.0.0",
        tailwindcss: "^3.4.0",
        "@clerk/nextjs": "^5.0.0",
      },
    });

    expect(stack.services).toContain("Stripe");
    expect(stack.frameworks).toContain("Tailwind CSS");
    expect(stack.services).toContain("Clerk");
  });

  it("projects verdict improvement after fix", () => {
    expect(
      projectedVerdictAfterFix({
        issueTitle: "x",
        issueDescription: "x",
        category: "security",
        severity: "high",
        whyItMatters: "x",
        affectedFiles: [],
        stack: { languages: [], frameworks: [], services: [] },
        recommendedAction: "x",
        currentVerdictStatus: "not_ready",
        currentScore: 70,
        projectedScoreImpact: 20,
      })
    ).toBe("Ready to Ship");
  });
});
