import { z } from "zod";

export const RepositoryConnectionStatusSchema = z.enum([
  "connected",
  "connection_issue",
  "disconnected",
]);

export type RepositoryConnectionStatus = z.infer<
  typeof RepositoryConnectionStatusSchema
>;

export const RepositorySyncErrorCodeSchema = z.enum([
  "repository_disconnected",
  "invalid_github_connection",
  "missing_repository",
  "push_detection_failed",
]);

export type RepositorySyncErrorCode = z.infer<typeof RepositorySyncErrorCodeSchema>;

export const RepositoryStatusDisplaySchema = z.enum([
  "connected_waiting",
  "connected_detected",
  "connection_issue",
  "disconnected",
]);

export type RepositoryStatusDisplay = z.infer<typeof RepositoryStatusDisplaySchema>;

export const ParsedPushDetectionSchema = z.object({
  branch: z.string().min(1),
  commitSha: z.string().min(1),
  commitMessage: z.string().nullable(),
  pushedAt: z.string().datetime(),
});

export type ParsedPushDetection = z.infer<typeof ParsedPushDetectionSchema>;

export const RepositorySyncRecordSchema = z.object({
  projectId: z.string().uuid(),
  organizationId: z.string().uuid(),
  githubRepositoryId: z.number().int().positive().nullable(),
  connectionStatus: RepositoryConnectionStatusSchema,
  branch: z.string().nullable(),
  commitSha: z.string().nullable(),
  commitMessage: z.string().nullable(),
  pushedAt: z.string().datetime().nullable(),
  detectedAt: z.string().datetime().nullable(),
  lastError: RepositorySyncErrorCodeSchema.nullable(),
  updatedAt: z.string().datetime(),
});

export type RepositorySyncRecord = z.infer<typeof RepositorySyncRecordSchema>;

export const RepositoryStatusViewSchema = z.object({
  display: RepositoryStatusDisplaySchema,
  connectionStatus: RepositoryConnectionStatusSchema,
  errorCode: RepositorySyncErrorCodeSchema.nullable(),
  branch: z.string().nullable(),
  commitSha: z.string().nullable(),
  commitMessage: z.string().nullable(),
  pushedAt: z.string().datetime().nullable(),
  detectedAt: z.string().datetime().nullable(),
  githubRepositoryId: z.number().int().positive().nullable(),
});

export type RepositoryStatusView = z.infer<typeof RepositoryStatusViewSchema>;

export type RepositoryConnectionContext = {
  githubRepo: string | null;
  githubRepositoryId: number | null;
  webhookEnabled: boolean | null;
  webhookActive: boolean | null;
  hasWebhookRegistration: boolean;
  hasOrganizationToken: boolean;
  lastError: RepositorySyncErrorCode | null;
  detectedAt: string | null;
  branch: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  pushedAt: string | null;
};
