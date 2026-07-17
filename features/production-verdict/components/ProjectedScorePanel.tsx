"use client";

import type { VerdictExperienceView } from "@/brain/production-verdict/experience-view";

export function ProjectedScorePanel({ view }: { view: VerdictExperienceView }) {
  if (!view.showScore || view.score == null || view.projectedScore == null) return null;

  const improvement = view.scoreImprovement ?? 0;

  return (
    <section
      className="rounded-xl border border-border/60 bg-[#101014]/80 p-5"
      aria-label="Projected score after priorities"
    >
      <h3 className="text-sm font-medium">Score projection</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Estimated score after resolving the recommended priorities.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Current score</p>
          <p className="text-3xl font-semibold tabular-nums">{view.score}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Projected after priorities</p>
          <p className="text-3xl font-semibold tabular-nums text-[#64D98B]">
            {view.projectedScore}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Improvement</p>
          <p className="text-3xl font-semibold tabular-nums">
            {improvement > 0 ? "+" : ""}
            {improvement}
          </p>
        </div>
      </div>
      {view.projectedScoreIsEstimate && (
        <p className="mt-3 text-xs text-muted-foreground">
          This projection is an estimate based on recommended priorities, not a guarantee.
        </p>
      )}
    </section>
  );
}
