"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startGitHubOAuth } from "@/lib/github/oauth-client";
import { trackEvent } from "@/lib/analytics/track";
import { useI18n } from "@/lib/i18n/client";
import { scanIsActive, scanIsCompleted } from "@/features/onboarding/onboarding-flow";
import type { ProjectReviewUiContext } from "@/server/projects/review-ui-context";

type ReviewUiState =
  | "ready_first"
  | "ready_again"
  | "ready_stale"
  | "requesting"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "disconnected";

type ScanPayload = {
  id: string;
  status: string;
  progress?: number | null;
  progress_message?: string | null;
  commit_sha?: string | null;
};

const scanRetryKey = (projectId: string) => `sequrai_github_scan_${projectId}`;

function shortSha(sha: string | null | undefined): string | null {
  if (!sha) return null;
  return sha.slice(0, 7);
}

export function AnalyzeProjectButton({
  projectId,
  initialContext,
  showCommitHint = true,
  className,
  size = "default",
}: {
  projectId: string;
  initialContext: ProjectReviewUiContext;
  showCommitHint?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg";
}) {
  const { t } = useI18n("projects");
  const { t: te } = useI18n("errors");
  const [context, setContext] = useState(initialContext);
  const [phase, setPhase] = useState<"idle" | "requesting" | "polling" | "failed">(() =>
    initialContext.activeScan?.id ? "polling" : "idle"
  );
  const [activeScanId, setActiveScanId] = useState<string | null>(
    initialContext.activeScan?.id ?? null
  );
  const [scan, setScan] = useState<ScanPayload | null>(initialContext.activeScan);
  const [error, setError] = useState("");
  const [errorRef, setErrorRef] = useState<string | null>(null);
  const requestedRef = useRef(false);

  const reconnectGitHub = useCallback(async () => {
    localStorage.setItem(scanRetryKey(projectId), "1");
    await startGitHubOAuth(`/projects/${projectId}`);
  }, [projectId]);

  const uiState: ReviewUiState = useMemo(() => {
    if (context.githubNeedsReconnect || !context.githubConnected) return "disconnected";
    if (phase === "requesting") return "requesting";
    if (scan && scanIsActive(scan.status)) {
      if (scan.status.toLowerCase() === "queued") return "queued";
      return "processing";
    }
    if (phase === "failed") return "failed";
    if (scan && scanIsCompleted(scan.status)) return "completed";
    if (context.isStale) return "ready_stale";
    if (context.hasVerdict) return "ready_again";
    return "ready_first";
  }, [context, phase, scan]);

  const label = useMemo(() => {
    switch (uiState) {
      case "ready_first":
        return t("analyzeProject");
      case "ready_again":
        return t("analyzeAgain");
      case "ready_stale":
        return t("analyzeLatestCommit");
      case "requesting":
        return t("startingReview");
      case "queued":
        return t("reviewQueued");
      case "processing":
        return t("analyzingProject");
      case "completed":
        return t("reviewComplete");
      case "failed":
        return t("analysisFailedTryAgain");
      case "disconnected":
        return t("reconnectGitHub");
    }
  }, [t, uiState]);

  const commitLabel = useMemo(() => {
    const sha = shortSha(scan?.commit_sha ?? context.latestCommitSha ?? context.reviewedCommitSha);
    if (!sha || !showCommitHint) return null;
    if (uiState === "processing" || uiState === "queued" || uiState === "requesting") {
      return t("analyzingCommit", { sha });
    }
    if (context.isStale && context.latestCommitSha) {
      return t("latestCommitNotReviewed", { sha: shortSha(context.latestCommitSha) ?? sha });
    }
    if (context.reviewedCommitSha) {
      return t("lastReviewedCommit", { sha: shortSha(context.reviewedCommitSha) ?? sha });
    }
    return null;
  }, [context, scan, showCommitHint, t, uiState]);

  const requestReview = useCallback(async () => {
    if (requestedRef.current || phase === "requesting" || phase === "polling") return;
    if (uiState === "disconnected") {
      await reconnectGitHub();
      return;
    }
    if (scan && scanIsActive(scan.status)) return;

    requestedRef.current = true;
    setPhase("requesting");
    setError("");
    setErrorRef(null);

    trackEvent(context.hasVerdict ? "analyze_again_clicked" : "first_review_requested", {
      projectId,
    });

    try {
      const response = await fetch(`/api/repositories/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanType: "full" }),
      });
      const body = (await response.json().catch(() => null)) as
        | {
            scan_id?: string;
            scan?: ScanPayload;
            error?: string;
            code?: string;
            needsReauth?: boolean;
            referenceId?: string;
          }
        | null;

      if (body?.needsReauth || body?.code === "GITHUB_REAUTH_REQUIRED") {
        requestedRef.current = false;
        setPhase("idle");
        await reconnectGitHub();
        return;
      }

      if (response.status === 409 && body?.scan?.id) {
        setActiveScanId(body.scan.id);
        setScan(body.scan);
        setPhase("polling");
        requestedRef.current = false;
        return;
      }

      if (!response.ok || !body?.scan_id) {
        throw new Error(body?.error || te("scanStart"));
      }

      setActiveScanId(body.scan_id);
      setScan(body.scan ?? { id: body.scan_id, status: "queued", progress: 0 });
      setPhase("polling");
      trackEvent("first_review_started", { projectId, scanId: body.scan_id });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : te("scanStart"));
      setErrorRef(crypto.randomUUID().slice(0, 8));
      setPhase("failed");
      trackEvent("first_review_failed", {
        projectId,
        error: cause instanceof Error ? cause.message : "unknown",
      });
    } finally {
      requestedRef.current = false;
    }
  }, [context.hasVerdict, phase, projectId, reconnectGitHub, scan, te, uiState]);

  const pollScan = useCallback(async () => {
    if (!activeScanId) return;
    const response = await fetch(`/api/repositories/${projectId}/scans/${activeScanId}`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | { scan?: ScanPayload; verdict?: unknown; error?: string }
      | null;

    if (!response.ok || !body?.scan) {
      setError(body?.error || te("scanLoad"));
      setPhase("failed");
      return;
    }

    setScan(body.scan);

    if (scanIsCompleted(body.scan.status)) {
      setPhase("idle");
      setContext((prev) => ({
        ...prev,
        hasVerdict: Boolean(body.verdict) || prev.hasVerdict,
        reviewedCommitSha:
          (body.scan?.commit_sha as string | null | undefined) ?? prev.reviewedCommitSha,
        isStale: false,
        activeScan: null,
      }));
      trackEvent("first_review_completed", { projectId, scanId: activeScanId });
      window.location.assign(`/projects/${projectId}?reviewComplete=1`);
      return;
    }

    if (body.scan.status.toLowerCase() === "failed") {
      setPhase("failed");
      setError(body.error || t("analysisFailedTryAgain"));
      trackEvent("first_review_failed", { projectId, scanId: activeScanId });
    }
  }, [activeScanId, projectId, t, te]);

  useEffect(() => {
    const pending = localStorage.getItem(scanRetryKey(projectId));
    if (!pending) return;
    localStorage.removeItem(scanRetryKey(projectId));
    queueMicrotask(() => void requestReview());
  }, [projectId, requestReview]);

  useEffect(() => {
    if (phase !== "polling" || !activeScanId) return;
    queueMicrotask(() => void pollScan());
    const timer = window.setInterval(() => void pollScan(), 4000);
    return () => window.clearInterval(timer);
  }, [activeScanId, phase, pollScan]);

  const busy =
    uiState === "requesting" ||
    uiState === "queued" ||
    uiState === "processing" ||
    phase === "polling";

  return (
    <div className={className}>
      <Button
        onClick={() => void requestReview()}
        disabled={busy && uiState !== "failed"}
        size={size}
        variant={uiState === "failed" ? "destructive" : "default"}
        aria-busy={busy}
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {label}
      </Button>
      {commitLabel && <p className="mt-2 text-xs text-muted-foreground">{commitLabel}</p>}
      {context.freshnessUnknown && (
        <p className="mt-2 text-xs text-muted-foreground">{t("freshnessUnknown")}</p>
      )}
      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {error}
            {context.hasVerdict ? ` ${t("previousVerdictUnchanged")}` : ""}
            {errorRef ? ` (${t("supportReference", { id: errorRef })})` : ""}
          </span>
        </p>
      )}
    </div>
  );
}
