"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  GitBranch,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunSecurityScanButton } from "./RunSecurityScanButton";
import {
  formatScanDate,
  scanCommit,
  scanDate,
  scanId,
  scanScore,
  severityCount,
  type ScanRecord,
} from "./types";

function statusClass(status?: string) {
  const value = status?.toUpperCase();
  if (value === "COMPLETED" || value === "COMPLETE" || value === "SUCCEEDED")
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (value === "FAILED" || value === "ERROR")
    return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-blue-500/30 bg-blue-500/10 text-blue-600";
}

export function ProjectScanOverview({
  projectId,
  repositoryConnected,
}: {
  projectId: string;
  repositoryConnected: boolean;
}) {
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [paginationError, setPaginationError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/repositories/${projectId}/scans`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => null)) as
        | { scans?: ScanRecord[]; nextCursor?: string | null; error?: string }
        | null;
      if (!response.ok) throw new Error(body?.error || "Could not load scan history.");
      setScans(Array.isArray(body?.scans) ? body.scans : []);
      setNextCursor(body?.nextCursor ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load scan history.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setPaginationError("");
    try {
      const response = await fetch(
        `/api/repositories/${projectId}/scans?cursor=${encodeURIComponent(nextCursor)}`,
        { cache: "no-store" }
      );
      const body = (await response.json().catch(() => null)) as
        | { scans?: ScanRecord[]; nextCursor?: string | null; error?: string }
        | null;
      if (!response.ok) throw new Error(body?.error || "Could not load more scans.");
      setScans((current) => [...current, ...(body?.scans ?? [])]);
      setNextCursor(body?.nextCursor ?? null);
    } catch (cause) {
      setPaginationError(
        cause instanceof Error ? cause.message : "Could not load more scans."
      );
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const latest = scans[0];
  const latestScore = latest ? scanScore(latest) : null;
  const latestCount =
    latest?.findings_count ??
    (latest
      ? (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const).reduce(
          (total, severity) => total + severityCount(latest, severity),
          0,
        )
      : null);

  return (
    <section className="space-y-4" aria-labelledby="security-scans-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 id="security-scans-heading" className="text-lg font-semibold">
            Security scans
          </h2>
          <p className="text-sm text-muted-foreground">
            Static analysis results from the connected repository.
          </p>
        </div>
        <RunSecurityScanButton projectId={projectId} disabled={!repositoryConnected} />
      </div>

      {!repositoryConnected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
          Connect a GitHub repository before running a scan.
        </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading scan history…
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : scans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center">
            <ShieldCheck className="mb-3 h-9 w-9 text-muted-foreground" />
            <p className="font-medium">No security scans yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Run the first scan to establish a security score and review findings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Latest score</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {latestScore === null ? "—" : `${latestScore}/100`}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Findings</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {latestCount === null ? "—" : latestCount}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Last scan</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-medium">
                {formatScanDate(scanDate(latest))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scan history</CardTitle>
            </CardHeader>
            <CardContent className="divide-y p-0">
              {scans.map((scan, index) => {
                const id = scanId(scan);
                return (
                  <div
                    key={id || `${scanDate(scan)}-${index}`}
                    className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={statusClass(scan.status)}>
                          {scan.status || "Unknown"}
                        </Badge>
                        {scanScore(scan) !== null && (
                          <span className="text-sm font-semibold">{scanScore(scan)}/100</span>
                        )}
                        {scan.findings_count !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {scan.findings_count} findings
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{formatScanDate(scanDate(scan))}</span>
                        {scan.branch && (
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {scan.branch}
                          </span>
                        )}
                        {scanCommit(scan) && (
                          <code>{scanCommit(scan)?.slice(0, 8)}</code>
                        )}
                      </div>
                    </div>
                    {id && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/projects/${projectId}/scans/${id}`}>
                          View results <ArrowRight className="ml-2 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                );
              })}
              {nextCursor && (
                <div className="flex flex-col items-center gap-2 px-6 py-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                    Load more scans
                  </Button>
                  {paginationError && (
                    <p className="text-xs text-destructive">{paginationError}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
