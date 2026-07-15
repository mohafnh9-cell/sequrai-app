"use client";

import { createClient } from "@/lib/supabase/client";

export async function startGitHubOAuth(nextPath: string) {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  document.cookie = `sequrai_auth_next=${encodeURIComponent(safeNext)}; path=/; max-age=900; SameSite=Lax`;

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      scopes: "repo admin:repo_hook read:user user:email",
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: { prompt: "consent" },
    },
  });

  if (error) throw error;
  if (data.url) {
    window.location.assign(data.url);
  }
}
