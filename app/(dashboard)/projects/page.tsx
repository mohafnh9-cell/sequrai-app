import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import { Plus, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import { organizationHasProductionVerdict } from "@/server/onboarding/has-production-verdict";
import { getTranslator } from "@/lib/i18n/server";
import type { ProjectRow } from "@/types/database";
import type { VerdictStatus } from "@/brain/production-verdict/schema";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator("projects");
  return { title: t("title") };
}

export default async function ProjectsPage() {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");
  if (!auth.organizationId) redirect("/onboarding");

  const hasVerdict = await organizationHasProductionVerdict(auth.supabase, auth.organizationId);
  if (!hasVerdict) redirect("/onboarding");

  const { t } = await getTranslator("projects");

  const { data: projects } = await auth.supabase
    .from("projects")
    .select("*")
    .eq("organization_id", auth.organizationId)
    .order("created_at", { ascending: false });

  const brain = await buildOrgBrain(auth.supabase, auth.organizationId);
  const statusByProject = new Map(
    brain.projects.map((item) => [item.projectId, item.status])
  );

  const projectList = (projects ?? []) as ProjectRow[];

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title={t("title")}
        description={t("subtitle", { count: projectList.length })}
        action={
          <Button size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newProject")}
            </Link>
          </Button>
        }
      />

      {projectList.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={t("noProjectsTitle")}
          description={t("noProjectsBody")}
          action={{ label: t("firstVerdictCta"), href: "/onboarding" }}
          className="py-20"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              verdictStatus={(statusByProject.get(project.id) ?? "insufficient_data") as VerdictStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
