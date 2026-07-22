import { describe, expect, it } from "vitest";
import { onboardingResumePath } from "@/lib/onboarding/resume-path";

describe("audit remediation helpers", () => {
  it("routes users with a project but no verdict back into review", () => {
    expect(
      onboardingResumePath({
        hasProjects: true,
        firstProjectId: "project-1",
        githubConnected: true,
      })
    ).toBe("/onboarding?step=review&projectId=project-1");
  });

  it("routes users with GitHub but no project to repository selection", () => {
    expect(
      onboardingResumePath({
        hasProjects: false,
        githubConnected: true,
      })
    ).toBe("/onboarding?step=repository");
  });

  it("routes users without GitHub to the GitHub step", () => {
    expect(
      onboardingResumePath({
        hasProjects: false,
        githubConnected: false,
      })
    ).toBe("/onboarding?step=github");
  });
});
