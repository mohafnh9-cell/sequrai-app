import { safeNextPath } from "@/lib/auth/safe-next-path";

export function resolveGitHubOAuthSuccessRedirect(next: string | null | undefined): string {
  return safeNextPath(next, "/onboarding");
}

export function resolveGitHubOAuthErrorRedirect(
  next: string | null | undefined,
  error: string
): string {
  const safe = safeNextPath(next, "/integrations");
  if (safe.startsWith("/onboarding")) {
    const url = new URL(safe, "http://localhost");
    url.searchParams.set("githubError", error);
    if (!url.searchParams.get("step")) {
      url.searchParams.set("step", "github");
    }
    return `${url.pathname}${url.search}`;
  }
  return `/integrations?githubError=${encodeURIComponent(error)}`;
}
