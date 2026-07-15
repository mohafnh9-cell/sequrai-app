import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { InlineScanJobRunner } from "@/server/security-scanner/scan-job-runner";
import { createAdminClient } from "@/server/security-scanner/admin-client";
import {
  postGitHubCommitStatus,
  statusFromSecurityCheck,
} from "./github-status";
import { finalizeScanAutomation } from "./post-scan";
import { resolveOrganizationGitHubToken } from "./token-resolver";
import {
  branchFromRef,
  type GitHubPullRequestPayload,
  type GitHubPushPayload,
  type GitHubRepositoryPayload,
} from "./webhook-utils";
import { recordRepositoryActivity } from "./activity";
import { extractCriticalPaths } from "./health";

type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  github_repo: string | null;
  github_repository_id: number | null;
  webhook_enabled: boolean | null;
  security_score: number | null;
};

function log(event: string, fields: Record<string, unknown>) {
  console.info({ component: "github-automation", event, ...fields });
}

async function findProjectByRepositoryId(
  admin: SupabaseClient,
  repositoryId: number
): Promise<ProjectRow | null> {
  const { data } = await admin
    .from("projects")
    .select("id, organization_id, name, github_repo, github_repository_id, webhook_enabled, security_score")
    .eq("github_repository_id", repositoryId)
    .maybeSingle();
  return data as ProjectRow | null;
}

async function recordEvent(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    deliveryId: string | null;
    eventType: string;
    action?: string;
    branch?: string;
    commitSha?: string;
    baseCommitSha?: string;
    pullRequestNumber?: number;
    payload: Record<string, unknown>;
    status: string;
    errorMessage?: string;
  }
) {
  const { error } = await admin.from("repository_events").upsert(
    {
      organization_id: input.organizationId,
      project_id: input.projectId,
      github_delivery_id: input.deliveryId,
      event_type: input.eventType,
      action: input.action ?? null,
      branch: input.branch ?? null,
      commit_sha: input.commitSha ?? null,
      base_commit_sha: input.baseCommitSha ?? null,
      pull_request_number: input.pullRequestNumber ?? null,
      payload: input.payload,
      status: input.status,
      error_message: input.errorMessage ?? null,
      processed_at: input.status === "processed" ? new Date().toISOString() : null,
    },
    { onConflict: "github_delivery_id", ignoreDuplicates: false }
  );
  if (error && error.code !== "23505") {
    console.warn("repository_event_upsert_failed", { message: error.message });
  }
}

async function createAutomationScan(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    projectId: string;
    userId: string;
    scanType: "incremental" | "full";
    branch?: string;
    commitSha?: string;
    triggerType?: "webhook" | "scheduled";
  }
) {
  const { data: active } = await admin
    .from("scans")
    .select("id")
    .eq("repository_id", input.projectId)
    .in("status", [
      "queued",
      "fetching_repository",
      "indexing",
      "scanning",
      "calculating_score",
    ])
    .limit(1)
    .maybeSingle();
  if (active) return null;

  const { data: scan, error } = await admin
    .from("scans")
    .insert({
      organization_id: input.organizationId,
      project_id: input.projectId,
      repository_id: input.projectId,
      triggered_by_user_id: input.userId,
      trigger_type: input.triggerType ?? "webhook",
      scan_type: input.scanType,
      status: "queued",
      progress: 0,
      progress_message: "Scan queued by GitHub automation",
      branch: input.branch ?? null,
      commit_sha: input.commitSha ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`Could not create automation scan: ${error.message}`);
  }

  await admin.from("repository_scan_state").upsert(
    {
      repository_id: input.projectId,
      organization_id: input.organizationId,
      active_scan_id: scan.id,
    },
    { onConflict: "repository_id" }
  );

  return scan.id;
}

