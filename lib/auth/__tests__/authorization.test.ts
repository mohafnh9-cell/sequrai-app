import { describe, expect, it } from "vitest";
import { canAccessRepository } from "@/server/security-scanner/authorization";

describe("cross-tenant repository authorization", () => {
  it("denies access when membership belongs to another organization", () => {
    expect(
      canAccessRepository({
        authenticatedUserId: "user-a",
        projectOrganizationId: "org-a",
        membership: { user_id: "user-a", organization_id: "org-b" },
      })
    ).toBe(false);
  });

  it("denies access when user is not a member", () => {
    expect(
      canAccessRepository({
        authenticatedUserId: "user-a",
        projectOrganizationId: "org-a",
        membership: null,
      })
    ).toBe(false);
  });

  it("allows access for matching org membership", () => {
    expect(
      canAccessRepository({
        authenticatedUserId: "user-a",
        projectOrganizationId: "org-a",
        membership: { user_id: "user-a", organization_id: "org-a" },
      })
    ).toBe(true);
  });
});

describe("MCP org scope", () => {
  it("requires project organization to match MCP key organization", async () => {
    const { assertProjectInOrg, McpError } = await import("@/server/mcp/auth");

    const admin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      }),
    };

    await expect(
      assertProjectInOrg(admin as never, "org-a", "project-1")
    ).rejects.toBeInstanceOf(McpError);
  });
});
