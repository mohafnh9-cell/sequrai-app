import { redirect } from "next/navigation";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import Link from "next/link";
import { Suspense } from "react";
import { FolderGit2, Plus, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductionHero } from "@/features/brain/components/ProductionHero";
import { ProductionTimelineFeed } from "@/features/brain/components/ProductionTimelineFeed";
import { PortfolioVerdictCard } from "@/features/production-verdict/components/PortfolioVerdictCard";
import { FirstVerdictDashboardModal } from "@/features/onboarding/components/FirstVerdictDashboardModal";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import { organizationHasProductionVerdict } from "@/server/onboarding/has-production-verdict";
import { getTranslator } from "@/lib/i18n/server";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Production Dashboard" };

export default async function DashboardPage() {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");
  const { t } = await getTranslator("dashboard");

  const { supabase, user, organizationId } = auth;

  const { data: membership } = organizationId
    ? await supabase
        .from("organization_members")
        .select("*, organization:organizations(*)")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle()
    : await supabase
        .from("organization_members")
        .select("*, organization:organizations(*)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

  if (!membership) {
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

  const org = membership.organization as { id: string; name: string; plan: string };
  const hasVerdict = await organizationHasProductionVerdict(supabase, org.id);
  if (!hasVerdict) redirect("/onboarding");

  const brain = await buildOrgBrain(supabase, org.id);

  const { data: recentProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const projectReadiness = new Map(brain.projects.map((item) => [item.projectId, item]));

  const readyCount = brain.projects.filter((p) => p.status === "ready_to_ship").length;
  const almostReadyCount = brain.projects.filter((p) => p.status === "almost_ready").length;
  const blockedCount = brain.projects.filter(
    (p) => p.status === "not_ready" || p.blockersCount > 0
  ).length;
  const needsAnalysisCount = brain.projects.filter(
    (p) => p.status === "insufficient_data" || p.status === "analysis_failed"
  ).length;
  const scoreChanges = brain.projects.filter(
    (p) => p.scoreDelta != null && p.scoreDelta !== 0
  ).length;

  const planLabel =
    org.plan === "FREE"
      ? "Free"
      : org.plan === "BUILDER"
        ? "Builder"
        : org.plan === "STUDIO"
          ? "Studio"
          : org.plan === "AGENCY"
            ? "Agency"
            : org.plan;

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <Suspense fallback={null}>
        <FirstVerdictDashboardModal />
      </Suspense>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("overviewTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("overviewSubtitle", { org: org.name, plan: planLabel })}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/integrations">
            <Plus className="mr-2 h-4 w-4" />
            {t("firstVerdictCta")}
          </Link>
        </Button>
      </div>

      <ProductionHero orgBrain={brain} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("metrics.ready")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[#64D98B]" aria-hidden />
            <span className="text-2xl font-bold">{readyCount}</span>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("metrics.almostReady")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{almostReadyCount}</CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("metrics.blocked")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#FF5C6C]" aria-hidden />
            <span className="text-2xl font-bold">{blockedCount}</span>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("metrics.needsAnalysis")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{needsAnalysisCount}</CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("metrics.scoreChanges")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{scoreChanges}</CardContent>
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
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {!recentProjects || recentProjects.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title={t("noProjectsTitle")}
              description={t("noProjectsBody")}
              action={{ label: t("firstVerdictCta"), href: "/onboarding" }}
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
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductionTimelineFeed />
    </div>
  );
}
