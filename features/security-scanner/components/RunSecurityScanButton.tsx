"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type State = "idle" | "running" | "error";

const scanRetryKey = (projectId: string) => `sequrai_github_scan_${projectId}`;

export function RunSecurityScanButton({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const supabase = createClient();

  async function reconnectGitHub() {
    localStorage.setItem(scanRetryKey(projectId), "1");
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        scopes: "repo read:user user:email",
        redirectTo: `${window.location.origin}/auth/callback?next=/projects/${projectId}`,
        queryParams: { prompt: "consent" },
      },
    });
  }

  const runScan = useCallback(async () => {
    setState("running");
    setError("");

    try {
      const response = await fetch(`/api/repositories/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanType: "full" }),
      });
      const body = (await response.json().catch(() => null)) as
        | { scan_id?: string; error?: string; code?: string; needsReauth?: boolean }
        | null;

      if (body?.needsReauth || body?.code === "GITHUB_REAUTH_REQUIRED") {
        await reconnectGitHub();
        return;
      }

      if (!response.ok || !body?.scan_id) {
        throw new Error(body?.error || "The scan could not be started.");
      }

      router.push(`/projects/${projectId}/scans/${body.scan_id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan could not be started.");
      setState("error");
    }
  }, [projectId, router, supabase]);

  useEffect(() => {
    const pending = localStorage.getItem(scanRetryKey(projectId));
    if (!pending || disabled) return;
    localStorage.removeItem(scanRetryKey(projectId));
    queueMicrotask(() => void runScan());
  }, [disabled, projectId, runScan]);

  return (
    <div className="space-y-2">
      <Button
        onClick={() => void runScan()}
        disabled={disabled || state === "running"}
        className="w-full sm:w-auto"
      >
        {state === "running" ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : state === "error" ? (
          <RotateCcw className="mr-2 h-4 w-4" />
        ) : (
          <Play className="mr-2 h-4 w-4" />
        )}
        {state === "running"
          ? "Starting scan…"
          : state === "error"
            ? "Retry scan"
            : "Run Security Scan"}
      </Button>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
