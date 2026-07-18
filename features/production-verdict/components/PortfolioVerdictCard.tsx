"use client";

import Link from "next/link";
import { FolderGit2, ArrowRight, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { verdictBadgeVariant } from "@/brain/production-verdict/status-ui";
import type { ProjectBrainSummary } from "@/brain";
import type { ProductionIntelligencePreview } from "@/brain/production-intelligence/schema";
import type { VerdictStatus } from "@/brain/production-verdict/schema";
import { useI18n } from "@/lib/i18n/client";
import { formatRelativeLocalized } from "@/lib/i18n/format";
import { verdictStatusLabel } from "@/lib/i18n/verdict-copy";

export function PortfolioVerdictCard({
  projectId,
  projectName,
  summary,
  lastActivityAt,
  intelligencePreview,
}: {
  projectId: string;
  projectName: string;
  summary: ProjectBrainSummary | undefined;
  lastActivityAt: string;
  intelligencePreview?: ProductionIntelligencePreview | null;
}) {
  const { locale, t } = useI18n();
  const { t: tc } = useI18n("common");
  const { t: ti } = useI18n("productionIntelligence");
  const { t: tj } = useI18n("productionJourney");
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

  const preview = intelligencePreview;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-[#101014]/60 p-4 hover:border-border transition-colors">
      <Link
        href={`/projects/${projectId}`}
        className="flex items-center gap-3 min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
          <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{projectName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {showScore ? (
              <>
                {score}/100
                {(preview?.scoreDelta ?? summary?.scoreDelta) != null &&
                  (preview?.scoreDelta ?? summary?.scoreDelta) !== 0 && (
                  <span
                    className={
                      (preview?.scoreDelta ?? summary?.scoreDelta)! > 0
                        ? " text-[#64D98B]"
                        : " text-[#FF5C6C]"
                    }
                  >
                    {" "}
                    ({(preview?.scoreDelta ?? summary?.scoreDelta)! > 0 ? "+" : ""}
                    {preview?.scoreDelta ?? summary?.scoreDelta})
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
          {preview && (
            <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="inline-flex items-center gap-1">
                {preview.momentum === "improving" ? (
                  <TrendingUp className="h-3 w-3 text-[#64D98B]" aria-hidden />
                ) : preview.momentum === "declining" ? (
                  <TrendingDown className="h-3 w-3 text-[#FF5C6C]" aria-hidden />
                ) : (
                  <Minus className="h-3 w-3" aria-hidden />
                )}
                {ti(`momentum.${preview.momentum}`)}
              </span>
              {preview.currentFocusKey && (
                <>
                  <span aria-hidden>·</span>
                  <span>{tj(preview.currentFocusKey)}</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span className="line-clamp-1">
                {ti("projectCard.nextAction")}: {ti(preview.recommendedAction.titleKey)}
              </span>
            </p>
          )}
        </div>
      </Link>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <Badge variant={verdictBadgeVariant(status)} className="text-xs">
          {verdictStatusLabel(status, translate)}
        </Badge>
        <Link
          href={`/projects/${projectId}`}
          className="text-xs text-primary hover:underline hidden sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        >
          {ti("viewJourney")}
        </Link>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      </div>
    </div>
  );
}
