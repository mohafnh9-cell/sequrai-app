const GITHUB_API = "https://api.github.com";

export const SEQURAI_WEBHOOK_EVENTS = [
  "push",
  "pull_request",
  "delete",
  "repository",
] as const;

export type GitHubHook = {
  id: number;
  type: string;
  active: boolean;
  events: string[];
  config: {
    url?: string;
    content_type?: string;
    insecure_ssl?: string;
  };
};

export function parseRepositoryOwnerRepo(fullName: string): { owner: string; repo: string } | null {
  const parts = fullName.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { owner: parts[0], repo: parts[1] };
}

export function resolveWebhookCallbackUrl(): string | null {
  if (process.env.GITHUB_WEBHOOK_URL) {
    return process.env.GITHUB_WEBHOOK_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/webhooks/github`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/webhooks/github`;
  }
  return null;
}

const NON_PUBLIC_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const PRIVATE_IPV4_RANGES = /^(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/;

/**
 * GitHub delivers webhooks from its own infrastructure over the public
 * internet. A callback URL pointing at localhost or a private network
 * address will never receive a delivery — registering a hook against one
 * silently breaks the entire push-detection pipeline with no error on
 * either side (GitHub reports delivery attempts on its own dashboard; our
 * database simply never records anything).
 */
export function isPubliclyReachableCallbackUrl(callbackUrl: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(callbackUrl);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  const hostname = parsed.hostname.toLowerCase();
  if (NON_PUBLIC_HOSTNAMES.has(hostname)) return false;
  if (hostname.endsWith(".local")) return false;
  if (PRIVATE_IPV4_RANGES.test(hostname)) return false;
  return true;
}

function githubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export function findSequrAIWebhook(hooks: GitHubHook[], callbackUrl: string): GitHubHook | undefined {
  const normalized = callbackUrl.replace(/\/$/, "");
  return hooks.find((hook) => hook.config.url?.replace(/\/$/, "") === normalized);
}

export async function listRepositoryHooks(
  accessToken: string,
  owner: string,
  repo: string
): Promise<GitHubHook[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
    { headers: githubHeaders(accessToken), cache: "no-store" }
  );
  if (!response.ok) {
    throw new GitHubWebhookError(
      "HOOKS_LIST_FAILED",
      `Could not list repository hooks (${response.status})`,
      response.status
    );
  }
  return response.json() as Promise<GitHubHook[]>;
}

export async function createRepositoryWebhook(
  accessToken: string,
  owner: string,
  repo: string,
  input: { callbackUrl: string; secret: string }
): Promise<GitHubHook> {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/hooks`,
    {
      method: "POST",
      headers: githubHeaders(accessToken),
      body: JSON.stringify({
        name: "web",
        active: true,
        events: [...SEQURAI_WEBHOOK_EVENTS],
        config: {
          url: input.callbackUrl,
          content_type: "json",
          secret: input.secret,
          insecure_ssl: "0",
        },
      }),
    }
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new GitHubWebhookError(
      "HOOK_CREATE_FAILED",
      body?.message ?? `Could not create repository webhook (${response.status})`,
      response.status
    );
  }

  return response.json() as Promise<GitHubHook>;
}

export class GitHubWebhookError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "GitHubWebhookError";
  }
}