async function runScanAndFinalize(
  admin: SupabaseClient,
  input: {
    scanId: string;
    project: ProjectRow;
    userId: string;
    token: string;
    branch?: string;
    scanType: "incremental" | "full";
    baseCommitSha?: string;
    headCommitSha?: string;
    triggerLabel: string;
    statusSha?: string;
    appUrl?: string;
  }
) {
  const runner = new InlineScanJobRunner(admin);
  await runner.run({
    scanId: input.scanId,
    repositoryId: input.project.id,
    organizationId: input.project.organization_id,
    githubRepo: input.project.github_repo!,
    branch: input.branch,
    providerToken: input.token,
    scanType: input.scanType,
    baseCommitSha: input.baseCommitSha,
    headCommitSha: input.headCommitSha,
  });

  const { data: completed } = await admin
    .from("scans")
    .select("*")
    .eq("id", input.scanId)
    .single();
  if (!completed || completed.status !== "completed") {
    throw new Error("Automation scan did not complete");
  }

  const riskScore = Math.max(0, 100 - (completed.security_score ?? 0));
  const { checkStatus } = await finalizeScanAutomation(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    scanId: input.scanId,
    securityScore: completed.security_score ?? 0,
    riskScore,
    criticalCount: completed.critical_count ?? 0,
    highCount: completed.high_count ?? 0,
    findingsCount: completed.findings_count ?? 0,
    previousScore: input.project.security_score,
    triggerLabel: input.triggerLabel,
  });

  if (input.statusSha) {
    await postGitHubCommitStatus({
      githubRepo: input.project.github_repo!,
      sha: input.statusSha,
      token: input.token,
      state: statusFromSecurityCheck(checkStatus),
      context: "sequrai/security",
      description: `Score ${completed.security_score} · ${checkStatus.toUpperCase()}`,
      targetUrl: input.appUrl
        ? `${input.appUrl}/projects/${input.project.id}/scans/${input.scanId}`
        : undefined,
    });
  }

  return { completed, checkStatus };
}

export async function processGitHubWebhookEvent(input: {
  eventType: string;
  deliveryId: string | null;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  const { eventType, deliveryId, payload } = input;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  if (eventType === "ping") {
    return { ok: true, action: "ping" };
  }

  const repository = payload.repository as { id?: number } | undefined;
  if (!repository?.id) {
    return { ok: true, action: "ignored", reason: "no_repository" };
  }

  const project = await findProjectByRepositoryId(admin, repository.id);
  if (!project?.github_repo) {
    return { ok: true, action: "ignored", reason: "project_not_linked" };
  }
  if (project.webhook_enabled === false) {
    return { ok: true, action: "ignored", reason: "webhook_disabled" };
  }

  const tokenResult = await resolveOrganizationGitHubToken(admin, project.organization_id);
  if (!tokenResult) {
    await recordEvent(admin, {
      organizationId: project.organization_id,
      projectId: project.id,
      deliveryId,
      eventType,
      payload,
      status: "failed",
      errorMessage: "No GitHub token available for organization",
    });
    return { ok: false, action: "failed", reason: "no_token" };
  }

  try {
    if (eventType === "push") {
      return await handlePushEvent(admin, {
        project,
        deliveryId,
        payload: payload as unknown as GitHubPushPayload,
        token: tokenResult.token,
        userId: tokenResult.userId,
        appUrl,
      });
    }
    if (eventType === "pull_request") {
      return await handlePullRequestEvent(admin, {
        project,
        deliveryId,
        payload: payload as unknown as GitHubPullRequestPayload,
        token: tokenResult.token,
        userId: tokenResult.userId,
        appUrl,
      });
    }
    if (eventType === "repository") {
      return await handleRepositoryEvent(admin, {
        project,
        deliveryId,
        payload: payload as unknown as GitHubRepositoryPayload,
        eventType,
      });
    }
    if (eventType === "delete") {
      return await handleBranchDelete(admin, {
        project,
        deliveryId,
        payload,
        eventType,
      });
    }

    await recordEvent(admin, {
      organizationId: project.organization_id,
      projectId: project.id,
      deliveryId,
      eventType,
      payload,
      status: "ignored",
    });
    return { ok: true, action: "ignored", reason: "unsupported_event" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing failed";
    await recordEvent(admin, {
      organizationId: project.organization_id,
      projectId: project.id,
      deliveryId,
      eventType,
      payload,
      status: "failed",
      errorMessage: message,
    });
    log("event_failed", { eventType, projectId: project.id, message });
    throw error;
  }
}

async function handlePushEvent(
  admin: SupabaseClient,
  input: {
    project: ProjectRow;
    deliveryId: string | null;
    payload: GitHubPushPayload;
    token: string;
    userId: string;
    appUrl?: string;
  }
) {
  const branch = branchFromRef(input.payload.ref);
  const headSha = input.payload.after;
  const baseSha = input.payload.before;

  if (!branch || !headSha || headSha === "0000000000000000000000000000000000000000") {
    await recordEvent(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      deliveryId: input.deliveryId,
      eventType: "push",
      branch: branch ?? undefined,
      commitSha: headSha,
      payload: input.payload as unknown as Record<string, unknown>,
      status: "ignored",
    });
    return { ok: true, action: "ignored", reason: "branch_delete_or_invalid" };
  }

  await recordEvent(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    deliveryId: input.deliveryId,
    eventType: "push",
    branch,
    commitSha: headSha,
    baseCommitSha: baseSha,
    payload: input.payload as unknown as Record<string, unknown>,
    status: "processing",
  });

  await recordRepositoryActivity(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    eventType: "push_received",
    title: "Push received from GitHub",
    description: `Branch ${branch} · ${headSha.slice(0, 7)}`,
    metadata: { branch, headSha, baseSha },
  });

  const { data: state } = await admin
    .from("repository_scan_state")
    .select("last_commit_sha, last_full_scan_at")
    .eq("repository_id", input.project.id)
    .maybeSingle();

  const effectiveBase =
    baseSha && baseSha !== "0000000000000000000000000000000000000000"
      ? baseSha
      : state?.last_commit_sha ?? undefined;

  const scanType =
    effectiveBase && state?.last_full_scan_at ? "incremental" : "full";
  const scanId = await createAutomationScan(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    userId: input.userId,
    scanType,
    branch,
    commitSha: headSha,
  });

  if (!scanId) {
    await recordEvent(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      deliveryId: input.deliveryId,
      eventType: "push",
      branch,
      commitSha: headSha,
      payload: input.payload as unknown as Record<string, unknown>,
      status: "ignored",
      errorMessage: "Scan already in progress",
    });
    return { ok: true, action: "skipped", reason: "scan_in_progress" };
  }

  if (scanType === "incremental" && effectiveBase) {
    await postGitHubCommitStatus({
      githubRepo: input.project.github_repo!,
      sha: headSha,
      token: input.token,
      state: "pending",
      context: "sequrai/security",
      description: "Incremental security scan in progress",
    });
  }

  const { completed } = await runScanAndFinalize(admin, {
    scanId,
    project: input.project,
    userId: input.userId,
    token: input.token,
    branch,
    scanType,
    baseCommitSha: scanType === "incremental" ? effectiveBase : undefined,
    headCommitSha: headSha,
    triggerLabel: `Push to ${branch}`,
    statusSha: headSha,
    appUrl: input.appUrl,
  });

  if (scanType === "incremental" && effectiveBase) {
    const changedPaths =
      (completed.metrics as { changedPaths?: string[] } | null)?.changedPaths ?? [];
    await admin.from("incremental_scans").insert({
      organization_id: input.project.organization_id,
      project_id: input.project.id,
      scan_id: scanId,
      base_commit_sha: effectiveBase,
      head_commit_sha: headSha,
      changed_files: changedPaths,
      critical_files_changed: extractCriticalPaths(changedPaths),
    });
  }

  await recordEvent(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    deliveryId: input.deliveryId,
    eventType: "push",
    branch,
    commitSha: headSha,
    baseCommitSha: effectiveBase,
    payload: input.payload as unknown as Record<string, unknown>,
    status: "processed",
  });

  return { ok: true, action: "scan_completed", scanId };
}

