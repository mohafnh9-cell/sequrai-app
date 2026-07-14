"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type State = "idle" | "running" | "error";

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

  async function runScan() {
    setState("running");
    setError("");

    try {
      const response = await fetch(`/api/repositories/${projectId}/scans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = (await response.json().catch(() => null)) as
        | { scan_id?: string; error?: string }
        | null;

      if (!response.ok || !body?.scan_id) {
        throw new Error(body?.error || "The scan could not be started.");
      }

      router.push(`/projects/${projectId}/scans/${body.scan_id}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The scan could not be started.");
      setState("error");
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={runScan}
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
