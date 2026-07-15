import {
  Shield,
  AlertTriangle,
  GitCommit,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";

type HealthRow = {
  health_status: string;
  security_score: number | null;
  risk_score: number | null;
  open_findings_count: number;
  critical_open_count: number;
  score_trend: number;
  calculated_at: string;
};

type ScanState = {
  last_commit_sha: string | null;
  last_security_score: number | null;
  open_findings_count: number;
};

function healthBadgeVariant(status: string | null) {
  switch (status) {
    case "excellent":
      return "default" as const;
    case "good":
      return "secondary" as const;
    case "needs_attention":
      return "outline" as const;
    case "critical":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

function healthLabel(status: string | null) {
  switch (status) {
    case "excellent":
      return "Excellent";
    case "good":
      return "Good";
    case "needs_attention":
      return "Needs Attention";
    case "critical":
      return "Critical";
    default:
      return "Unknown";
  }
}

function checkLabel(score: number | null | undefined, critical: number) {
  if (critical > 0) return { label: "Failed", icon: XCircle, tone: "text-red-500" };
  if (score != null && score < 70)
    return { label: "Warning", icon: AlertTriangle, tone: "text-amber-500" };
  return { label: "Passed", icon: CheckCircle2, tone: "text-emerald-500" };
}

export function RepositorySecuritySummary({
  health,
  scanState,
  lastScanAt,
  securityScore,
  webhookEnabled,
}: {
  health: HealthRow | null;
  scanState: ScanState | null;
  lastScanAt: string | null;
  securityScore: number | null;
  webhookEnabled?: boolean | null;
}) {
  const score = health?.security_score ?? securityScore ?? scanState?.last_security_score ?? null;
  const critical = health?.critical_open_count ?? 0;
  const check = checkLabel(score ?? null, critical);
  const CheckIcon = check.icon;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Repository Security
          </CardTitle>
          {health?.health_status && (
            <Badge variant={healthBadgeVariant(health.health_status)}>
              {healthLabel(health.health_status)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-0">
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <p className="text-xs text-muted-foreground">Security Score</p>
          <p className="text-2xl font-bold mt-1">{score ?? "—"}</p>
          {health?.score_trend !== undefined && health.score_trend !== 0 && (
            <p
              className={`text-xs mt-1 ${health.score_trend > 0 ? "text-emerald-500" : "text-red-500"}`}
            >
              {health.score_trend > 0 ? "+" : ""}
              {health.score_trend} pts
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <p className="text-xs text-muted-foreground">Risk Score</p>
          <p className="text-2xl font-bold mt-1">{health?.risk_score ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <p className="text-xs text-muted-foreground">Open Findings</p>
          <p className="text-2xl font-bold mt-1">
            {health?.open_findings_count ?? scanState?.open_findings_count ?? "—"}
          </p>
          {critical > 0 && (
            <p className="text-xs text-red-500 mt-1">{critical} critical</p>
          )}
        </div>
        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckIcon className={`h-3 w-3 ${check.tone}`} />
            Security Check
          </p>
          <p className={`text-lg font-semibold mt-1 ${check.tone}`}>{check.label}</p>
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Last scan: {lastScanAt ? formatRelativeDate(lastScanAt) : "Never"}
        </div>
        <div className="sm:col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
          <GitCommit className="h-3.5 w-3.5" />
          Last commit:{" "}
          {scanState?.last_commit_sha
            ? scanState.last_commit_sha.slice(0, 7)
            : "—"}
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Badge variant={webhookEnabled === false ? "outline" : "secondary"} className="text-xs">
            GitHub automation: {webhookEnabled === false ? "Paused" : "Active"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
