import { describe, expect, it } from "vitest";
import { resolveOrganizationRedirect } from "@/lib/onboarding/organization-redirect";
import { REVIEW_STAGE_KEYS, resolveReviewStageIndex } from "@/lib/onboarding/review-stages";

describe("organization onboarding helpers", () => {
  it("builds redirect to github by default", () => {
    expect(resolveOrganizationRedirect()).toBe("/onboarding?step=github");
  });

  it("supports custom next onboarding step", () => {
    expect(resolveOrganizationRedirect("repository")).toBe("/onboarding?step=repository");
  });
});

describe("review stage resolution", () => {
  it("starts at repository connection for queued scans", () => {
    expect(resolveReviewStageIndex("QUEUED", 0)).toEqual({ activeIndex: 0, completedThrough: -1 });
  });

  it("advances through scanning using progress bands", () => {
    const early = resolveReviewStageIndex("SCANNING", 20);
    const late = resolveReviewStageIndex("SCANNING", 80);
    expect(late.activeIndex).toBeGreaterThan(early.activeIndex);
  });

  it("marks all stages complete when scan is completed", () => {
    const state = resolveReviewStageIndex("completed", 100);
    expect(state.completedThrough).toBe(REVIEW_STAGE_KEYS.length - 1);
  });

  it("shows building verdict during score calculation", () => {
    expect(resolveReviewStageIndex("CALCULATING_SCORE", 95).activeIndex).toBe(8);
  });
});
