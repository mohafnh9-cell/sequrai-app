import { describe, expect, it } from "vitest";
import {
  buildProductionRoadmap,
  getProductionLevel,
  getProjectProductionStatus,
  getHeroHeadline,
  isSeniorEngineerApproved,
  PROJECT_STATUS_LABELS,
} from "@/brain";

describe("production levels", () => {
  it("returns Senior Engineer Approved level at 90+", () => {
    const level = getProductionLevel(92);
    expect(level?.name).toBe("Senior Engineer Approved");
    expect(isSeniorEngineerApproved(92, 0)).toBe(true);
  });

  it("is not senior approved with blockers", () => {
    expect(isSeniorEngineerApproved(95, 2)).toBe(false);
  });
});

describe("project production status", () => {
  it("returns not scanned when no score", () => {
    expect(getProjectProductionStatus({ score: null, blockersCount: 0 })).toBe("not_scanned");
  });

  it("returns ready for production at 85+ with no blockers", () => {
    expect(getProjectProductionStatus({ score: 88, blockersCount: 0 })).toBe(
      "ready_for_production"
    );
    expect(PROJECT_STATUS_LABELS.ready_for_production).toBe("Ready to Ship");
  });

  it("returns not ready for low scores", () => {
    expect(getProjectProductionStatus({ score: 10, blockersCount: 5 })).toBe("not_ready");
  });
});

describe("hero copy", () => {
  it("shows not ready headline when blockers exist", () => {
    expect(getHeroHeadline({ score: 34, blockersCount: 3 })).toBe(
      "YOUR APPLICATION IS NOT READY FOR PRODUCTION"
    );
  });

  it("shows ready headline at 90+", () => {
    expect(getHeroHeadline({ score: 96, blockersCount: 0 })).toBe(
      "YOUR APPLICATION IS READY FOR PRODUCTION"
    );
  });
});

describe("production roadmap", () => {
  it("builds roadmap with projected score", () => {
    const roadmap = buildProductionRoadmap({
      currentScore: 34,
      priorities: [
        { rank: 1, title: "Configure Authentication", description: "Add auth", source: "ai" },
        { rank: 2, title: "Configure CSP Headers", description: "Add headers", source: "ai" },
      ],
    });

    expect(roadmap.items).toHaveLength(2);
    expect(roadmap.projectedScore).toBeGreaterThan(34);
    expect(roadmap.totalMinutes).toBeGreaterThan(0);
  });
});
