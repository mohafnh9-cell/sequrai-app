import "server-only";

import { createAdminClient as createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ScanRequestError } from "@/server/security-scanner/request-context";
import type { SupabaseClient } from "@supabase/supabase-js";

export function createAdminClient(): SupabaseClient {
  try {
    return createSupabaseAdminClient();
  } catch {
    throw new ScanRequestError(
      503,
      "SCAN_SERVICE_MISCONFIGURED",
      "Scan service is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel."
    );
  }
}

export function mapDatabaseError(error: { code?: string; message?: string }, action: string) {
  const code = error.code ?? "";
  const message = error.message ?? action;

  if (code === "PGRST204" || code === "42703" || code === "42P01") {
    throw new ScanRequestError(
      503,
      "SCAN_SCHEMA_OUTDATED",
      "Scan database schema is outdated. Run migrations 002 and 004 in Supabase SQL Editor."
    );
  }

  if (code === "23503") {
    throw new ScanRequestError(
      500,
      "PROFILE_REQUIRED",
      "Your user profile is missing. Sign out, sign in again, then retry the scan."
    );
  }

  throw new Error(`${action}: ${message}`);
}
