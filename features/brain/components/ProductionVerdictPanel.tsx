"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  PRODUCTION_VERDICT_LABELS,
  type ProductionVerdict,
} from "@/brain/production-verdict/build-verdict";

function verdictTone(status: ProductionVerdict["status"]) {
  switch (status) {
    case "ready_for_production":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "almost_ready":
      return "border-amber-500/30 bg-amber-500/5";
    case "needs_improvements":
      return "border-orange-500/30 bg-orange-500/5";
    case "not_ready":
      return "border-red-500/30 bg-red-500/5";
    default:
      return "border-border bg-card/40";
  }
}

export function ProductionVerdictPanel({
  verdict,
  reportHref,
  compact = false,
}: {
  verdict: ProductionVerdict;
  reportHref?: string;
  compact?: boolean;
}) {
  const delta = verdict.scoreDelta;

  return (
    <section
      className={`rounded-2xl border p-6 md:p-8 ${verdictTone(verdict.status)}`}
      aria-labelledby="production-verdict-heading"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Production Verdict
            </p>
            <h2 id="production-verdict-heading" className="text-2xl font-semibold tracking-tight md:text-3xl">
              {verdict.headline}
            </h2>
            <Badge variant="outline" className="rounded-full">
              {PRODUCTION_VERDICT_LABELS[verdict.status]}
            </Badge>
          </div>

          {!compact && verdict.blockersCount > 0 && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {verdict.blockersCount} production blocker
              {verdict.blockersCount === 1 ? "" : "s"} prevent this application from shipping safely.
            </p>
          )}
        </div>

        <div className="shrink-0 space-y-2 text-left lg:text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Production Ready Score
          </p>
          <p className="text-5xl font-semibold tabular-nums tracking-tight">
            {verdict.score ?? "—"}
            {verdict.score != null && (
              <span className="ml-1 text-lg font-normal text-muted-foreground">/ 100</span>
            )}
          </p>
          {delta != null && delta !== 0 && (
            <p
              className={`flex items-center gap-1 text-sm lg:justify-end ${
                delta > 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {delta > 0 ? (
                <ArrowUpRight className="h-4 w-4" />
              ) : (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {delta > 0 ? "+" : ""}
              {delta} vs previous analysis
            </p>
          )}
          {delta === 0 && (
            <p className="flex items-center gap-1 text-sm text-muted-foreground lg:justify-end">
              <Minus className="h-4 w-4" /> No change vs previous analysis
            </p>
          )}
        </div>
      </div>

      {verdict.priorities.length > 0 && (
        <div className="mt-8 space-y-4">
          <p className="text-sm font-medium">Fastest path forward</p>
          <ol className="space-y-3">
            {verdict.priorities.map((priority) => (
              <li
                key={priority.rank}
                className="rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">
                    {priority.rank}. {priority.title}
                  </span>
                  <span className="text-muted-foreground">
                    {priority.estimatedMinutes} min · +{priority.scoreDelta} points
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {verdict.projectedScore != null && (
          <span>
            Projected score: <strong className="text-foreground">{verdict.projectedScore}</strong>
          </span>
        )}
        {verdict.estimatedTotalMinutes > 0 && (
          <span>
            Estimated total time:{" "}
            <strong className="text-foreground">{verdict.estimatedTotalMinutes} min</strong>
          </span>
        )}
      </div>

      {!compact && (
        <>
          <p className="mt-6 text-sm text-foreground/90">{verdict.recommendedAction}</p>

          <details className="mt-6 rounded-xl border border-border/70 bg-background/30 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium">
              What SequrAI evaluated
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {verdict.methodologyNote}
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {verdict.evaluatedAreas.map((area) => (
                <li key={area.key} className="text-xs text-muted-foreground">
                  <span className="text-foreground">{area.label}</span> ·{" "}
                  {area.status.replaceAll("_", " ")}
                  {area.score != null ? ` · ${area.score}` : ""}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}

      {reportHref && (
        <div className="mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={reportHref}>Open production report</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
