export type GitHubPushPayload = {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    full_name: string;
    default_branch: string;
    name: string;
    owner: { login: string };
  };
  commits?: Array<{ id: string; message: string; timestamp?: string }>;
  head_commit?: { id: string; message: string; timestamp?: string };
};

export function branchFromRef(ref: string): string | null {
  if (!ref.startsWith("refs/heads/")) return null;
  return ref.slice("refs/heads/".length);
}
