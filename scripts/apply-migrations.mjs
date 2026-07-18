#!/usr/bin/env node
/**
 * Apply numbered SQL migrations via DATABASE_URL or DIRECT_URL.
 * Usage: node scripts/apply-migrations.mjs 010 011 012 013 014 015
 */
import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: true });

const { Client } = pg;
const databaseUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL or DIRECT_URL");
  process.exit(1);
}

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error("Usage: node scripts/apply-migrations.mjs 010 011 ...");
  process.exit(1);
}

function migrationPath(id) {
  const files = readdirSync(resolve(process.cwd(), "database/migrations"));
  const match = files.find((name) => name.startsWith(`${id}_`) && name.endsWith(".sql"));
  if (!match) throw new Error(`Migration ${id} not found`);
  return resolve(process.cwd(), "database/migrations", match);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log("Connected to database\n");

  for (const id of ids) {
    const path = migrationPath(id);
    const sql = readFileSync(path, "utf8");
    console.log(`Applying ${path.split("/").pop()}...`);
    await client.query(sql);
    console.log(`  OK\n`);
  }

  console.log("All migrations applied.");
} catch (error) {
  console.error("\nMigration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
} finally {
  await client.end();
}
