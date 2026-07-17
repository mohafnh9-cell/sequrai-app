"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerdictStatusBadge } from "./VerdictStatusBadge";
import { ProductionScoreDisplay } from "./ProductionScoreDisplay";
import { ReadyToShipMoment } from "./ReadyToShipMoment";
import { verdictToneClass } from "@/brain/production-verdict/status-ui";
import type { VerdictExperienceView } from "@/brain/production-verdict/experience-view";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="min-w-[120px]">
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function ProductionVerdictHero({
  verdict,
  view,
  reportHref,
  retryHref,
}: {
  verdict: ProductionVerdictV1;
  view: VerdictExperienceView;
  reportHref?: string;
  retryHref?: string;
}) {
  if (view.showReadyMoment) {
    return <ReadyToShipMoment view={view} verdict={verdict} reportHref={reportHref} />;
  }

  const tone = verdictToneClass(view.status);

  return (
    <section
      className={`rounded-2xl border p-6 md:p-8 ${tone}`}
      aria-labelledby="production-verdict-hero-heading"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4 max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Production Verdict
          </p>
          <div className="space-y-2">
            <h2
              id="production-verdict-hero-heading"
              className="text-2xl md:text-3xl font-semibold tracking-tight uppercase"
            >
              {view.headline}
            </h2>
            <VerdictStatusBadge status={view.status} />
          </div>
          <p className="text-base text-foreground/90 leading-relaxed">{view.statusMessage}</p>
          {view.status === "insufficient_data" && (
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              {verdict.filesAnalyzed < 10 && <li>Insufficient files analyzed for a full verdict.</li>}
              {verdict.coverageRatio != null && verdict.coverageRatio < 0.3 && (
                <li>Partial repository coverage detected.</li>
              )}
              <li>{view.recommendedAction}</li>
            </ul>
          )}
          {view.status === "analysis_failed" && (
            <div className="rounded-lg border border-[#FF5C6C]/30 bg-[#FF5C6C]/5 p-4 text-sm space-y-3">
              <p className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-[#FF5C6C] shrink-0 mt-0.5" aria-hidden />
                {view.executiveSummary || "The analysis did not complete successfully."}
              </p>
              {retryHref && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={retryHref}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry production check
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 lg:text-right">
          <ProductionScoreDisplay score={view.score} status={view.status} size="lg" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-6 border-t border-border/50 pt-6">
        <Metric label="Production blockers" value={view.blockersCount} />
        {view.showScore && view.estimatedFixMinutes > 0 && (
          <Metric
            label="Estimated path forward"
            value={`${view.estimatedFixMinutes} min`}
          />
        )}
        {view.showScore && view.projectedScore != null && (
          <Metric
            label="Projected score"
            value={`${view.projectedScore} / 100`}
            sub="After recommended priorities"
          />
        )}
        {view.scoreDelta != null && view.scoreDelta !== 0 && (
          <Metric
            label="Score delta"
            value={`${view.scoreDelta > 0 ? "+" : ""}${view.scoreDelta}`}
            sub="Since previous review"
          />
        )}
      </div>

      {reportHref && view.status !== "analysis_failed" && (
        <div className="mt-6">
          <Button variant="outline" size="sm" asChild>
            <Link href={reportHref}>View technical report</Link>
          </Button>
        </div>
      )}
    </section>
  );
}
