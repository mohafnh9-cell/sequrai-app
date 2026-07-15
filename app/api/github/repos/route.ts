import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getGitHubRepos, getGitHubTokenScopes } from "@/lib/github";
import { resolveGitHubAccessToken } from "@/lib/github/resolve-token";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const providerToken = await resolveGitHubAccessToken(session.user.id, session);

  if (!providerToken) {
    return NextResponse.json(
      { error: "No GitHub token. Please reconnect with GitHub.", needsReauth: true },
      { status: 403 }
    );
  }

  try {
    const scopes = await getGitHubTokenScopes(providerToken);
    if (!scopes.includes("repo")) {
      return NextResponse.json(
        {
          error: "GitHub access must be upgraded to include private repositories.",
          needsReauth: true,
        },
        { status: 403 }
      );
    }

    const repos = await getGitHubRepos(providerToken);
    return NextResponse.json({ repos, scopes });
  } catch {
    return NextResponse.json({ error: "Failed to fetch GitHub repos" }, { status: 500 });
  }
}
