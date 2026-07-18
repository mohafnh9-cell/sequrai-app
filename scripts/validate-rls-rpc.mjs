#!/usr/bin/env node
/**
 * Validate RLS policies and create_organization_with_owner RPC after migration 015.
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: true });

const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Missing DATABASE_URL or DIRECT_URL");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const failures = [];

try {
  await client.connect();
  console.log("SequrAI RLS + RPC validation\n");

  const { rows: permissivePolicies } = await client.query(`
    select polname
    from pg_policy
    where polrelid = 'public.organization_members'::regclass
      and polname = 'Users can create org memberships'
  `);
  if (permissivePolicies.length > 0) {
    failures.push('Permissive policy still exists: "Users can create org memberships"');
    console.log("FAIL policy: Users can create org memberships (should be removed)");
  } else {
    console.log("OK policy removed: Users can create org memberships");
  }

  const { rows: orgPolicies } = await client.query(`
    select polname, polcmd::text as cmd
    from pg_policy
    where polrelid = 'public.organization_members'::regclass
    order by polname
  `);
  console.log("\norganization_members policies:");
  for (const row of orgPolicies) {
    console.log(`  - ${row.polname} (${row.cmd})`);
  }

  const expectedMembershipPolicies = new Set([
    "Members can view org memberships",
    "Owners and admins can update member roles",
    "Owners and admins can remove members",
  ]);
  const actualNames = new Set(orgPolicies.map((r) => r.polname));
  for (const name of expectedMembershipPolicies) {
    if (!actualNames.has(name)) {
      failures.push(`Missing expected policy: ${name}`);
      console.log(`FAIL missing policy: ${name}`);
    }
  }

  const { rows: insertPolicies } = await client.query(`
    select polname
    from pg_policy
    where polrelid = 'public.organization_members'::regclass
      and polcmd = 'a'
  `);
  if (insertPolicies.length > 0) {
    failures.push("Client INSERT policy exists on organization_members");
    console.log("FAIL client INSERT policies on organization_members:", insertPolicies.map((r) => r.polname));
  } else {
    console.log("OK no client INSERT policy on organization_members");
  }

  const { rows: rpcRows } = await client.query(`
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as args,
           p.prosecdef as security_definer
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_organization_with_owner'
  `);
  if (rpcRows.length === 0) {
    failures.push("RPC create_organization_with_owner not found");
    console.log("FAIL RPC: create_organization_with_owner");
  } else {
    const rpc = rpcRows[0];
    console.log(`OK RPC: create_organization_with_owner(${rpc.args}) security_definer=${rpc.security_definer}`);
    if (!rpc.security_definer) {
      failures.push("create_organization_with_owner is not SECURITY DEFINER");
    }
  }

  if (failures.length > 0) {
    console.error("\nRLS/RPC validation FAILED:");
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }

  console.log("\nRLS/RPC validation passed.");
} catch (error) {
  console.error("Validation error:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
