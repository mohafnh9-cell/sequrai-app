"use client";

import Link from "next/link";
import { FolderGit2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  nextActionLabel,
}: {
  projectId: string;
  projectName: string;
  summary: ProjectBrainSummary | undefined;
  lastActivityAt: string;
  nextActionLabel?: string;
}) {
  const { locale, t } = useI18n();
  const { t: tc } = useI18n("common");
  const { t: tp } = useI18n("projects");
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
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-[#101014]/60 p-4 hover:border-border transition-colors">
      <Link
        href={projectHref}
        className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
            <FolderGit2 className="h-4 w-4 text-muted-foreground" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{projectName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={verdictBadgeVariant(status)} className="text-xs">
                {verdictStatusLabel(status, translate)}
              </Badge>
              {showScore && <span className="text-xs text-muted-foreground">{score}/100</span>}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {tp("nextActionLabel")}: {nextActionLabel ?? verdictStatusLabel(status, translate)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatRelativeLocalized(locale, lastActivityAt, dateLabels)}
            </p>
          </div>
        </div>
      </Link>
      <Button variant="outline" size="sm" asChild className="shrink-0">
        <Link href={projectHref}>
          {tp("openProject")}
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
}
