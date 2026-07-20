import { describe, expect, it } from "vitest";
import { resolveWorkspaceGitHubToken } from "@/server/github/workspace-connection-service";

type Row = Record<string, unknown>;

function createAdmin(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const rows = tables[table] ?? [];
      let filters: Array<{ col: string; value: unknown }> = [];

      const builder = {
        select() {
          return builder;
        },
        eq(col: string, value: unknown) {
          filters.push({ col, value });
          return builder;
        },
        maybeSingle: async () => {
          const match = rows.find((row) =>
            filters.every((filter) => row[filter.col] === filter.value)
          );
          return { data: match ?? null, error: null };
        },
      };

      return builder;
    },
  };
}

describe("resolveWorkspaceGitHubToken", () => {
  it("returns the Workspace connection token for the requested organization", async () => {
    const admin = createAdmin({
      workspace_github_connections: [
        {
          id: "conn-a",
          organization_id: "org-a",
          connected_by_user_id: "user-a",
          access_token: "token-a",
          status: "active",
        },
      ],
    });

    const resolved = await resolveWorkspaceGitHubToken(admin as never, "org-a");
    expect(resolved).toEqual({
      token: "token-a",
      userId: "user-a",
      connectionId: "conn-a",
    });
  });

  it("uses the project-linked connection when it belongs to the same Workspace", async () => {
    const admin = createAdmin({
      projects: [
        {
          id: "project-a",
          organization_id: "org-a",
          github_connection_id: "conn-a",
          connected_by_user_id: "user-a",
        },
      ],
      workspace_github_connections: [
        {
          id: "conn-a",
          organization_id: "org-a",
          connected_by_user_id: "user-a",
          access_token: "token-a",
          status: "active",
        },
      ],
    });

    const resolved = await resolveWorkspaceGitHubToken(admin as never, "org-a", "project-a");
    expect(resolved?.connectionId).toBe("conn-a");
  });

  it("denies cross-Workspace token access when the project belongs elsewhere", async () => {
    const admin = createAdmin({
      projects: [
        {
          id: "project-b",
          organization_id: "org-b",
          github_connection_id: "conn-b",
          connected_by_user_id: "user-b",
        },
      ],
      workspace_github_connections: [
        {
          id: "conn-a",
          organization_id: "org-a",
          connected_by_user_id: "user-a",
          access_token: "token-a",
          status: "active",
        },
      ],
    });

    const resolved = await resolveWorkspaceGitHubToken(admin as never, "org-a", "project-b");
    expect(resolved).toBeNull();
  });

  it("does not return revoked or inactive connections", async () => {
    const admin = createAdmin({
      workspace_github_connections: [
        {
          id: "conn-a",
          organization_id: "org-a",
          connected_by_user_id: "user-a",
          access_token: "token-a",
          status: "revoked",
        },
      ],
    });

    const resolved = await resolveWorkspaceGitHubToken(admin as never, "org-a");
    expect(resolved).toBeNull();
  });
});
