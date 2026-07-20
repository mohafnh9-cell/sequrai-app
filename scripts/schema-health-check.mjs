#!/usr/bin/env node
/**
 * Read-only Supabase schema health check for migrations 001–015.
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.
 */
import { createAdminScriptClient, assertNodeVersion } from "./lib/supabase-admin.mjs";

const REQUIRED_TABLES = [
  "profiles",
  "organizations",
  "organization_members",
  "projects",
  "scans",
  "production_verdicts",
  "repository_events",
  "repository_scan_state",
  "repository_sync_status",
  "user_github_tokens",
  "workspace_github_connections",
  "mcp_api_keys",
];

const REQUIRED_COLUMNS = [
  ["organizations", "verdict_autopilot_enabled"],
  ["scans", "review_type"],
];

const REQUIRED_FUNCTIONS = ["create_organization_with_owner"];

const REQUIRED_MIGRATION_MARKERS = [
  ["scans", "review_type"],
  ["organizations", "verdict_autopilot_enabled"],
  ["repository_sync_status", "connection_status"],
];

assertNodeVersion();

const admin = createAdminScriptClient();
const failures = [];

async function tableExists(table) {
  const { error } = await admin.from(table).select("*", { head: true, count: "exact" });
  return !error;
}

async function columnExists(table, column) {
  const { error } = await admin.from(table).select(column).limit(1);
  if (!error) return true;
  return false;
}

async function functionExists(name) {
  const { data, error } = await admin.rpc(name, {
    organization_name: "__schema_health_check__",
    organization_slug: "__schema_health_check__",
  });
  void data;
  if (!error) return true;
  const message = error.message ?? "";
  if (message.includes("Not authenticated")) return true;
  if (message.includes("Could not find the function")) return false;
  return true;
}

console.log("SequrAI schema health check\n");

for (const table of REQUIRED_TABLES) {
  const ok = await tableExists(table);
  console.log(`${ok ? "OK" : "MISSING"} table: ${table}`);
  if (!ok) failures.push(`Missing table: ${table}`);
}

for (const [table, column] of REQUIRED_COLUMNS) {
  const ok = await columnExists(table, column);
  console.log(`${ok ? "OK" : "MISSING"} column: ${table}.${column}`);
  if (!ok) failures.push(`Missing column: ${table}.${column}`);
}

for (const fn of REQUIRED_FUNCTIONS) {
  const ok = await functionExists(fn);
  console.log(`${ok ? "OK" : "MISSING"} function: ${fn}()`);
  if (!ok) failures.push(`Missing function: ${fn}`);
}

console.log("\nMigration markers (010–014):");
for (const [table, column] of REQUIRED_MIGRATION_MARKERS) {
  const ok = await columnExists(table, column);
  console.log(`  ${ok ? "OK" : "MISSING"} ${table}.${column}`);
  if (!ok) failures.push(`Migration marker missing: ${table}.${column}`);
}

if (failures.length > 0) {
  console.error("\nSchema health check FAILED:");
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error("\nApply migrations 001–015 in order. See database/migrations/README.md");
  process.exit(1);
}

console.log("\nSchema health check passed.");
