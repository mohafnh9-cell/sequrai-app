import { describe, expect, it } from "vitest";
import enWorkspace from "@/messages/en/workspace.json";
import esWorkspace from "@/messages/es/workspace.json";

describe("workspace i18n copy", () => {
  it("includes required EN strings", () => {
    expect(enWorkspace.currentWorkspace).toBe("Current Workspace");
    expect(enWorkspace.createWorkspace).toBe("Create Workspace");
    expect(enWorkspace.switchFailed).toContain("previous Workspace remains active");
  });

  it("includes required ES strings", () => {
    expect(esWorkspace.currentWorkspace).toBe("Workspace actual");
    expect(esWorkspace.createWorkspace).toBe("Crear Workspace");
    expect(esWorkspace.switchFailed).toContain("Workspace anterior");
  });
});
