import type {
  RepositoryConnectionContext,
  RepositoryConnectionStatus,
  RepositoryStatusDisplay,
  RepositoryStatusView,
  RepositorySyncErrorCode,
} from "./schema";

function resolveConnectionIssue(
  context: RepositoryConnectionContext
): RepositorySyncErrorCode | null {
  if (context.lastError) return context.lastError;
  if (!context.githubRepo) return "repository_disconnected";
  if (!context.githubRepositoryId) return "missing_repository";
  if (!context.hasOrganizationToken) return "invalid_github_connection";
  if (context.webhookEnabled === false) return "invalid_github_connection";
  if (!context.hasWebhookRegistration || context.webhookActive === false) {
    return "invalid_github_connection";
  }
  return null;
}

export function deriveConnectionStatus(
  context: RepositoryConnectionContext
): RepositoryConnectionStatus {
  if (!context.githubRepo) return "disconnected";
  const issue = resolveConnectionIssue(context);
  if (issue) return "connection_issue";
  return "connected";
}

export function buildRepositoryStatusView(
  context: RepositoryConnectionContext
): RepositoryStatusView {
  const connectionStatus = deriveConnectionStatus(context);
  const errorCode =
    connectionStatus === "connection_issue" ? resolveConnectionIssue(context) : null;

  let display: RepositoryStatusDisplay;
  if (connectionStatus === "disconnected") {
    display = "disconnected";
  } else if (connectionStatus === "connection_issue") {
    display = "connection_issue";
  } else if (context.detectedAt) {
    display = "connected_detected";
  } else {
    display = "connected_waiting";
  }

  return {
    display,
    connectionStatus,
    errorCode,
    branch: context.branch,
    commitSha: context.commitSha,
    commitMessage: context.commitMessage,
    pushedAt: context.pushedAt,
    detectedAt: context.detectedAt,
    githubRepositoryId: context.githubRepositoryId,
  };
}
