import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import { createGitHubOAuthState, githubOAuthStateCookieName } from "@/lib/github/oauth-state";
import { assertWorkspaceMembership } from "@/server/workspaces/service";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimited = enforceRateLimit(request);
  if (rateLimited) return rateLimited;

  const auth = await getServerAuthContext();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized", code: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { workspaceId?: string };
  const workspaceId = body.workspaceId?.trim() || auth.organizationId;
  if (!workspaceId) {
    return NextResponse.json(
      { error: "No active Workspace", code: "workspace_not_found" },
      { status: 404 }
    );
  }

  const allowed = await assertWorkspaceMembership(auth.supabase, auth.user.id, workspaceId);
  if (!allowed) {
    return NextResponse.json(
      { error: "Workspace access denied", code: "workspace_access_denied" },
      { status: 403 }
    );
  }

  const state = createGitHubOAuthState(workspaceId, auth.user.id);
  const cookieStore = await cookies();
  cookieStore.set(githubOAuthStateCookieName, state.cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: state.maxAge,
  });

  return NextResponse.json({ ok: true, workspaceId });
}
