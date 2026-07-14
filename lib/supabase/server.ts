import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ─── Supabase Server Client ───────────────────────────────────────────────────
// Validates the URL format before passing to createServerClient.
// If env vars are placeholders, falls back to a valid dummy URL so the app
// doesn't crash — auth will fail gracefully instead of throwing.

function isValidUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function createClient() {
  const cookieStore = await cookies();

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = isValidUrl(rawUrl) ? rawUrl : "https://placeholder.supabase.co";
  const supabaseKey =
    rawKey && rawKey !== "your_supabase_anon_key" ? rawKey : "placeholder-anon-key";

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — safe to ignore.
        }
      },
    },
  });
}
