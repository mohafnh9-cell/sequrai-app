import { describe, expect, it } from "vitest";
import {
  calculateRepositoryHealth,
  extractCriticalPaths,
  isCriticalPath,
  securityCheckStatus,
} from "../health";

describe("isCriticalPath", () => {
  it("detects critical configuration files", () => {
    expect(isCriticalPath("package.json")).toBe(true);
    expect(isCriticalPath("src/middleware.ts")).toBe(true);
    expect(isCriticalPath("README.md")).toBe(false);
  });
});

describe("extractCriticalPaths", () => {
  it("filters critical paths", () => {
    expect(extractCriticalPaths(["package.json", "index.ts"])).toEqual(["package.json"]);
  });
});

describe("calculateRepositoryHealth", () => {
  it("marks critical repos", () => {
    const result = calculateRepositoryHealth({
      securityScore: 30,
      riskScore: 90,
      openFindings: 40,
      criticalOpen: 2,
      scoreTrend: -10,
    });
    expect(result.status).toBe("critical");
  });

  it("marks excellent repos", () => {
    const result = calculateRepositoryHealth({
      securityScore: 92,
      riskScore: 15,
      openFindings: 2,
      criticalOpen: 0,
      scoreTrend: 5,
    });
    expect(result.status).toBe("excellent");
  });
});

describe("securityCheckStatus", () => {
  it("fails on critical findings", () => {
    expect(securityCheckStatus({ securityScore: 95, criticalCount: 1, highCount: 0 })).toBe(
      "failed"
    );
  });

  it("passes clean repos", () => {
    expect(securityCheckStatus({ securityScore: 85, criticalCount: 0, highCount: 0 })).toBe(
      "passed"
    );
  });
});
