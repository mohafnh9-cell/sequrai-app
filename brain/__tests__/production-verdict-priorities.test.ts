import { describe, expect, it } from "vitest";
import { estimateFixTime, applyFixTimeEstimates } from "@/brain/production-verdict/fix-time";
import { selectTopPriorities } from "@/brain/production-verdict/priorities";
import { normalizeFinding } from "@/brain/production-verdict/normalize-finding";

describe("fix time estimation", () => {
  it("returns range label for credential fixes", () => {
    const result = estimateFixTime({
      category: "data_protection",
      severity: "critical",
      affectedFiles: ["src/config.ts"],
      findingIds: ["f1"],
    });
    expect(result.label).toBe("2–5 min");
    expect(result.minutes).toBeGreaterThan(0);
  });

  it("requires manual review for complex auth migrations", () => {
    const priorities = applyFixTimeEstimates(
      selectTopPriorities([
        normalizeFinding({
          id: "1",
          title: "Auth middleware missing",
          severity: "high",
          category: "authentication",
          file_path: "a.ts",
        }),
        normalizeFinding({
          id: "2",
          title: "Session invalidation gap",
          severity: "high",
          category: "authentication",
          file_path: "b.ts",
        }),
        normalizeFinding({
          id: "3",
          title: "JWT expiry too long",
          severity: "high",
          category: "authentication",
          file_path: "c.ts",
        }),
      ])
    );
    expect(priorities[0]?.estimatedTimeLabel).toMatch(/min|review/);
  });
});

describe("priority selection", () => {
  it("returns at most three priorities", () => {
    const findings = Array.from({ length: 10 }, (_, i) =>
      normalizeFinding({
        id: `f${i}`,
        title: `High issue ${i}`,
        severity: "high",
        category: "security",
      })
    );
    expect(selectTopPriorities(findings).length).toBeLessThanOrEqual(3);
  });
});
