"use client";

import Link from "next/link";
import { FolderGit2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { verdictBadgeVariant } from "@/brain/production-verdict/status-ui";
import type { ProjectBrainSummary } from "@/brain";
import { useI18n } from "@/lib/i18n/client";
import { formatRelativeLocalized } from "@/lib/i18n/format";
import { verdictStatusLabel } from "@/lib/i18n/verdict-copy";
import { useDemoNavigation } from "@/features/demo/use-demo-navigation";

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
  const { href } = useDemoNavigation();
  const projectHref = href(`/projects/${projectId}`);
  const status = summary?.status ?? "insufficient_data";
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
      href={projectHref}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/40 px-4 py-4 transition-all duration-200 hover:border-border hover:bg-card/70 hover:shadow-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/80">
          <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{projectName}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge variant={verdictBadgeVariant(status)} className="text-[10px] uppercase tracking-wide">
              {verdictStatusLabel(status, translate)}
            </Badge>
            {showScore && (
              <span className="text-xs text-muted-foreground tabular-nums">{score}/100</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatRelativeLocalized(locale, lastActivityAt, dateLabels)}
          </p>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}
