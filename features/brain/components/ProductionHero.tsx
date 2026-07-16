import { Award, Rocket, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DIMENSION_LABELS,
  getHeroHeadline,
  getHeroSubheadline,
  getProductionLevel,
  isSeniorEngineerApproved,
  type ReadinessDimensions,
} from "@/brain";

export function ProductionHero({
  score,
  blockersCount,
  estimatedMinutes,
  dimensions,
}: {
  score: number | null;
  blockersCount: number;
  estimatedMinutes: number;
  dimensions: ReadinessDimensions;
}) {
  const level = getProductionLevel(score);
  const seniorApproved = isSeniorEngineerApproved(score, blockersCount);
  const headline = getHeroHeadline({ score, blockersCount });
  const subheadline = getHeroSubheadline({ score, blockersCount, estimatedMinutes });

  if (seniorApproved && score !== null) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card p-8">
        <div className="absolute top-4 right-4">
          <Badge className="gap-1.5 bg-emerald-600 hover:bg-emerald-600 text-white">
            <Award className="h-3.5 w-3.5" />
            Senior Engineer Approved
          </Badge>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500">
              Congratulations
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Your application is ready for production
            </h2>
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Production Ready Score</p>
              <p className="text-5xl font-bold text-emerald-500">{score}</p>
              <p className="text-sm text-muted-foreground">/ 100</p>
            </div>
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
              <p className="text-xs text-muted-foreground">Estimated time to production</p>
              <p className="text-lg font-semibold text-emerald-500">0 minutes</p>
              <p className="text-sm font-medium text-emerald-600">READY TO DEPLOY</p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(dimensions) as Array<keyof ReadinessDimensions>).map((key) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm"
              >
                <span className="text-muted-foreground">{DIMENSION_LABELS[key]}</span>
                <span className="font-medium text-emerald-500">{dimensions[key] ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-card to-card p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3 max-w-2xl">
          {level && (
            <Badge variant="outline" className="text-xs">
              Production Level {level.id}: {level.name}
            </Badge>
          )}
          <h2 className="text-xl font-bold tracking-tight uppercase sm:text-2xl text-foreground/90">
            {headline}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{subheadline}</p>
        </div>
        <div className="shrink-0 text-center lg:text-right">
          <p className="text-xs text-muted-foreground mb-1">Production Ready Score</p>
          <p className="text-6xl font-bold tabular-nums">{score ?? "—"}</p>
          <p className="text-sm text-muted-foreground">/ 100</p>
          {score !== null && <Progress value={score} className="mt-3 h-2 w-48 lg:ml-auto" />}
        </div>
      </div>
      {score !== null && blockersCount > 0 && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
          <Rocket className="h-4 w-4 text-amber-500 shrink-0" />
          <span>
            <strong>{blockersCount}</strong> production blocker{blockersCount === 1 ? "" : "s"}{" "}
            remaining — follow your Production Roadmap below.
          </span>
        </div>
      )}
      {score === null && (
        <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 shrink-0" />
          Connect a project and run your first production readiness check.
        </div>
      )}
    </section>
  );
}