async function handlePullRequestEvent(
  admin: SupabaseClient,
  input: {
    project: ProjectRow;
    deliveryId: string | null;
    payload: GitHubPullRequestPayload;
    token: string;
    userId: string;
    appUrl?: string;
  }
) {
  const action = input.payload.action;
  const pr = input.payload.pull_request;
  if (!["opened", "synchronize", "reopened"].includes(action)) {
    await recordEvent(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      deliveryId: input.deliveryId,
      eventType: "pull_request",
      action,
      pullRequestNumber: pr.number,
      payload: input.payload as unknown as Record<string, unknown>,
      status: "ignored",
    });
    return { ok: true, action: "ignored", reason: "pr_action_ignored" };
  }

  const headSha = pr.head.sha;
  const baseSha = pr.base.sha;
  const headBranch = pr.head.ref;
  const baseBranch = pr.base.ref;

  await recordEvent(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    deliveryId: input.deliveryId,
    eventType: "pull_request",
    action,
    branch: headBranch,
    commitSha: headSha,
    baseCommitSha: baseSha,
    pullRequestNumber: pr.number,
    payload: input.payload as unknown as Record<string, unknown>,
    status: "processing",
  });

  await recordRepositoryActivity(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    eventType: "pull_request_received",
    title: "Pull Request analyzed",
    description: `#${pr.number} ${pr.title}`,
    metadata: { pullRequestNumber: pr.number, headSha, baseSha },
  });

  const scoreBefore = input.project.security_score;
  const scanId = await createAutomationScan(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    userId: input.userId,
    scanType: "incremental",
    branch: headBranch,
    commitSha: headSha,
  });

  if (!scanId) {
    return { ok: true, action: "skipped", reason: "scan_in_progress" };
  }

  await postGitHubCommitStatus({
    githubRepo: input.project.github_repo!,
    sha: headSha,
    token: input.token,
    state: "pending",
    context: "sequrai/security",
    description: "Pull Request security analysis in progress",
  });

  const { completed, checkStatus } = await runScanAndFinalize(admin, {
    scanId,
    project: input.project,
    userId: input.userId,
    token: input.token,
    branch: headBranch,
    scanType: "incremental",
    baseCommitSha: baseSha,
    headCommitSha: headSha,
    triggerLabel: `Pull Request #${pr.number}`,
    statusSha: headSha,
    appUrl: input.appUrl,
  });

  const scoreAfter = completed.security_score ?? 0;
  const scoreDelta = scoreBefore === null ? 0 : scoreAfter - scoreBefore;

  const { data: prFindings } = await admin
    .from("scan_findings")
    .select("title, severity, category, status")
    .eq("scan_id", scanId);

  const added = (prFindings ?? [])
    .filter((f) => f.severity !== "info")
    .slice(0, 5)
    .map((f) => f.title);
  const resolved: string[] = [];

  await admin.from("pull_request_scans").upsert(
    {
      organization_id: input.project.organization_id,
      project_id: input.project.id,
      scan_id: scanId,
      pull_request_number: pr.number,
      pull_request_title: pr.title,
      base_branch: baseBranch,
      head_branch: headBranch,
      base_commit_sha: baseSha,
      head_commit_sha: headSha,
      security_score_before: scoreBefore,
      security_score_after: scoreAfter,
      score_delta: scoreDelta,
      check_status: checkStatus,
      impact_summary: {
        scoreDelta,
        added,
        resolved,
        checkStatus,
        securityScore: scoreAfter,
      },
    },
    { onConflict: "project_id,pull_request_number,head_commit_sha" }
  );

  await recordEvent(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    deliveryId: input.deliveryId,
    eventType: "pull_request",
    action,
    branch: headBranch,
    commitSha: headSha,
    baseCommitSha: baseSha,
    pullRequestNumber: pr.number,
    payload: input.payload as unknown as Record<string, unknown>,
    status: "processed",
  });

  return { ok: true, action: "pr_analyzed", scanId };
}

