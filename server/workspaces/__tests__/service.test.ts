import { describe, expect, it } from "vitest";
import { pickPrimaryOrganizationId } from "@/server/organizations/resolve-user-organization";
import { resolveActiveWorkspaceId } from "@/server/workspaces/service";

describe("resolveActiveWorkspaceId", () => {
  const memberships = [
    {
      organization_id: "org-a",
      role: "OWNER",
      created_at: "2026-01-01T00:00:00.000Z",
    },
    {
      organization_id: "org-b",
      role: "MEMBER",
      created_at: "2026-07-01T00:00:00.000Z",
    },
  ];

  function createSupabase(membershipRows = memberships) {
    return {
      from(table: string) {
        if (table !== "organization_members") throw new Error(`unexpected table ${table}`);
        return {
          select() {
            return this;
          },
          eq(_column: string, _value: string) {
            return Promise.resolve({ data: membershipRows });
          },
        };
      },
    };
  }

  it("prefers profile preference when the user is a member", async () => {
    const supabase = createSupabase();
    const resolved = await resolveActiveWorkspaceId(
      supabase as never,
      "user-1",
      { profilePreferenceId: "org-b", cookieId: "org-a" }
    );
    expect(resolved).toBe("org-b");
  });

  it("falls back to cookie when profile preference is invalid", async () => {
    const supabase = createSupabase();
    const resolved = await resolveActiveWorkspaceId(
      supabase as never,
      "user-1",
      { profilePreferenceId: "missing", cookieId: "org-b" }
    );
    expect(resolved).toBe("org-b");
  });

  it("uses deterministic primary selection when no preference is valid", async () => {
    const supabase = createSupabase();
    const resolved = await resolveActiveWorkspaceId(supabase as never, "user-1", {});
    expect(resolved).toBe(pickPrimaryOrganizationId(memberships));
  });

  it("returns null when the user has no memberships", async () => {
    const supabase = createSupabase([]);
    const resolved = await resolveActiveWorkspaceId(supabase as never, "user-1", {});
    expect(resolved).toBeNull();
  });
});
