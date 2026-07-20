import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("migration 019 workspace github connections", () => {
  const sql = readFileSync(
    resolve(process.cwd(), "database/migrations/019_workspace_github_connections.sql"),
    "utf8"
  );

  it("creates workspace-scoped connection table with one row per Workspace", () => {
    expect(sql).toContain("create table if not exists public.workspace_github_connections");
    expect(sql).toContain("unique (organization_id)");
  });

  it("links projects to github connections and prevents duplicate repo ownership per Workspace", () => {
    expect(sql).toContain("github_connection_id uuid");
    expect(sql).toContain("projects_org_github_repository_id_unique");
  });

  it("backfills only clear ownership cases with two deterministic insert paths", () => {
    expect(sql).toContain("Backfill A: user belongs to exactly one Workspace");
    expect(sql).toContain("Backfill B: multiple Workspaces but only one owns GitHub-linked projects");
    expect(sql.match(/insert into public\.workspace_github_connections/g)?.length).toBe(2);
  });

  it("enables member read and owner manage RLS policies", () => {
    expect(sql).toContain('"Members read workspace github connections"');
    expect(sql).toContain('"Owners manage workspace github connections"');
  });
});
