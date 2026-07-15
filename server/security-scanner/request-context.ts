import "server-only";

import { resolveGitHubAccessToken } from "@/lib/github/resolve-token";
import { createClient } from "@/lib/supabase/server";
import { canAccessRepository } from "./authorization";

export class ScanRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ScanRequestError";
  }
}

export async function getScanRequestContext(repositoryId: string, requireGitHubToken = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ScanRequestError(401, "UNAUTHORIZED", "Unauthorized");

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, organization_id, github_repo")
    .eq("id", repositoryId)
    .maybeSingle();
  if (error) throw new ScanRequestError(500, "DATABASE_ERROR", "Could not load repository");
  if (!project) throw new ScanRequestError(404, "REPOSITORY_NOT_FOUND", "Repository not found");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("user_id, organization_id")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (
    !canAccessRepository({
      authenticatedUserId: user.id,
      projectOrganizationId: project.organization_id,
      membership,
    })
  ) {
    throw new ScanRequestError(403, "FORBIDDEN", "Repository access denied");
  }
  if (requireGitHubToken && !project.github_repo) {
    throw new ScanRequestError(422, "GITHUB_REPOSITORY_REQUIRED", "Project has no GitHub repository");
  }

  let providerToken: string | undefined;
  if (requireGitHubToken) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    providerToken = await resolveGitHubAccessToken(user.id, session);
    if (!providerToken) {
      throw new ScanRequestError(
        403,
        "GITHUB_REAUTH_REQUIRED",
        "Reconnect GitHub before starting a scan"
      );
    }
  }

  return { supabase, user, project, providerToken };
}
