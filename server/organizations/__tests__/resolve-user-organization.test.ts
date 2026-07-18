import { describe, expect, it } from "vitest";
import { pickPrimaryOrganizationId } from "@/server/organizations/resolve-user-organization";

describe("pickPrimaryOrganizationId", () => {
  it("returns null when there are no memberships", () => {
    expect(pickPrimaryOrganizationId([])).toBeNull();
  });

  it("returns the only membership", () => {
    expect(
      pickPrimaryOrganizationId([
        {
          organization_id: "org-1",
          role: "OWNER",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    ).toBe("org-1");
  });

  it("prefers the newest owned organization when multiple exist", () => {
    expect(
      pickPrimaryOrganizationId([
        {
          organization_id: "org-old",
          role: "OWNER",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          organization_id: "org-new",
          role: "OWNER",
          created_at: "2026-07-01T00:00:00.000Z",
        },
      ])
    ).toBe("org-new");
  });

  it("prefers owner membership over member membership", () => {
    expect(
      pickPrimaryOrganizationId([
        {
          organization_id: "org-member",
          role: "MEMBER",
          created_at: "2026-07-01T00:00:00.000Z",
        },
        {
          organization_id: "org-owner",
          role: "OWNER",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ])
    ).toBe("org-owner");
  });
});
