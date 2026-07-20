import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { FolderGit2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { PortfolioVerdictCard } from "@/features/production-verdict/components/PortfolioVerdictCard";
import { FirstVerdictDashboardModal } from "@/features/onboarding/components/FirstVerdictDashboardModal";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import { organizationHasProductionVerdict } from "@/server/onboarding/has-production-verdict";
import { getCachedServerAuthContext } from "@/lib/server/request-cache";
import { getTranslator } from "@/lib/i18n/server";
import { verdictHeadlineDisplay } from "@/brain/production-verdict/status-ui";
import { verdictStatusLabel } from "@/lib/i18n/verdict-copy";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Production Dashboard" };

import type { ProjectBrainSummary } from "@/brain";

function portfolioCounts(projects: ProjectBrainSummary[]) {
  let ready = 0;
  let notReady = 0;
  let needsAnalysis = 0;
  for (const project of projects) {
    if (project.status === "ready_to_ship" || project.status === "almost_ready") ready += 1;
    else if (project.status === "insufficient_data" || project.status === "analysis_failed") needsAnalysis += 1;
    else notReady += 1;
  }
  return { ready, notReady, needsAnalysis };
}

export default async function DashboardPage() {
  const auth = await getCachedServerAuthContext();
  if (!auth) redirect("/login");
  const { t } = await getTranslator("dashboard");
  const { t: tc } = await getTranslator("common");
  const translate = (key: string, params?: Record<string, string | number | null | undefined>) =>
    tc(key, params);

  const { supabase, organizationId } = auth;

  if (!organizationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <FolderGit2 className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold">{t("welcomeTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("welcomeBody")}</p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            <Plus className="mr-2 h-4 w-4" />
            {t("firstVerdictCta")}
          </Link>
        </Button>
      </div>
    );
  }

  const [hasVerdict, { data: recentProjects }, brain] = await Promise.all([
    organizationHasProductionVerdict(supabase, organizationId),
    supabase
      .from("projects")
      .select("id, name, created_at, last_scan_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(8),
    buildOrgBrain(supabase, organizationId),
  ]);

  if (!hasVerdict) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <FolderGit2 className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold">{t("workspaceEmptyTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("workspaceEmptyBody")}</p>
        </div>
        <Button asChild>
          <Link href="/integrations">
            <Plus className="mr-2 h-4 w-4" />
            {t("connectRepository")}
          </Link>
        </Button>
      </div>
    );
  }

  const projectReadiness = new Map(brain.projects.map((item) => [item.projectId, item]));
  const counts = portfolioCounts(brain.projects);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <Suspense fallback={null}>
        <FirstVerdictDashboardModal />
      </Suspense>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("overviewTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("overviewSubtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>{t("portfolioReady")}</CardDescription>
            <CardTitle className="text-2xl">{counts.ready}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>{t("portfolioNotReady")}</CardDescription>
            <CardTitle className="text-2xl">{counts.notReady}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardDescription>{t("portfolioNeedsAnalysis")}</CardDescription>
            <CardTitle className="text-2xl">{counts.needsAnalysis}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">{t("projectsTitle")}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{t("projectsSubtitle")}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects" className="text-xs gap-1.5">
              {tc("viewAll")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {!recentProjects || recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title={t("noProjectsTitle")}
              description={t("noProjectsBody")}
              action={{ label: t("connectRepository"), href: "/integrations" }}
            />
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => {
                const summary = projectReadiness.get(project.id);
                return (
                  <PortfolioVerdictCard
                    key={project.id}
                    projectId={project.id}
                    projectName={project.name}
                    summary={summary}
                    lastActivityAt={project.last_scan_at ?? project.created_at}
                    nextActionLabel={
                      summary
                        ? verdictHeadlineDisplay(summary.status)
                        : verdictStatusLabel("insufficient_data", translate)
                    }
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
