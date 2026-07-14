import { describe, expect, it } from "vitest";
import { canAccessRepository } from "../../../server/security-scanner/authorization";

describe("repository authorization", () => {
  it("allows only the authenticated member of the project's organization", () => {
    const membership = { user_id: "user-a", organization_id: "org-a" };
    expect(
      canAccessRepository({
        authenticatedUserId: "user-a",
        projectOrganizationId: "org-a",
        membership,
      })
    ).toBe(true);
    expect(
      canAccessRepository({
        authenticatedUserId: "user-b",
        projectOrganizationId: "org-a",
        membership,
      })
    ).toBe(false);
    expect(
      canAccessRepository({
        authenticatedUserId: "user-a",
        projectOrganizationId: "org-b",
        membership,
      })
    ).toBe(false);
  });
});
