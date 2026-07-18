import type { CommitValidationInput, CommitValidationResult } from "./schema";

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function isValidTimestamp(value: string): boolean {
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

export function validateCommitForReview(
  input: CommitValidationInput
): CommitValidationResult {
  if (!input.expectedRepositoryId || !input.githubRepositoryId) {
    return { valid: false, errorCode: "invalid_repository" };
  }

  if (input.githubRepositoryId !== input.expectedRepositoryId) {
    return { valid: false, errorCode: "invalid_repository" };
  }

  if (!input.commitSha?.trim() || !COMMIT_SHA_PATTERN.test(input.commitSha.trim())) {
    return { valid: false, errorCode: "missing_commit" };
  }

  if (!input.branch?.trim()) {
    return { valid: false, errorCode: "missing_commit" };
  }

  if (!isValidTimestamp(input.pushedAt)) {
    return { valid: false, errorCode: "missing_commit" };
  }

  return { valid: true, errorCode: null };
}
