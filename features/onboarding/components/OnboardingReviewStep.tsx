"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { scanIsActive, scanIsCompleted } from "../onboarding-flow";
import { startGitHubOAuth } from "@/lib/github/oauth-client";
import { useI18n } from "@/lib/i18n/client";

const REVIEW_AREA_KEYS = [
  "authentication",
  "authorization",
  "secrets",
  "dependencies",
  "deployment",
] as const;

type ScanPayload = {
  id: string;
  status: string;
  progress?: number | null;
  progress_message?: string | null;
};

export function OnboardingReviewStep({
  projectId,
  existingScanId,
  onComplete,
}: {
  projectId: string;
  existingScanId?: string | null;
  onComplete: (scanId: string, verdict: ProductionVerdictV1) => void;
}) {
  const { t } = useI18n("onboarding");
  const { t: te } = useI18n("errors");
  const { t: tc } = useI18n("common");
  const [scanId, setScanId] = useState<string | null>(existingScanId ?? null);
  const [scan, setScan] = useState<ScanPayload | null>(null);
  const [error, setError] = useState("");
  const [activeArea, setActiveArea] = useState(0);

  const startScan = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/repositories/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanType: "full" }),
      });
      const body = (await response.json().catch(() => null)) as
        | { scan_id?: string; error?: string; needsReauth?: boolean; code?: string }
        | null;

      if (body?.needsReauth || body?.code === "GITHUB_REAUTH_REQUIRED") {
        localStorage.setItem(`sequrai_github_scan_${projectId}`, "1");
        await startGitHubOAuth(`/onboarding?step=review&projectId=${projectId}`);
        return;
      }

      if (!response.ok || !body?.scan_id) {
        throw new Error(body?.error || te("scanStart"));
      }

      setScanId(body.scan_id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : te("scanStart"));
    }
  }, [projectId, te]);

  const pollScan = useCallback(async () => {
    if (!scanId) return;
    const response = await fetch(`/api/repositories/${projectId}/scans/${scanId}`, {
      cache: "no-store",
    });
    const body = (await response.json().catch(() => null)) as
      | {
          scan?: ScanPayload;
          verdict?: { v1?: ProductionVerdictV1 | null } | null;
          error?: string;
        }
      | null;

    if (!response.ok || !body?.scan) {
      setError(body?.error || te("scanLoad"));
      return;
    }

    setScan(body.scan);

    const verdict = body.verdict?.v1 ?? null;
    if (scanIsCompleted(body.scan.status) && verdict) {
      onComplete(scanId, verdict);
    }
  }, [onComplete, projectId, scanId, te]);

  useEffect(() => {
    const pending = localStorage.getItem(`sequrai_github_scan_${projectId}`);
    if (pending) {
      localStorage.removeItem(`sequrai_github_scan_${projectId}`);
    }
    if (!scanId) {
      queueMicrotask(() => void startScan());
    }
  }, [projectId, scanId, startScan]);

  useEffect(() => {
    if (!scanId) return;
    queueMicrotask(() => void pollScan());
    const timer = window.setInterval(() => void pollScan(), 4000);
    return () => window.clearInterval(timer);
  }, [pollScan, scanId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveArea((prev) => (prev + 1) % REVIEW_AREA_KEYS.length);
    }, 2200);
    return () => window.clearInterval(timer);
  }, []);

  const progress = Math.max(12, Math.min(100, scan?.progress ?? 18));
  const active = scan ? scanIsActive(scan.status) : true;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
            <Shield className="h-5 w-5 text-primary animate-pulse" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t("reviewTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("reviewBuilding")}</p>
          </div>
        </div>

        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-3">
          {t("reviewing")}
        </p>
        <ul className="space-y-2 mb-6">
          {REVIEW_AREA_KEYS.map((areaKey, index) => {
            const isActive = index === activeArea && active;
            const isDone = index < activeArea && active;
            return (
              <li
                key={areaKey}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-500 ${
                  isActive
                    ? "bg-primary/10 text-foreground translate-x-1"
                    : isDone
                      ? "text-muted-foreground"
                      : "text-muted-foreground/70"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isActive ? "bg-primary animate-pulse" : "bg-border"
                    }`}
                    aria-hidden
                  />
                )}
                {t(`reviewAreas.${areaKey}`)}
              </li>
            );
          })}
        </ul>

        {active && (
          <div className="space-y-2">
            <Progress value={progress} aria-label={tc("states.buildingVerdict")} />
            <p className="text-xs text-muted-foreground">
              {scan?.progress_message || t("analyzingRepo")}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
