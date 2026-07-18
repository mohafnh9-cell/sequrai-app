import { branchFromRef, type GitHubPushPayload } from "@/lib/github/push-payload";
import type { ParsedPushDetection } from "./schema";

const EMPTY_SHA = "0000000000000000000000000000000000000000";
const MAX_COMMIT_MESSAGE_LENGTH = 500;

function normalizeCommitMessage(message: string | undefined | null): string | null {
  if (!message?.trim()) return null;
  const trimmed = message.trim();
  return trimmed.length > MAX_COMMIT_MESSAGE_LENGTH
    ? `${trimmed.slice(0, MAX_COMMIT_MESSAGE_LENGTH - 1)}…`
    : trimmed;
}

function commitFromPayload(
  payload: GitHubPushPayload,
  headSha: string
): { message: string | null; timestamp: string | null } {
  const headCommit = payload.head_commit;
  if (headCommit?.id === headSha) {
    return {
      message: normalizeCommitMessage(headCommit.message),
      timestamp: headCommit.timestamp ?? null,
    };
  }

  const commits = payload.commits ?? [];
  const match = commits.find((commit) => commit.id === headSha);
  if (match) {
    return {
      message: normalizeCommitMessage(match.message),
      timestamp: match.timestamp ?? null,
    };
  }

  const lastCommit = commits.at(-1);
  if (lastCommit) {
    return {
      message: normalizeCommitMessage(lastCommit.message),
      timestamp: lastCommit.timestamp ?? null,
    };
  }

  return { message: null, timestamp: null };
}

export function isValidPushHeadSha(sha: string | undefined | null): sha is string {
  return Boolean(sha && sha !== EMPTY_SHA);
}

export function parsePushDetection(payload: GitHubPushPayload): ParsedPushDetection | null {
  const branch = branchFromRef(payload.ref);
  const commitSha = payload.after;

  if (!branch || !isValidPushHeadSha(commitSha)) {
    return null;
  }

  const { message, timestamp } = commitFromPayload(payload, commitSha);

  return {
    branch,
    commitSha,
    commitMessage: message,
    pushedAt: timestamp ?? new Date().toISOString(),
  };
}

export function shortCommitSha(commitSha: string | null | undefined): string | null {
  if (!commitSha) return null;
  return commitSha.slice(0, 7);
}
