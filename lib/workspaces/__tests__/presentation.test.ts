import { describe, expect, it } from "vitest";
import {
  formatWorkspacePlan,
  getWorkspaceAccentColor,
  getWorkspaceInitials,
  partitionWorkspaces,
} from "@/lib/workspaces/presentation";

describe("workspace presentation", () => {
  it("generates one- and two-character initials deterministically", () => {
    expect(getWorkspaceInitials("SequrAI")).toBe("SE");
    expect(getWorkspaceInitials("DesparaFit")).toBe("DE");
    expect(getWorkspaceInitials("Auto Base")).toBe("AB");
    expect(getWorkspaceInitials("A")).toBe("A");
  });

  it("uses stable accent colors for the same workspace name", () => {
    expect(getWorkspaceAccentColor("SequrAI")).toBe(getWorkspaceAccentColor("SequrAI"));
    expect(getWorkspaceAccentColor("SequrAI")).not.toBe(getWorkspaceAccentColor("DesparaFit"));
  });

  it("formats only real non-free plans", () => {
    expect(formatWorkspacePlan("FREE")).toBeNull();
    expect(formatWorkspacePlan("BUILDER")).toBe("Builder");
    expect(formatWorkspacePlan(null)).toBeNull();
  });

  it("partitions active and other workspaces", () => {
    const workspaces = [
      { id: "a", name: "Alpha", plan: null, logoUrl: null },
      { id: "b", name: "Beta", plan: null, logoUrl: null },
    ];
    const { active, others } = partitionWorkspaces(workspaces, "b");
    expect(active?.id).toBe("b");
    expect(others.map((workspace) => workspace.id)).toEqual(["a"]);
  });

  it("handles long workspace names without breaking partition logic", () => {
    const longName = "A very long workspace name for a client demo project";
    const workspaces = [{ id: "1", name: longName, plan: null, logoUrl: null }];
    const { active, others } = partitionWorkspaces(workspaces, "1");
    expect(active?.name).toBe(longName);
    expect(others).toHaveLength(0);
  });
});
