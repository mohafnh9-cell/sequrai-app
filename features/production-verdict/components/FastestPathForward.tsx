"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProductionPriority } from "@/brain/production-verdict/schema";
import { trackEvent } from "@/lib/analytics/track";

function severityLabel(severity: ProductionPriority["severity"]) {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function ProductionPriorityItem({
  priority,
  onReview,
}: {
  priority: ProductionPriority;
  onReview?: () => void;
}) {
  return (
    <li className="group relative rounded-xl border border-border/70 bg-[#101014]/60 p-4 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 text-xs font-semibold">
              {priority.rank}
            </span>
            <h4 className="text-base font-medium leading-snug">{priority.title}</h4>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Why it matters
            </p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{priority.reason}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {priority.category}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Technical severity: {severityLabel(priority.severity)}
            </Badge>
          </div>

          {priority.affectedFiles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Affected:{" "}
              <code className="text-foreground/90">
                {priority.affectedFiles.slice(0, 3).join(", ")}
                {priority.affectedFiles.length > 3
                  ? ` +${priority.affectedFiles.length - 3} more`
                  : ""}
              </code>
            </p>
          )}
        </div>

        <div className="shrink-0 space-y-2 text-sm md:text-right md:min-w-[140px]">
          <div>
            <p className="text-xs text-muted-foreground">Estimated time</p>
            <p className="font-medium">{priority.estimatedTimeLabel}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Estimated improvement</p>
            <p className="font-medium text-[#64D98B]">+{priority.projectedScoreImpact} points</p>
          </div>
          {onReview && (
            <button
              type="button"
              onClick={() => {
                trackEvent("priority_opened", { priorityId: priority.id, rank: priority.rank });
                onReview();
              }}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              Review fix
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      <p className="mt-4 text-sm border-t border-border/50 pt-3 text-foreground/90">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground mr-2">
          Action
        </span>
        {priority.recommendedAction}
      </p>
    </li>
  );
}

export function FastestPathForward({
  priorities,
  onReviewPriority,
}: {
  priorities: ProductionPriority[];
  onReviewPriority?: (priority: ProductionPriority) => void;
}) {
  if (priorities.length === 0) return null;

  return (
    <section aria-labelledby="fastest-path-heading" className="space-y-4">
      <div>
        <h2 id="fastest-path-heading" className="text-lg font-semibold tracking-tight">
          Fastest Path Forward
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Resolve these priorities in order for the fastest route to production.
        </p>
      </div>
      <ol className="space-y-3 list-none">
        {priorities.slice(0, 3).map((priority) => (
          <ProductionPriorityItem
            key={priority.id}
            priority={priority}
            onReview={onReviewPriority ? () => onReviewPriority(priority) : undefined}
          />
        ))}
      </ol>
    </section>
  );
}
