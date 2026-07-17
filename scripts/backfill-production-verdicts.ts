#!/usr/bin/env npx tsx
/**
 * Block 6.2 — Backfill Production Verdicts for historical completed scans.
 *
 * Usage:
 *   npx tsx scripts/backfill-production-verdicts.ts --dry-run
 *   npx tsx scripts/backfill-production-verdicts.ts --limit 50
 *   npx tsx scripts/backfill-production-verdicts.ts --organization-id <uuid>
 *   npx tsx scripts/backfill-production-verdicts.ts --project-id <uuid>
 *
 * Idempotent: skips scans that already have a production_verdict row.
 * Does not invoke AI — uses deterministic engine summary only.
 */

import { generateAndPersistProductionVerdict } from "../server/production-verdict/core";
import { assertNodeVersion, createAdminScriptClient } from "./lib/supabase-admin";

function parseArgs(argv: string[]) {
  const args = {
    dryRun: argv.includes("--dry-run"),
    limit: 100,
    organizationId: undefined as string | undefined,
    projectId: undefined as string | undefined,
  };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--limit" && argv[i + 1]) args.limit = Number(argv[++i]);
    if (argv[i] === "--organization-id" && argv[i + 1]) args.organizationId = argv[++i];
    if (argv[i] === "--project-id" && argv[i + 1]) args.projectId = argv[++i];
  }

  return args;
}

async function main() {
  assertNodeVersion();
  const args = parseArgs(process.argv.slice(2));
  const admin = createAdminScriptClient();

  let query = admin
    .from("scans")
    .select("id, project_id, organization_id, status, completed_at")
    .eq("status", "completed")
    .order("completed_at", { ascending: true })
    .limit(args.limit);

  if (args.organizationId) query = query.eq("organization_id", args.organizationId);
  if (args.projectId) query = query.eq("project_id", args.projectId);

  const { data: scans, error } = await query;
  if (error) {
    if (error.message.includes("production_verdicts")) {
      console.error("Migration 010 not applied. Run database/migrations/010_production_verdicts.sql first.");
      process.exit(1);
    }
    throw error;
  }

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const scan of scans ?? []) {
    const { data: existing } = await admin
      .from("production_verdicts")
      .select("id")
      .eq("scan_id", scan.id)
      .maybeSingle();

    if (existing) {
      skipped++;
      console.info({ event: "backfill_skipped", scanId: scan.id, reason: "verdict_exists" });
      continue;
    }

    if (args.dryRun) {
      processed++;
      console.info({ event: "backfill_dry_run", scanId: scan.id, projectId: scan.project_id });
      continue;
    }

    try {
      await generateAndPersistProductionVerdict(admin, {
        organizationId: scan.organization_id,
        projectId: scan.project_id,
        scanId: scan.id,
      });
      processed++;
      console.info({ event: "backfill_processed", scanId: scan.id, projectId: scan.project_id });
    } catch (err) {
      failed++;
      console.error({
        event: "backfill_failed",
        scanId: scan.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  console.info({
    event: "backfill_complete",
    dryRun: args.dryRun,
    processed,
    skipped,
    failed,
    total: scans?.length ?? 0,
  });

  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
