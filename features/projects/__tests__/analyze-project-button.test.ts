import { describe, expect, it } from "vitest";
import { scanIsActive, scanIsCompleted } from "@/features/onboarding/onboarding-flow";

describe("review button scan helpers", () => {
  it("treats queued and scanning states as active", () => {
    expect(scanIsActive("queued")).toBe(true);
    expect(scanIsActive("scanning")).toBe(true);
    expect(scanIsActive("completed")).toBe(false);
  });

  it("detects completed reviews", () => {
    expect(scanIsCompleted("completed")).toBe(true);
    expect(scanIsCompleted("failed")).toBe(false);
  });
});
