import { NextResponse } from "next/server";
import { z } from "zod";
import { getGitHubRepoById, type GitHubRepo } from "@/lib/github";
import { createClient } from "@/lib/supabase/server";

const requestSchema = z.object({
  repos: z
    .array(z.object({ id: z.number().int().positive() }).passthrough())
    .min(1)
    .max(100),
});

const MISSING_COLUMN_CODES = new Set(["PGRST204", "42703"]);

function isMissingColumnError(code?: string) {
  return Boolean(code && MISSING_COLUMN_CODES.has(code));
}

function baseProjectFields(repo: GitHubRepo, organizationId: string) {
  return {
    organization_id: organizationId,
    name: repo.name,
    github_repo: repo.html_url,
    description: repo.description,
  };
}

function extendedProjectFields(repo: GitHubRepo) {
  return {
    github_repository_id: repo.id,
    github_is_private: repo.private,
    github_default_branch: repo.default_branch,
    github_connected_at: new Date().toISOString(),
  };
}

async function upsertConnectedProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  repo: GitHubRepo
) {
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("github_repo", repo.html_url)
    .maybeSingle();

  if (existing) {
    const extended = {
      name: repo.name,
      description: repo.description,
      ...extendedProjectFields(repo),
    };
    let { error } = await supabase
      .from("projects")
      .update(extended)
      .eq("id", existing.id)
      .eq("organization_id", organizationId);

    if (error && isMissingColumnError(error.code)) {
      ({ error } = await supabase
        .from("projects")
        .update({
          name: repo.name,
          description: repo.description,
        })
        .eq("id", existing.id)
        .eq("organization_id", organizationId));
    }

    if (error) {
      console.error("github_connect_project_update_failed", {
        code: error.code,
        projectId: existing.id,
      });
      throw new Error("Could not update the connected repository in Supabase");
    }
    return;
  }

  const fullInsert = {
    ...baseProjectFields(repo, organizationId),
    ...extendedProjectFields(repo),
  };
  let { error } = await supabase.from("projects").insert(fullInsert);

  if (error && isMissingColumnError(error.code)) {
    ({ error } = await supabase
      .from("projects")
      .insert(baseProjectFields(repo, organizationId)));
  }

  if (error) {
    console.error("github_connect_project_insert_failed", {
      code: error.code,
      organizationId,
    });
    throw new Error("Could not save the repository in Supabase");
  }
}

async function connectRepositories(request: Request) {
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

  const selectedIds = [...new Set(parsed.data.repos.map((repo) => repo.id))];
  const verifiedRepos = await Promise.all(
    selectedIds.map((repoId) => getGitHubRepoById(providerToken, repoId))
  );
  if (verifiedRepos.some((repo) => !repo)) {
    return NextResponse.json({ error: "Repository access could not be verified" }, { status: 403 });
  }

  let saved = 0;
  for (const repo of verifiedRepos) {
    if (!repo) continue;
    await upsertConnectedProject(supabase, organizationId, repo);
    saved++;
  }

  return NextResponse.json({ saved, total: selectedIds.length });
}

export async function POST(request: Request) {
  try {
    return await connectRepositories(request);
  } catch (error) {
    console.error("github_connect_failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not connect the selected repositories",
      },
      { status: 500 }
    );
  }
}
