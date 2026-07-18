import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  FolderGit2,
  ExternalLink,
  Pencil,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectDeleteButton } from "@/features/projects/components/ProjectDeleteButton";
import { ProjectVerdictSummary } from "@/features/production-verdict/components/ProductionVerdictExperience";
import { buildProjectBrain } from "@/server/brain/build-project-brain";
import { getTranslator } from "@/lib/i18n/server";
import { formatLocalizedDate } from "@/lib/i18n/format";
import type { ProjectRow } from "@/types/database";
import type { Metadata } from "next";
import { ProjectSubNav } from "@/features/production-journey/components/ProjectSubNav";
import { ProductionIntelligencePanel } from "@/features/production-intelligence/components/ProductionIntelligencePanel";
import { AutopilotSection } from "@/features/autopilot/components/AutopilotSection";
import { getAutopilotProjectView } from "@/server/autopilot";
import { getProductionIntelligence } from "@/server/production-intelligence/service";

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

  let intelligence = null;
  let autopilot = null;
  try {
    [intelligence, autopilot] = await Promise.all([
      getProductionIntelligence(supabase, p.id, user.id),
      getAutopilotProjectView(supabase, p.id, user.id),
    ]);
  } catch {
    intelligence = null;
    autopilot = null;
  }

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

      {brain?.currentVerdict ? (
        <ProjectVerdictSummary
          verdict={brain.currentVerdict}
          projectId={p.id}
          latestScanHref={latestScanHref}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          {t("runFirstReview")}
        </div>
      )}

      {intelligence && (
        <ProductionIntelligencePanel
          intelligence={intelligence}
          projectId={p.id}
          latestReportHref={latestReportHref}
          compact
        />
      )}

      {autopilot && <AutopilotSection view={autopilot} />}
    </div>
  );
}
