import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyGitHubWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export type GitHubPushPayload = {
  ref: string;
  before: string;
  after: string;
  repository: { id: number; full_name: string; default_branch: string; name: string; owner: { login: string } };
  commits?: Array<{ id: string; message: string }>;
};

export type GitHubPullRequestPayload = {
  action: string;
  number: number;
  pull_request: {
    number: number;
    title: string;
    head: { ref: string; sha: string };
    base: { ref: string; sha: string };
  };
  repository: { id: number; full_name: string; default_branch: string; owner: { login: string } };
};

export type GitHubRepositoryPayload = {
  action: string;
  repository?: { id: number; full_name: string; default_branch: string };
  changes?: { repository?: { name?: { from?: string } } };
};

export function branchFromRef(ref: string): string | null {
  if (!ref.startsWith("refs/heads/")) return null;
  return ref.slice("refs/heads/".length);
}

export function parseRepositoryFullName(fullName: string): { owner: string; repo: string } | null {
  const parts = fullName.split("/");
  if (parts.length !== 2) return null;
  return { owner: parts[0], repo: parts[1] };
}