async function handleRepositoryEvent(
  admin: SupabaseClient,
  input: {
    project: ProjectRow;
    deliveryId: string | null;
    payload: GitHubRepositoryPayload;
    eventType: string;
  }
) {
  const action = input.payload.action;
  if (action === "deleted") {
    await admin
      .from("projects")
      .update({ webhook_enabled: false, github_last_commit_sha: null })
      .eq("id", input.project.id);
    await recordRepositoryActivity(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      eventType: "repository_deleted",
      title: "GitHub repository deleted",
      description: "Automation paused until repository is reconnected.",
    });
  } else if (action === "renamed" && input.payload.changes?.repository?.name?.from) {
    const from = input.payload.changes.repository.name.from;
    await recordRepositoryActivity(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      eventType: "repository_renamed",
      title: "GitHub repository renamed",
      description: `Previously ${from}`,
    });
  }

  await recordEvent(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    deliveryId: input.deliveryId,
    eventType: input.eventType,
    action,
    payload: input.payload as unknown as Record<string, unknown>,
    status: "processed",
  });
  return { ok: true, action: "repository_updated" };
}

async function handleBranchDelete(
  admin: SupabaseClient,
  input: {
    project: ProjectRow;
    deliveryId: string | null;
    payload: Record<string, unknown>;
    eventType: string;
  }
) {
  const refType = input.payload.ref_type as string | undefined;
  const ref = input.payload.ref as string | undefined;
  if (refType === "branch" && ref) {
    await recordRepositoryActivity(admin, {
      organizationId: input.project.organization_id,
      projectId: input.project.id,
      eventType: "branch_deleted",
      title: "Branch deleted",
      description: ref,
    });
  }

  await recordEvent(admin, {
    organizationId: input.project.organization_id,
    projectId: input.project.id,
    deliveryId: input.deliveryId,
    eventType: input.eventType,
    branch: ref,
    payload: input.payload,
    status: "processed",
  });
  return { ok: true, action: "branch_delete_recorded" };
}
