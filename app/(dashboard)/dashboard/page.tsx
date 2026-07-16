import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import { FolderGit2, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProductionEngineExperience } from "@/features/brain/components/ProductionEngineExperience";
import { ProductionHero } from "@/features/brain/components/ProductionHero";
import { ProductionTimelineFeed } from "@/features/brain/components/ProductionTimelineFeed";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import { PROJECT_STATUS_LABELS, getProjectStatusBadgeVariant } from "@/brain";
import { formatRelativeDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Production Dashboard" };

export default async function DashboardPage() {
  const auth = await getServerAuthContext();
  if (!auth) redirect("/login");

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
          <h1 className="text-2xl font-bold">Welcome to SequrAI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your Senior Production & Security Engineer — know if your app is ready to deploy.
          </p>
        </div>
        <Button asChild>
          <Link href="/onboarding">
            <Plus className="mr-2 h-4 w-4" />
            Set up organization
          </Link>
        </Button>
      </div>
    );
  }

  const org = membership.organization as { id: string; name: string; plan: string };
  const brain = await buildOrgBrain(supabase, org.id);

  const { data: recentProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const projectReadiness = new Map(brain.projects.map((item) => [item.projectId, item]));

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Production Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {org.name} · {planLabel} plan · Senior Production Engineer active
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            New project
          </Link>
        </Button>
      </div>

      <ProductionHero
        score={brain.averageProductionReady}
        blockersCount={brain.totalBlockers}
        estimatedMinutes={brain.totalEstimatedMinutes}
        dimensions={brain.averageDimensions}
      />

      <ProductionEngineExperience />

      <Card className="border-border/50">
        <CardHeader className="flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-base">Your Projects</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Can you deploy? Status at a glance.
            </CardDescription>
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
              title="No projects yet"
              description="Connect your GitHub repos to analyze production readiness."
              action={{ label: "Connect GitHub", href: "/integrations" }}
            />
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => {
                const readiness = projectReadiness.get(project.id);
                const status = readiness?.status ?? "not_scanned";
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between rounded-md border border-border/50 bg-secondary/20 p-3 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                        <FolderGit2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.framework ?? "No framework"} ·{" "}
                          {formatRelativeDate(project.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={getProjectStatusBadgeVariant(status)}
                      className="text-xs shrink-0 ml-2"
                    >
                      {PROJECT_STATUS_LABELS[status]}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ProductionTimelineFeed />
    </div>
  );
}
