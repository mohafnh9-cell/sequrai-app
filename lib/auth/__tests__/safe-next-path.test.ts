import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/auth/safe-next-path";

describe("safeNextPath", () => {
  it("defaults new users to onboarding instead of dashboard", () => {
    expect(safeNextPath(null)).toBe("/onboarding");
    expect(safeNextPath(undefined)).toBe("/onboarding");
    expect(safeNextPath("")).toBe("/onboarding");
  });

  it("preserves explicit safe paths", () => {
    expect(safeNextPath("/projects/abc")).toBe("/projects/abc");
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
  });
});
