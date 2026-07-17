"use client";

import Link from "next/link";
import { FolderGit2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { verdictBadgeVariant } from "@/brain/production-verdict/status-ui";
import type { ProjectBrainSummary } from "@/brain";
import type { VerdictStatus } from "@/brain/production-verdict/schema";
import { useI18n } from "@/lib/i18n/client";
import { formatRelativeLocalized } from "@/lib/i18n/format";
import { verdictStatusLabel } from "@/lib/i18n/verdict-copy";

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
  const { locale, t } = useI18n();
  const { t: tc } = useI18n("common");
  const status: VerdictStatus = summary?.status ?? "insufficient_data";
  const score = summary?.productionReady;
  const showScore = score !== null;
  const translate = (key: string, params?: Record<string, string | number | null | undefined>) =>
    t(key, params);

  const dateLabels = {
    never: tc("never"),
    justNow: tc("justNow"),
    minutesAgo: tc("minutesAgo"),
    hoursAgo: tc("hoursAgo"),
    daysAgo: tc("daysAgo"),
  };

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
                {t("verdict.productionBlocker", { count: summary?.blockersCount ?? 0 })}
              </>
            ) : (
              verdictStatusLabel("insufficient_data", translate)
            )}{" "}
            · {formatRelativeLocalized(locale, lastActivityAt, dateLabels)}
          </p>
          {summary?.projectedScore != null && showScore && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("verdict.projectedScore")} {summary.projectedScore}/100{" "}
              {t("verdict.afterPriorities")}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant={verdictBadgeVariant(status)} className="text-xs">
          {verdictStatusLabel(status, translate)}
        </Badge>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
    </Link>
  );
}
