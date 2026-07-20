import { describe, expect, it } from "vitest";
import {
  firstNameFromUser,
  greetingKeyForHour,
  pickPrimaryDashboardFocus,
} from "@/lib/dashboard/pick-primary-project";
import type { ProjectBrainSummary } from "@/brain";

describe("pickPrimaryDashboardFocus", () => {
  const projects: ProjectBrainSummary[] = [
    {
      projectId: "a",
      projectName: "Alpha",
      productionReady: 80,
      scoreDelta: null,
      projectedScore: null,
      blockersCount: 0,
      healthStatus: null,
      status: "ready_to_ship",
      lastReviewedCommit: null,
      generatedAt: null,
    },
    {
      projectId: "b",
      projectName: "Beta",
      productionReady: 40,
      scoreDelta: null,
      projectedScore: null,
      blockersCount: 2,
      healthStatus: null,
      status: "not_ready",
      lastReviewedCommit: null,
      generatedAt: null,
    },
  ];

  it("prioritizes the least ready project", () => {
    const focus = pickPrimaryDashboardFocus(projects, new Map());
    expect(focus?.primary.projectId).toBe("b");
    expect(focus?.orgCanDeploy).toBe(false);
  });

  it("marks org deployable when every project is ready", () => {
    const focus = pickPrimaryDashboardFocus([projects[0]], new Map());
    expect(focus?.orgCanDeploy).toBe(true);
  });
});

describe("greeting helpers", () => {
  it("picks morning greeting before noon", () => {
    expect(greetingKeyForHour(9)).toBe("greetingMorning");
  });

  it("extracts first name from profile", () => {
    expect(firstNameFromUser({ fullName: "Mohamed Fornah", email: "m@x.com" })).toBe("Mohamed");
  });
});
