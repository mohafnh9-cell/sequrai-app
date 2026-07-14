import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getGitHubRepos } from "@/lib/github";

const requestSchema = z.object({
  repos: z
    .array(z.object({ id: z.number().int().positive() }).passthrough())
    .min(1)
    .max(100),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid repository selection" }, { status: 422 });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const providerToken = session?.provider_token;
  if (!providerToken) {
    return NextResponse.json(
      { error: "Reconnect GitHub before selecting repositories", needsReauth: true },
      { status: 403 }
    );
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(2);
  if (!memberships?.length) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }
  if (memberships.length > 1) {
    return NextResponse.json(
      { error: "Select an organization before connecting repositories" },
      { status: 409 }
    );
  }
  const organizationId = memberships[0].organization_id;

  const allowedRepos = await getGitHubRepos(providerToken);
  const allowedById = new Map(allowedRepos.map((repo) => [repo.id, repo]));
  const selected = parsed.data.repos.map(({ id }) => allowedById.get(id));
  if (selected.some((repo) => !repo)) {
    return NextResponse.json({ error: "Repository access could not be verified" }, { status: 403 });
  }

  let saved = 0;
  for (const repo of selected) {
    if (!repo) continue;
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("github_repo", repo.html_url)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("projects")
        .update({
          name: repo.name,
          description: repo.description,
          github_repository_id: repo.id,
          github_is_private: repo.private,
          github_default_branch: repo.default_branch,
          github_connected_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .eq("organization_id", organizationId);
      if (error) throw new Error("Could not update connected repository");
    } else {
      const { error } = await supabase.from("projects").insert({
          organization_id: organizationId,
          name: repo.name,
          github_repo: repo.html_url,
          description: repo.description,
          github_repository_id: repo.id,
          github_is_private: repo.private,
          github_default_branch: repo.default_branch,
          github_connected_at: new Date().toISOString(),
      });
      if (error) throw new Error("Could not connect repository");
    }
    saved++;
  }

  return NextResponse.json({ saved, total: selected.length });
}
