import { Award, Rocket, GitCommit, Clock, CheckCircle2, XCircle, Timer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatRelativeDate } from "@/lib/utils";
import {
  DIMENSION_LABELS,
  getProductionLevel,
  getProjectProductionStatus,
  getProjectStatusBadgeVariant,
  isSeniorEngineerApproved,
  PROJECT_STATUS_LABELS,
} from "@/brain";
import type { ProductionReadyScore, ReadinessDimensionKey } from "@/brain";

function scoreTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-500";
}

function deployLabel(score: number | null, blockers: number) {
  if (blockers > 0) return { label: "Not ready to deploy", icon: XCircle, tone: "text-red-500" };
  if (score != null && score >= 85)
    return { label: "Ready to deploy", icon: CheckCircle2, tone: "text-emerald-500" };
  return { label: "Almost ready", icon: CheckCircle2, tone: "text-amber-500" };
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
  const status = getProjectProductionStatus({ score, blockersCount: blockers });
  const deploy = deployLabel(score, blockers);
  const DeployIcon = deploy.icon;
  const level = getProductionLevel(score);
  const seniorApproved = isSeniorEngineerApproved(score, blockers);

  if (seniorApproved && score !== null) {
    return (
      <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-emerald-500" />
              Senior Engineer Approved
            </CardTitle>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Ready to Deploy</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-sm text-muted-foreground">
            Congratulations. Your application is ready for production.
          </p>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Production Ready Score</p>
              <p className="text-4xl font-bold text-emerald-500">{score}</p>
              <p className="text-sm text-muted-foreground">/ 100 · 0 minutes to production</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSION_ORDER.map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{DIMENSION_LABELS[key]}</span>
                <span className="font-medium text-emerald-500">
                  {productionReady.dimensions[key] ?? "—"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" />
            Production Readiness
          </CardTitle>
          <Badge variant={getProjectStatusBadgeVariant(status)}>
            {PROJECT_STATUS_LABELS[status]}
          </Badge>
        </div>
        {level && (
          <p className="text-xs text-muted-foreground">
            Production Level {level.id}: {level.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">Production Ready Score</p>
            <p className={`text-2xl font-bold mt-1 ${scoreTone(score)}`}>{score ?? "—"}</p>
            {score !== null && <Progress value={score} className="mt-2 h-1.5" />}
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground">Production blockers</p>
            <p
              className={`text-2xl font-bold mt-1 ${blockers > 0 ? "text-red-500" : "text-emerald-500"}`}
            >
              {blockers}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {productionReady.improvementsCount} improvement
              {productionReady.improvementsCount === 1 ? "" : "s"} recommended
            </p>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Timer className="h-3 w-3" />
              Est. time to production
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
              <DeployIcon className={`h-3 w-3 ${deploy.tone}`} />
              Deploy status
            </p>
            <p className={`text-lg font-semibold mt-1 ${deploy.tone}`}>{deploy.label}</p>
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
