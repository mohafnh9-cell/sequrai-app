import {
  Rocket,
  AlertTriangle,
  GitCommit,
  Clock,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatRelativeDate } from "@/lib/utils";
import { DIMENSION_LABELS } from "@/brain";
import type { ProductionReadyScore, ReadinessDimensionKey } from "@/brain";

function scoreTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-500";
}

function readinessLabel(score: number | null, blockers: number) {
  if (score === null) return { label: "Not analyzed", variant: "outline" as const };
  if (blockers > 0) return { label: "Blockers found", variant: "destructive" as const };
  if (score >= 85) return { label: "Production ready", variant: "default" as const };
  if (score >= 70) return { label: "Almost ready", variant: "secondary" as const };
  return { label: "Needs work", variant: "outline" as const };
}

function checkLabel(score: number | null, blockers: number) {
  if (blockers > 0) return { label: "Blocked", icon: XCircle, tone: "text-red-500" };
  if (score != null && score < 70)
    return { label: "Not ready", icon: AlertTriangle, tone: "text-amber-500" };
  return { label: "On track", icon: CheckCircle2, tone: "text-emerald-500" };
}

const DIMENSION_ORDER: ReadinessDimensionKey[] = [
  "security",
  "authentication",
  "databaseDesign",
  "bestPractices",
  "architecture",
  "performance",
  "deploymentReadiness",
];

export function ProductionReadinessSummary({
  productionReady,
  lastScanAt,
  lastCommitSha,
  webhookEnabled,
}: {
  productionReady: ProductionReadyScore;
  lastScanAt: string | null;
  lastCommitSha: string | null;
  webhookEnabled?: boolean | null;
}) {
  const score = productionReady.overall;
  const blockers = productionReady.blockersCount;
  const status = readinessLabel(score, blockers);
  const check = checkLabel(score, blockers);
  const CheckIcon = check.icon;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Production Readiness
          </CardTitle>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">Production Ready Score</p>
            <p className={`text-2xl font-bold mt-1 ${scoreTone(score)}`}>{score ?? "—"}</p>
            {score !== null && (
              <Progress value={score} className="mt-2 h-1.5" />
            )}
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">Blockers</p>
            <p
              className={`text-2xl font-bold mt-1 ${blockers > 0 ? "text-red-500" : "text-emerald-500"}`}
            >
              {blockers}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {productionReady.improvementsCount} improvement
              {productionReady.improvementsCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Est. time to ready
            </p>
            <p className="text-2xl font-bold mt-1">
              {score === null ? "—" : productionReady.estimatedMinutesToReady}
              {score !== null && (
                <span className="text-sm font-normal text-muted-foreground ml-1">min</span>
              )}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckIcon className={`h-3 w-3 ${check.tone}`} />
              Deploy status
            </p>
            <p className={`text-lg font-semibold mt-1 ${check.tone}`}>{check.label}</p>
          </div>
        </div>

        {score !== null && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSION_ORDER.map((key) => {
              const value = productionReady.dimensions[key];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{DIMENSION_LABELS[key]}</span>
                  <span className={`font-medium ${scoreTone(value)}`}>{value ?? "—"}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" />
            Last analysis: {lastScanAt ? formatRelativeDate(lastScanAt) : "Never"}
          </span>
          <span className="flex items-center gap-2">
            <GitCommit className="h-3.5 w-3.5" />
            Last commit: {lastCommitSha ? lastCommitSha.slice(0, 7) : "—"}
          </span>
          <Badge variant={webhookEnabled === false ? "outline" : "secondary"} className="text-xs">
            GitHub automation: {webhookEnabled === false ? "Paused" : "Active"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
