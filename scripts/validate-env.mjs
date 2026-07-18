#!/usr/bin/env node
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: true });

const production = process.argv.includes("--production");

function validate() {
  const errors = [];
  const warnings = [];

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  const productionRequired = [
    "NEXT_PUBLIC_APP_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "GITHUB_WEBHOOK_SECRET",
  ];

  for (const key of required) {
    if (!process.env[key]?.trim()) errors.push(`Missing ${key}`);
  }

  if (production) {
    for (const key of productionRequired) {
      if (!process.env[key]?.trim()) errors.push(`Missing ${key} (required in production)`);
    }
  }

  const bypass = process.env.SEQURAI_BYPASS_AUTH?.trim().toLowerCase();
  if ((production || process.env.NODE_ENV === "production") && ["true", "1", "yes"].includes(bypass ?? "")) {
    errors.push("SEQURAI_BYPASS_AUTH must not be enabled in production");
  }

  if (production && !process.env.GITHUB_TOKEN_ENCRYPTION_KEY) {
    warnings.push("GITHUB_TOKEN_ENCRYPTION_KEY not set — GitHub tokens stored without encryption at rest");
  }

  return { errors, warnings };
}

const { errors, warnings } = validate();

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (errors.length > 0) {
  console.error("Environment validation failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Environment validation passed${production ? " (production mode)" : ""}.`);
