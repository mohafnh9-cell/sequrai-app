import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type NotificationType =
  | "critical_finding"
  | "score_decreased"
  | "scan_completed"
  | "vulnerabilities_fixed"
  | "pull_request_analyzed"
  | "recommendation";

export async function createSecurityNotification(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId?: string;
    userId?: string;
    channel?: "in_app" | "email" | "slack" | "discord";
    notificationType: NotificationType;
    title: string;
    body: string;
    severity?: "info" | "warning" | "critical";
    metadata?: Record<string, unknown>;
  }
) {
  await admin.from("security_notifications").insert({
    organization_id: input.organizationId,
    project_id: input.projectId ?? null,
    user_id: input.userId ?? null,
    channel: input.channel ?? "in_app",
    notification_type: input.notificationType,
    title: input.title,
    body: input.body,
    severity: input.severity ?? "info",
    metadata: input.metadata ?? {},
  });

  // Channel stubs — wire Resend / Slack / Discord when env vars are present.
  if (input.channel === "email" && process.env.RESEND_API_KEY) {
    // await sendEmail(...)
  }
}

export async function notifyOrganizationMembers(
  admin: SupabaseClient,
  organizationId: string,
  input: Omit<Parameters<typeof createSecurityNotification>[1], "organizationId" | "userId">
) {
  const { data: members } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId);
  const targets = members?.length ? members : [{ user_id: null }];
  for (const member of targets) {
    await createSecurityNotification(admin, {
      ...input,
      organizationId,
      userId: member.user_id ?? undefined,
    });
  }
}
