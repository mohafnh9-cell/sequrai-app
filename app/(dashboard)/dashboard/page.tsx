import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import Link from "next/link";
import { Suspense } from "react";
import { FolderGit2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductionHero } from "@/features/brain/components/ProductionHero";
import { PortfolioVerdictCard } from "@/features/production-verdict/components/PortfolioVerdictCard";
import { FirstVerdictDashboardModal } from "@/features/onboarding/components/FirstVerdictDashboardModal";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import { AutopilotDashboardSection } from "@/features/autopilot/components/AutopilotDashboardSection";
import { getProductionIntelligencePreview } from "@/server/production-intelligence/service";
import { getAutopilotDashboardView } from "@/server/autopilot";
import { organizationHasProductionVerdict } from "@/server/onboarding/has-production-verdict";
import { getTranslator } from "@/lib/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Production Dashboard" };

export default async function DashboardPage() {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");
  const { t } = await getTranslator("dashboard");
  const { t: tc } = await getTranslator("common");

  const { supabase, user, organizationId } = auth;

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

  const hasVerdict = await organizationHasProductionVerdict(supabase, organizationId);
  if (!hasVerdict) redirect("/onboarding");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, plan")
    .eq("id", organizationId)
    .maybeSingle();

  if (!org) redirect("/onboarding");

  const brain = await buildOrgBrain(supabase, org.id);
  const autopilotDashboard = await getAutopilotDashboardView(supabase, org.id);

  const { data: recentProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const projectReadiness = new Map(brain.projects.map((item) => [item.projectId, item]));

  const intelligencePreviews = await Promise.all(
    (recentProjects ?? []).map(async (project) => {
      try {
        return await getProductionIntelligencePreview(supabase, project.id, user.id);
      } catch {
        return null;
      }
    })
  );
  const intelligenceByProject = new Map(
    (recentProjects ?? []).map((project, index) => [project.id, intelligencePreviews[index]])
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <Suspense fallback={null}>
        <FirstVerdictDashboardModal />
      </Suspense>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("overviewTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("overviewSubtitle")}</p>
        </div>
        <Button size="sm" variant="outline" asChild className="shrink-0">
          <Link href="/integrations">
            <Plus className="mr-2 h-4 w-4" />
            {t("connectRepository")}
          </Link>
        </Button>
      </div>

      <ProductionHero orgBrain={brain} />

      <AutopilotDashboardSection view={autopilotDashboard} />

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
              {recentProjects.map((project) => (
                <PortfolioVerdictCard
                  key={project.id}
                  projectId={project.id}
                  projectName={project.name}
                  summary={projectReadiness.get(project.id)}
                  lastActivityAt={project.last_scan_at ?? project.created_at}
                  intelligencePreview={intelligenceByProject.get(project.id) ?? null}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
