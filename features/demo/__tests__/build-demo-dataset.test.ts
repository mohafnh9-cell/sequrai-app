import { describe, expect, it } from "vitest";
import { buildDemoDataset } from "@/features/demo/fixtures/build-demo-dataset";
import { DEMO_SCENARIOS } from "@/features/demo/scenarios";

describe("buildDemoDataset", () => {
  it("builds all demo scenarios without production dependencies", () => {
    for (const scenario of DEMO_SCENARIOS) {
      const dataset = buildDemoDataset(scenario.id);
      expect(dataset.scenarioId).toBe(scenario.id);
      expect(dataset.orgName).toBeTruthy();
    }
  });

  it("returns no projects for the empty portfolio scenario", () => {
    const dataset = buildDemoDataset("no-projects");
    expect(dataset.projects).toHaveLength(0);
    expect(dataset.autopilotDashboard.monitoredCount).toBe(0);
  });

  it("marks ready to ship scenario as production ready", () => {
    const dataset = buildDemoDataset("ready-to-ship");
    expect(dataset.projects.length).toBeGreaterThan(0);
    expect(dataset.orgBrain.projects[0]?.status).toBe("ready_to_ship");
  });

  it("uses fictional github URLs only", () => {
    const dataset = buildDemoDataset("ready-to-ship");
    for (const project of dataset.projects) {
      if (project.github_repo) {
        expect(project.github_repo).toContain("demo-org");
      }
    }
  });
});
