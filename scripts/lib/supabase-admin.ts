import { config } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Override stale shell exports (e.g. placeholder values from copy-paste).
config({ path: resolve(process.cwd(), ".env.local"), override: true });
config({ path: resolve(process.cwd(), ".env"), override: true });

export function assertNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 22) {
    throw new Error(
      `Node.js 22+ is required (current: ${process.versions.node}).\n` +
        "Install with: nvm install 22 && nvm use 22\n" +
        "Or with Homebrew: brew install node@22"
    );
  }
}

function readSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url?.includes("tu-proyecto")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is still a placeholder.\n" +
        "Run: unset NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY\n" +
        "Then re-run the script (it reads .env.local automatically)."
    );
  }
  if (key?.includes("tu_service_role")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is still a placeholder.\n" +
        "Run: unset NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY\n" +
        "Then re-run the script (it reads .env.local automatically)."
    );
  }
  if (!url) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL in .env.local.\n" +
        "Add it from Supabase → Project Settings → API → Project URL."
    );
  }
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local.\n" +
        "Add it from Supabase → Project Settings → API → service_role key."
    );
  }

  return { url, key };
}

export function createAdminScriptClient(): SupabaseClient {
  const { url, key } = readSupabaseEnv();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
