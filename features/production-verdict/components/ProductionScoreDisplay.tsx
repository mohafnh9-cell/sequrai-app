"use client";

import { shouldShowScore, displayScore } from "@/brain/production-verdict/status-ui";
import type { VerdictStatus } from "@/brain/production-verdict/schema";

export function ProductionScoreDisplay({
  score,
  status,
  size = "lg",
  className,
}: {
  score: number | null;
  status: VerdictStatus;
  size?: "sm" | "lg" | "xl";
  className?: string;
}) {
  const show = shouldShowScore(score, status);
  const sizeClass =
    size === "xl" ? "text-6xl" : size === "lg" ? "text-5xl" : "text-2xl";

  return (
    <div className={className} aria-label="Production Ready Score">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-1">
        Production Ready Score
      </p>
      {show ? (
        <p className={`${sizeClass} font-semibold tabular-nums tracking-tight`}>
          {displayScore(score)}
          <span className="ml-1 text-lg font-normal text-muted-foreground">/ 100</span>
        </p>
      ) : (
        <p className="text-lg font-medium text-muted-foreground">More Analysis Required</p>
      )}
    </div>
  );
}
