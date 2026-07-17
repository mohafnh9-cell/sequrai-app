"use client";

import Link from "next/link";
import { Award, GitCommit, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VerdictExperienceView } from "@/brain/production-verdict/experience-view";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import { ProductionScoreDisplay } from "./ProductionScoreDisplay";
import { trackEvent } from "@/lib/analytics/track";
import { useEffect } from "react";

export function ReadyToShipMoment({
  view,
  verdict,
  reportHref,
}: {
  view: VerdictExperienceView;
  verdict: ProductionVerdictV1;
  reportHref?: string;
}) {
  useEffect(() => {
    trackEvent("ready_to_ship_reached", {
      projectId: verdict.projectId,
      scanId: verdict.scanId,
    });
  }, [verdict.projectId, verdict.scanId]);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[#64D98B]/30 bg-gradient-to-br from-[#64D98B]/10 via-[#101014] to-[#101014] p-8 md:p-10"
      aria-labelledby="ready-to-ship-heading"
    >
      <div className="absolute top-4 right-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#64D98B]/20 px-3 py-1 text-xs font-medium text-[#64D98B]">
          <Award className="h-3.5 w-3.5" aria-hidden />
          Ready to Ship
        </span>
      </div>

      <div className="space-y-6 max-w-2xl">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#64D98B]">
            Production Verdict
          </p>
          <h2 id="ready-to-ship-heading" className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
            Your application is ready to ship.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            No production blockers were found in this review. SequrAI assesses readiness from static
            analysis — continue monitoring as your codebase evolves.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 items-end">
          <ProductionScoreDisplay score={view.score} status={view.status} size="xl" />
          <div className="space-y-3 text-sm">
            {view.commitSha && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <GitCommit className="h-4 w-4" aria-hidden />
                Reviewed <code className="text-foreground">{view.commitSha.slice(0, 12)}</code>
              </p>
            )}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden />
              {new Date(view.generatedAt).toLocaleString()}
            </p>
            {view.resolvedBlockers > 0 && (
              <p className="text-[#64D98B]">
                {view.resolvedBlockers} production blocker
                {view.resolvedBlockers === 1 ? "" : "s"} resolved since last review
              </p>
            )}
            <p className="text-muted-foreground">
              {view.evaluatedAreaCount} production area
              {view.evaluatedAreaCount === 1 ? "" : "s"} evaluated
            </p>
          </div>
        </div>

        {reportHref && (
          <Button variant="outline" size="sm" asChild>
            <Link href={reportHref}>View technical report</Link>
          </Button>
        )}
      </div>
    </section>
  );
}
