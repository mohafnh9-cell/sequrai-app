"use client";

import Link from "next/link";
import { FolderGit2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/utils";
import { VERDICT_STATUS_LABELS } from "@/brain/production-verdict/schema";
import { verdictBadgeVariant } from "@/brain/production-verdict/status-ui";
import type { ProjectBrainSummary } from "@/brain";
import type { VerdictStatus } from "@/brain/production-verdict/schema";

export function PortfolioVerdictCard({
  projectId,
  projectName,
  summary,
  lastActivityAt,
}: {
  projectId: string;
  projectName: string;
  summary: ProjectBrainSummary | undefined;
  lastActivityAt: string;
}) {
  const status: VerdictStatus = summary?.status ?? "insufficient_data";
  const score = summary?.productionReady;
  const showScore = score !== null;

  return (
    <Link
      href={`/projects/${projectId}`}
      className="flex items-center justify-between rounded-xl border border-border/50 bg-[#101014]/60 p-4 hover:border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{projectName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {showScore ? (
              <>
                {score}/100
                {summary?.scoreDelta != null && summary.scoreDelta !== 0 && (
                  <span
                    className={
                      summary.scoreDelta > 0 ? " text-[#64D98B]" : " text-[#FF5C6C]"
                    }
                  >
                    {" "}
                    ({summary.scoreDelta > 0 ? "+" : ""}
                    {summary.scoreDelta})
                  </span>
                )}
                {" · "}
                {summary?.blockersCount ?? 0} blocker
                {(summary?.blockersCount ?? 0) === 1 ? "" : "s"}
              </>
            ) : (
              "More Analysis Required"
            )}{" "}
            · {formatRelativeDate(lastActivityAt)}
          </p>
          {summary?.projectedScore != null && showScore && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Projected {summary.projectedScore}/100 after priorities
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant={verdictBadgeVariant(status)} className="text-xs">
          {VERDICT_STATUS_LABELS[status]}
        </Badge>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
    </Link>
  );
}
