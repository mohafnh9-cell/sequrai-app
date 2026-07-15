import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GitHubRepo } from "@/lib/github";
import {
  createRepositoryWebhook,
  findSequrAIWebhook,
  GitHubWebhookError,
  listRepositoryHooks,
  parseRepositoryOwnerRepo,
  resolveWebhookCallbackUrl,
  SEQURAI_WEBHOOK_EVENTS,
} from "@/lib/github/webhook-service";

export type WebhookRegistrationResult =
  | { status: "created"; hookId: number }
  | { status: "existing"; hookId: number }
  | { status: "skipped"; reason: string };

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export async function registerProjectWebhook(
  admin: SupabaseClient,
  input: {
    accessToken: string;
    organizationId: string;
    projectId: string;
    repo: GitHubRepo;
  }
): Promise<WebhookRegistrationResult> {
  const callbackUrl = resolveWebhookCallbackUrl();
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!callbackUrl) {
    return { status: "skipped", reason: "Webhook URL is not configured" };
  }
  if (!secret) {
    return { status: "skipped", reason: "GITHUB_WEBHOOK_SECRET is not configured" };
  }

  const ref = parseRepositoryOwnerRepo(input.repo.full_name);
  if (!ref) {
    return { status: "skipped", reason: "Invalid repository name" };
  }

  let hookId: number;
  let status: "created" | "existing" = "existing";

  const hooks = await listRepositoryHooks(input.accessToken, ref.owner, ref.repo);
  const existing = findSequrAIWebhook(hooks, callbackUrl);

  if (existing) {
    hookId = existing.id;
  } else {
    const created = await createRepositoryWebhook(input.accessToken, ref.owner, ref.repo, {
      callbackUrl,
      secret,
    });
    hookId = created.id;
    status = "created";
  }

  await admin.from("github_webhooks").upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      github_repository_id: input.repo.id,
      github_hook_id: hookId,
      events: [...SEQURAI_WEBHOOK_EVENTS],
      secret_hash: hashSecret(secret),
      active: true,
    },
    { onConflict: "project_id" }
  );

  await admin
    .from("projects")
    .update({
      github_webhook_id: hookId,
      webhook_enabled: true,
    })
    .eq("id", input.projectId)
    .eq("organization_id", input.organizationId);

  return { status, hookId };
}

export function webhookErrorMessage(error: unknown): string {
  if (error instanceof GitHubWebhookError) {
    if (error.status === 403) {
      return "GitHub denied webhook access. Reconnect GitHub to grant repository hook permissions.";
    }
    if (error.status === 404) {
      return "Repository not found or insufficient access to configure webhooks.";
    }
    return error.message;
  }
  return error instanceof Error ? error.message : "Webhook registration failed";
}
