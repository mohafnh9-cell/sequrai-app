import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  FolderGit2,
  ExternalLink,
  Calendar,
  Pencil,
  Globe,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProjectDeleteButton } from "@/features/projects/components/ProjectDeleteButton";
import { ProjectScanOverview } from "@/features/security-scanner/components/ProjectScanOverview";
import { ProjectVerdictSummary } from "@/features/production-verdict/components/ProductionVerdictExperience";
import { buildProjectBrain } from "@/server/brain/build-project-brain";
import { SecurityActivityFeed } from "@/features/github-automation/components/SecurityActivityFeed";
import { getTranslator } from "@/lib/i18n/server";
import { formatLocalizedDate } from "@/lib/i18n/format";
import type { ProjectRow } from "@/types/database";
import type { Metadata } from "next";
import { ProjectSubNav } from "@/features/production-journey/components/ProjectSubNav";
import { ProductionJourneyPreviewCard } from "@/features/production-journey/components/ProductionJourneyPreviewCard";
import { getProductionJourneyByProject } from "@/server/production-journey/service";
import { toJourneyPreview } from "@/brain/production-journey";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .single();
  return { title: data?.name ?? "Project" };
}

const FRAMEWORK_LABELS: Record<string, string> = {
  NEXTJS: "Next.js",
  REACT: "React",
  VUE: "Vue",
  SVELTE: "SvelteKit",
  NUXT: "Nuxt",
  REMIX: "Remix",
  ASTRO: "Astro",
  OTHER: "Other",
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { locale, t } = await getTranslator("projects");

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const p = project as ProjectRow;

  const brain = await buildProjectBrain(supabase, p.id);

  const { data: latestScan } = await supabase
    .from("scans")
    .select("id")
    .eq("project_id", p.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestScanHref = latestScan?.id
    ? `/projects/${p.id}/scans/${latestScan.id}`
    : undefined;

  const latestReportHref = latestScan?.id
    ? `/projects/${p.id}/scans/${latestScan.id}/report`
    : undefined;

  let journey = null;
  try {
    journey = await getProductionJourneyByProject(supabase, p.id, user.id, { limit: 30 });
  } catch {
    journey = null;
  }
  const journeyPreview = journey ? toJourneyPreview(journey) : null;

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-1">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          {t("backToProjects")}
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary">
            <FolderGit2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {p.framework && (
                <Badge variant="secondary" className="text-xs">
                  {FRAMEWORK_LABELS[p.framework] ?? p.framework}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {t("created")} {formatLocalizedDate(locale, p.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${p.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              {t("edit")}
            </Link>
          </Button>
          <ProjectDeleteButton project={p} />
        </div>
      </div>

      <ProjectSubNav projectId={p.id} latestReportHref={latestReportHref} />

      <div className="grid gap-6">
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("projectInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {p.description && (
                <p className="text-sm text-foreground">{p.description}</p>
              )}
              {!p.description && (
                <p className="text-sm text-muted-foreground">{t("noDescription")}</p>
              )}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" /> {t("githubRepo")}
                  </span>
                  {p.github_repo ? (
                    <a
                      href={p.github_repo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate max-w-[200px] flex items-center gap-1 text-xs"
                    >
                      {p.github_repo.replace("https://github.com/", "")}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t("notConnected")}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" /> {t("productionUrl")}
                  </span>
                  {p.production_url ? (
                    <a
                      href={p.production_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate max-w-[200px] flex items-center gap-1 text-xs"
                    >
                      {p.production_url.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted-foreground text-xs">{t("notSet")}</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> {t("created")}
                  </span>
                  <span className="text-xs">{formatLocalizedDate(locale, p.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {brain?.currentVerdict ? (
        <ProjectVerdictSummary
          verdict={brain.currentVerdict}
          projectId={p.id}
          lastScanAt={brain.lastScanAt}
          webhookEnabled={brain.webhookEnabled}
          latestScanHref={latestScanHref}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          {t("runFirstReview")}
        </div>
      )}

      {journeyPreview && journey && (
        <ProductionJourneyPreviewCard
          projectId={p.id}
          preview={journeyPreview}
          timeline={journey.timeline}
        />
      )}

      <SecurityActivityFeed projectId={p.id} />

      <ProjectScanOverview
        projectId={p.id}
        repositoryConnected={Boolean(p.github_repo)}
      />
    </div>
  );
}
