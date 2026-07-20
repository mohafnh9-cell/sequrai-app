import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FolderGit2,
  ExternalLink,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectVerdictSummary } from "@/features/production-verdict/components/ProductionVerdictExperience";
import { AnalyzeProjectButton } from "@/features/projects/components/AnalyzeProjectButton";
import { ProjectSubNav } from "@/features/production-journey/components/ProjectSubNav";
import { ProductionIntelligencePanel } from "@/features/production-intelligence/components/ProductionIntelligencePanel";
import { buildProjectBrain } from "@/server/brain/build-project-brain";
import { getProjectReviewUiContext } from "@/server/projects/review-ui-context";
import { getCachedServerAuthContext } from "@/lib/server/request-cache";
import { getProductionIntelligence } from "@/server/production-intelligence/service";
import { getTranslator } from "@/lib/i18n/server";
import { fixPromptContextFromScan } from "@/features/production-verdict/fix-prompt-context";
import type { ProjectRow } from "@/types/database";
import type { Metadata } from "next";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ connected?: string; reviewComplete?: string }>;
}

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const auth = await getCachedServerAuthContext();
  if (!auth?.organizationId) return { title: "Project" };
  const { data } = await auth.supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();
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
  searchParams,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const auth = await getCachedServerAuthContext();
  if (!auth) redirect("/login");

  const { t } = await getTranslator("projects");

  const { data: project, error } = await auth.supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const p = project as ProjectRow;

  const [brain, reviewContext, latestScanResult, intelligence] = await Promise.all([
    buildProjectBrain(auth.supabase, p.id),
    getProjectReviewUiContext(auth.supabase, p.id),
    auth.supabase
      .from("scans")
      .select("id, detected_stack")
      .eq("project_id", p.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getProductionIntelligence(auth.supabase, p.id, auth.user.id).catch(() => null),
  ]);

  if (!reviewContext) notFound();

  const latestScan = latestScanResult.data;
  const latestScanHref = latestScan?.id ? `/projects/${p.id}/scans/${latestScan.id}` : undefined;
  const latestReportHref = latestScan?.id
    ? `/projects/${p.id}/scans/${latestScan.id}/report`
    : undefined;

  const fixPromptContext = brain?.currentVerdict
    ? fixPromptContextFromScan({
        projectName: p.name,
        detectedStack: latestScan?.detected_stack,
        framework: p.framework,
        currentVerdictStatus: brain.currentVerdict.status,
        currentScore: brain.currentVerdict.score,
      })
    : undefined;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-1">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          {t("backToProjects")}
        </Link>
      </Button>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary">
            <FolderGit2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{p.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {p.framework && (
                <Badge variant="secondary" className="text-xs">
                  {FRAMEWORK_LABELS[p.framework] ?? p.framework}
                </Badge>
              )}
              {p.github_repo && (
                <a
                  href={p.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate max-w-[240px]"
                >
                  <GitBranch className="h-3 w-3 shrink-0" />
                  {p.github_repo.replace("https://github.com/", "")}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {query.connected === "1" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">{t("connectedGuidanceTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("connectedGuidanceBody")}</p>
        </div>
      )}

      {query.reviewComplete === "1" && brain?.currentVerdict && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm font-medium">{t("reviewCompleteGuidanceTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("reviewCompleteGuidanceBody")}</p>
        </div>
      )}

      <ProjectSubNav projectId={p.id} latestReportHref={latestReportHref} />

      {brain?.currentVerdict ? (
        <>
          {reviewContext.isStale && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-100/90">
              {t("latestCommitNotReviewedBanner")}
            </div>
          )}
          <ProjectVerdictSummary
            verdict={brain.currentVerdict}
            projectId={p.id}
            latestScanHref={latestScanHref}
          />
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">{t("notAnalyzedYet")}</p>
        </div>
      )}

      <AnalyzeProjectButton projectId={p.id} initialContext={reviewContext} />

      {brain?.currentVerdict?.topPriorities[0] && (
        <div className="rounded-xl border border-border/50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("fixThisFirst")}
          </p>
          <p className="mt-2 text-sm font-medium">{brain.currentVerdict.topPriorities[0].title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {brain.currentVerdict.topPriorities[0].summary}
          </p>
        </div>
      )}

      {intelligence && (
        <details className="rounded-xl border border-border/50 p-4 group">
          <summary className="cursor-pointer text-sm font-medium list-none [&::-webkit-details-marker]:hidden">
            {t("secondaryDetails")}
          </summary>
          <div className="mt-4">
            <ProductionIntelligencePanel
              intelligence={intelligence}
              projectId={p.id}
              latestReportHref={latestReportHref}
              compact
              topPriority={brain?.currentVerdict?.topPriorities[0]}
              fixPromptContext={fixPromptContext}
            />
          </div>
        </details>
      )}
    </div>
  );
}
