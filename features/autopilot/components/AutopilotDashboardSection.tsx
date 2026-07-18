"use client";

import type { AutopilotDashboardView } from "@/brain/autopilot-experience";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { formatRelativeLocalized } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";

export function AutopilotDashboardSection({
  view,
}: {
  view: AutopilotDashboardView;
}) {
  const { t, locale } = useI18n("autopilotExperience");
  const relativeLabels = {
    never: t("relative.never"),
    justNow: t("relative.justNow"),
    minutesAgo: t("relative.minutesAgo"),
    hoursAgo: t("relative.hoursAgo"),
    daysAgo: t("relative.daysAgo"),
  };

  if (!view.autopilotEnabled) {
    return null;
  }

  const latestReviewLabel = view.latestAutomaticReviewAt
    ? formatRelativeLocalized(locale, view.latestAutomaticReviewAt, relativeLabels)
    : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t("dashboard.title")}
        </CardTitle>
        <CardDescription>{t("dashboard.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-0">
        <div className="rounded-lg border border-border/50 bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">{t("dashboard.monitored")}</p>
          <p className="text-2xl font-bold mt-1">{view.monitoredCount}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">{t("dashboard.waiting")}</p>
          <p className="text-2xl font-bold mt-1">{view.waitingCount}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/70 p-3">
          <p className="text-xs text-muted-foreground">{t("dashboard.approaching")}</p>
          <p className="text-2xl font-bold mt-1">{view.approachingProductionCount}</p>
        </div>
        <div className="rounded-lg border border-border/50 bg-background/70 p-3 sm:col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground">{t("dashboard.latestReview")}</p>
          <p className="text-sm font-medium mt-1">
            {latestReviewLabel ?? "—"}
          </p>
          {view.latestAutomaticReviewProjectName && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.latestReviewProject", {
                project: view.latestAutomaticReviewProjectName,
              })}
            </p>
          )}
        </div>

        {view.monitoredCount === 0 && (
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 p-4">
            <p className="text-sm text-muted-foreground">{t("dashboard.empty")}</p>
            <Button size="sm" variant="outline" asChild>
              <Link href="/integrations">{t("dashboard.connect")}</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
