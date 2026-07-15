"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  FileCode2,
  GitBranch,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScanSecurityIntelligence } from "@/features/ai-security-engine/components/ScanSecurityIntelligence";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  findingFile,
  findingConfidence,
  findingEvidence,
  findingLine,
  findingSnippet,
  findingStatus,
  formatScanDate,
  scanCommit,
  scanDate,
  scanScore,
  scanStack,
  type ScanFinding,
  type ScanRecord,
} from "./types";

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFO: 4,
};

function severityStyle(severity?: string) {
  switch (severity?.toUpperCase()) {
    case "CRITICAL":
      return "border-red-500/30 bg-red-500/10 text-red-600";
    case "HIGH":
      return "border-orange-500/30 bg-orange-500/10 text-orange-600";
    case "MEDIUM":
      return "border-amber-500/30 bg-amber-500/10 text-amber-700";
    case "LOW":
      return "border-blue-500/30 bg-blue-500/10 text-blue-600";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function statusIsActive(status?: string) {
  return [
    "QUEUED",
    "FETCHING_REPOSITORY",
    "INDEXING",
    "SCANNING",
    "CALCULATING_SCORE",
  ].includes(status?.toUpperCase() ?? "");
}

function unique(findings: ScanFinding[], value: (finding: ScanFinding) => unknown) {
  return Array.from(
    new Set(
      findings
        .map(value)
        .filter((item): item is string => typeof item === "string" && item.length > 0),
    ),
  ).sort();
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={`Filter by ${label}`} className="min-w-32">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label.toLowerCase()}</SelectItem>
        {values.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ScanDetailView({
  projectId,
  scanId,
}: {
  projectId: string;
  scanId: string;
}) {
  const [scan, setScan] = useState<ScanRecord | null>(null);
  const [findings, setFindings] = useState<ScanFinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [category, setCategory] = useState("all");
  const [file, setFile] = useState("all");
  const [status, setStatus] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [rule, setRule] = useState("all");
  const [sort, setSort] = useState("severity");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/repositories/${projectId}/scans/${scanId}`,
        { cache: "no-store" },
      );
      const body = (await response.json().catch(() => null)) as
        | { scan?: ScanRecord; findings?: ScanFinding[]; error?: string }
        | null;
      if (!response.ok || !body?.scan) {
        throw new Error(body?.error || "Could not load this scan.");
      }
      setScan(body.scan);
      setFindings(Array.isArray(body.findings) ? body.findings : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load this scan.");
    } finally {
      setLoading(false);
    }
  }, [projectId, scanId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(() => {
    if (!statusIsActive(scan?.status)) return;
    const timer = window.setInterval(() => void load(true), 4000);
    return () => window.clearInterval(timer);
  }, [load, scan?.status]);

  const options = useMemo(
    () => ({
      severities: unique(findings, (item) => item.severity),
      categories: unique(findings, (item) => item.category),
      files: unique(findings, findingFile),
      statuses: unique(findings, findingStatus),
      confidences: unique(findings, (item) =>
        findingConfidence(item) === undefined ? "" : String(findingConfidence(item)),
      ),
      rules: unique(findings, (item) => item.rule_id ?? item.rule),
    }),
    [findings],
  );

  const visibleFindings = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return findings
      .filter((finding) => {
        const haystack = [
          finding.title,
          finding.description,
          finding.category,
          finding.rule_id,
          finding.rule,
          findingFile(finding),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return (
          (!normalizedQuery || haystack.includes(normalizedQuery)) &&
          (severity === "all" || finding.severity === severity) &&
          (category === "all" || finding.category === category) &&
          (file === "all" || findingFile(finding) === file) &&
          (status === "all" || findingStatus(finding) === status) &&
          (confidence === "all" || String(findingConfidence(finding)) === confidence) &&
          (rule === "all" || (finding.rule_id ?? finding.rule) === rule)
        );
      })
      .sort((a, b) => {
        if (sort === "file") return findingFile(a).localeCompare(findingFile(b));
        if (sort === "title") return (a.title ?? "").localeCompare(b.title ?? "");
        return (
          (SEVERITY_ORDER[a.severity?.toUpperCase() ?? ""] ?? 99) -
          (SEVERITY_ORDER[b.severity?.toUpperCase() ?? ""] ?? 99)
        );
      });
  }, [findings, query, severity, category, file, status, confidence, rule, sort]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading scan…
      </div>
    );
  }

  if (error || !scan) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center">
        <AlertCircle className="mb-3 h-9 w-9 text-destructive" />
        <h1 className="font-semibold">Unable to load scan</h1>
        <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        <Button className="mt-4" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const score = scanScore(scan);
  const progress = Math.max(0, Math.min(100, scan.progress ?? 0));
  const active = statusIsActive(scan.status);
  const stack = scanStack(scan);
  const severitySummary = options.severities.map((item) => ({
    severity: item,
    count: findings.filter((finding) => finding.severity === item).length,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/projects/${projectId}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to project
        </Link>
      </Button>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Security scan</h1>
            <Badge variant="outline">{scan.status || "Unknown"}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{formatScanDate(scanDate(scan))}</span>
            {scan.branch && (
              <span className="flex items-center gap-1">
                <GitBranch className="h-3.5 w-3.5" /> {scan.branch}
              </span>
            )}
            {scanCommit(scan) && <code>{scanCommit(scan)?.slice(0, 12)}</code>}
          </div>
        </div>
        {score !== null && (
          <div className="rounded-xl border px-5 py-3 text-center">
            <p className="text-xs text-muted-foreground">Security score</p>
            <p className="text-2xl font-bold">{score}/100</p>
          </div>
        )}
      </div>

      {active && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin" /> Scan in progress
              </span>
              {scan.progress !== undefined && <span>{progress}%</span>}
            </div>
            <Progress value={scan.progress === undefined ? 15 : progress} />
            <p className="text-xs text-muted-foreground">
              {scan.progress_message || "Results refresh automatically while the scan is running."}
            </p>
          </CardContent>
        </Card>
      )}

      {(scan.error_message || scan.error) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {scan.error_message || scan.error}
        </div>
      )}

      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
        <strong>Review required.</strong> Scanner findings indicate potential risks and may
        include false positives. Validate each result before changing production code.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Findings</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{findings.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Files scanned</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">
            {scan.files_analyzed ?? scan.files_scanned ?? scan.total_files ?? "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Stack</CardTitle></CardHeader>
          <CardContent className="text-sm font-semibold">
            {stack.length ? stack.join(", ") : "Unavailable"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Files with findings</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{new Set(findings.map(findingFile).filter(Boolean)).size}</CardContent>
        </Card>
      </div>

      <ScanSecurityIntelligence
        scanId={scanId}
        scanCompleted={!active && (scan.status?.toLowerCase() === "completed")}
      />

      {severitySummary.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {severitySummary.map((item) => (
            <Badge key={item.severity} variant="outline" className={severityStyle(item.severity)}>
              {item.severity} {item.count}
            </Badge>
          ))}
        </div>
      )}

      <section className="space-y-4" aria-labelledby="findings-heading">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="findings-heading" className="text-lg font-semibold">Findings</h2>
            <p className="text-sm text-muted-foreground">
              Showing {visibleFindings.length} of {findings.length}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search findings, rules, or files…"
              className="pl-9"
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect label="Severity" value={severity} values={options.severities} onChange={setSeverity} />
            <FilterSelect label="Category" value={category} values={options.categories} onChange={setCategory} />
            <FilterSelect label="File" value={file} values={options.files} onChange={setFile} />
            <FilterSelect label="Status" value={status} values={options.statuses} onChange={setStatus} />
            <FilterSelect label="Confidence" value={confidence} values={options.confidences} onChange={setConfidence} />
            <FilterSelect label="Rule" value={rule} values={options.rules} onChange={setRule} />
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger aria-label="Sort findings"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="severity">Sort: Severity</SelectItem>
                <SelectItem value="file">Sort: File</SelectItem>
                <SelectItem value="title">Sort: Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {visibleFindings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10 text-center">
              <ShieldAlert className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">{findings.length ? "No findings match these filters" : "No findings reported"}</p>
            </CardContent>
          </Card>
        ) : (
          visibleFindings.map((finding, index) => {
            const path = findingFile(finding);
            const line = findingLine(finding);
            const snippet = findingSnippet(finding);
            const findingState = findingStatus(finding);
            const findingConfidenceValue = findingConfidence(finding);
            const evidence = findingEvidence(finding);
            return (
              <Card key={finding.id || `${finding.rule_id}-${path}-${line}-${index}`}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={severityStyle(finding.severity)}>
                      {finding.severity || "UNKNOWN"}
                    </Badge>
                    {finding.category && <Badge variant="secondary">{finding.category}</Badge>}
                    {findingState && <Badge variant="outline">{findingState}</Badge>}
                    {findingConfidenceValue !== undefined && (
                      <span className="text-xs text-muted-foreground">Confidence: {findingConfidenceValue}</span>
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{finding.title || "Untitled finding"}</CardTitle>
                    {(finding.rule_id || finding.rule) && (
                      <code className="mt-1 block text-xs text-muted-foreground">{finding.rule_id ?? finding.rule}</code>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {finding.description && <p className="text-sm">{finding.description}</p>}
                  {path && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileCode2 className="h-3.5 w-3.5" />
                      <code>{path}{line !== undefined ? `:${line}` : ""}</code>
                    </div>
                  )}
                  {evidence && (
                    <div><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Evidence</h3><p className="text-sm">{evidence}</p></div>
                  )}
                  {snippet && (
                    <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs"><code>{snippet}</code></pre>
                  )}
                  {finding.impact && (
                    <div><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Impact</h3><p className="text-sm">{finding.impact}</p></div>
                  )}
                  {finding.recommendation && (
                    <div><h3 className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Recommendation</h3><p className="text-sm">{finding.recommendation}</p></div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </section>
    </div>
  );
}
