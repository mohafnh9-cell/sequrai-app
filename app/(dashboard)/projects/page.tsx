import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import { Plus, FolderGit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ProjectCard } from "@/features/projects/components/ProjectCard";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import type { ProjectRow } from "@/types/database";
import type { ProjectProductionStatus } from "@/brain";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");
  if (!auth.organizationId) redirect("/onboarding");

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
        title="Projects"
        description={`${projectList.length} project${projectList.length !== 1 ? "s" : ""} · production status at a glance`}
        action={
          <Button size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Link>
          </Button>
        }
      />

      {projectList.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title="No projects yet"
          description="Connect your first project to analyze production readiness and know when you can deploy."
          action={{ label: "Add your first project", href: "/projects/new" }}
          className="py-20"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectList.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              productionStatus={
                (statusByProject.get(project.id) ?? "not_scanned") as ProjectProductionStatus
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
