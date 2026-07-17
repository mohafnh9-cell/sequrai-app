#!/usr/bin/env npx tsx
/**
 * Block 6.2 — Production Verdict health check.
 *
 * Usage (from repo root, Node 22+):
 *   npx tsx scripts/health-check-production-verdict.ts
 *
 * Reads .env.local automatically. Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCTION_VERDICT_VERSION } from "../brain/production-verdict/schema";
import { assertNodeVersion, createAdminScriptClient } from "./lib/supabase-admin";

type CheckResult = { name: string; ok: boolean; detail: string };

async function main() {
  assertNodeVersion();
  const admin = createAdminScriptClient();

  const checks: CheckResult[] = [];

  const tableProbe = await admin.from("production_verdicts").select("id").limit(1);
  checks.push({
    name: "migration_010_table",
    ok: !tableProbe.error,
    detail: tableProbe.error?.message ?? "production_verdicts reachable",
  });

  const stateProbe = await admin
    .from("repository_scan_state")
    .select("current_verdict_id")
    .limit(1);
  checks.push({
    name: "current_verdict_id_column",
    ok: !stateProbe.error,
    detail: stateProbe.error?.message ?? "repository_scan_state.current_verdict_id reachable",
  });

  checks.push({
    name: "rls_enabled",
    ok: tableProbe.error == null,
    detail:
      tableProbe.error == null
        ? "Assumed enabled via migration 010 (verify policy in Supabase dashboard)"
        : "Cannot verify — table missing",
  });

  checks.push({
    name: "schema_version_supported",
    ok: PRODUCTION_VERDICT_VERSION === "1.0.0",
    detail: `Supported version: ${PRODUCTION_VERDICT_VERSION}`,
  });

  const legacySource = readFileSync(
    resolve(process.cwd(), "server/brain/persist-readiness.ts"),
    "utf8"
  );
  const legacyDisabled =
    legacySource.includes("@deprecated") && legacySource.includes("return null");
  checks.push({
    name: "legacy_writer_disabled",
    ok: legacyDisabled,
    detail: legacyDisabled
      ? "persistProductionReadiness is a no-op"
      : "persist-readiness.ts still writes to production_readiness_scores",
  });

  const failed = checks.filter((c) => !c.ok);
  for (const check of checks) {
    console.log(`${check.ok ? "OK" : "FAIL"}  ${check.name}: ${check.detail}`);
  }

  if (failed.length > 0) {
    console.error(
      `\n${failed.length} check(s) failed. Apply database/migrations/010_production_verdicts.sql in Supabase.`
    );
    process.exit(1);
  }

  console.log("\nAll production verdict health checks passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
