import Link from "next/link";
import { FolderGit2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductionHero } from "@/features/brain/components/ProductionHero";
import { PortfolioVerdictCard } from "@/features/production-verdict/components/PortfolioVerdictCard";
import { AutopilotDashboardSection } from "@/features/autopilot/components/AutopilotDashboardSection";
import { buildDemoDataset } from "@/features/demo/fixtures/build-demo-dataset";
import { demoHref } from "@/features/demo/paths";
import { parseDemoScenario } from "@/features/demo/scenarios";
import { getTranslator } from "@/lib/i18n/server";

export default async function DemoDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const params = await searchParams;
  const scenario = parseDemoScenario(params.scenario);
  const dataset = buildDemoDataset(scenario);
  const { t } = await getTranslator("dashboard");
  const { t: tc } = await getTranslator("common");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("overviewTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("overviewSubtitle")}</p>
        </div>
        <Button size="sm" variant="outline" disabled className="shrink-0" aria-disabled>
          <Plus className="mr-2 h-4 w-4" />
          {t("connectRepository")}
        </Button>
      </div>

      {dataset.projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={t("noProjectsTitle")}
          description={t("noProjectsBody")}
          action={{ label: t("connectRepository"), href: demoHref("/integrations", scenario) }}
        />
      ) : (
        <>
          <ProductionHero orgBrain={dataset.orgBrain} />
          <AutopilotDashboardSection view={dataset.autopilotDashboard} />
          <Card className="border-border/50">
            <CardHeader className="flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-base">{t("projectsTitle")}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{t("projectsSubtitle")}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={demoHref("/projects", scenario)} className="text-xs gap-1.5">
                  {tc("viewAll")} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {dataset.projects.map((project) => {
                  const summary = dataset.orgBrain.projects.find(
                    (item) => item.projectId === project.id
                  );
                  return (
                    <PortfolioVerdictCard
                      key={project.id}
                      projectId={project.id}
                      projectName={project.name}
                      summary={summary}
                      lastActivityAt={project.last_scan_at ?? project.created_at}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
