import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Rocket,
  FolderGit2,
  ShieldAlert,
  Activity,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { DashboardSecurityIntelligence } from "@/features/ai-security-engine/components/DashboardSecurityIntelligence";
import { SecurityActivityFeed } from "@/features/github-automation/components/SecurityActivityFeed";
import { buildOrgBrain } from "@/server/brain/build-org-brain";
import { formatRelativeDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

function readinessBadge(score: number | null, blockers: number) {
  if (score === null) return { label: "Not scanned", variant: "outline" as const };
  if (blockers > 0) return { label: `${blockers} blocker${blockers === 1 ? "" : "s"}`, variant: "destructive" as const };
  if (score >= 85) return { label: "Ready", variant: "default" as const };
  if (score >= 70) return { label: `${score}%`, variant: "secondary" as const };
  return { label: `${score}%`, variant: "outline" as const };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold">Welcome to SequrAI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your organization to check if your AI-built apps are production ready.
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

  const org = membership.organization as {
    id: string;
    name: string;
    plan: string;
  };

  const brain = await buildOrgBrain(supabase, org.id);

  const { data: recentProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const totalProjects = brain.projects.length;
  const totalBlockers = brain.projects.reduce((sum, p) => sum + p.blockersCount, 0);
  const recentActivity = brain.recentActivity.length;
  const averageProductionReady = brain.averageProductionReady;

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

  const projectReadiness = new Map(
    brain.projects.map((item) => [item.projectId, item])
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title="Dashboard"
        description={`${org.name} · ${planLabel} plan`}
        action={
          <Button size="sm" asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Production Ready Score"
          value={averageProductionReady ?? "—"}
          subtitle={
            averageProductionReady === null
              ? "Run an analysis to get your score"
              : "Average across projects"
          }
          icon={Rocket}
          valueColor={
            averageProductionReady === null
              ? "text-muted-foreground"
              : averageProductionReady >= 85
                ? "text-emerald-500"
                : averageProductionReady >= 70
                  ? "text-amber-500"
                  : "text-red-500"
          }
        />
        <MetricCard
          title="Projects"
          value={totalProjects}
          subtitle={`${totalProjects} connected`}
          icon={FolderGit2}
        />
        <MetricCard
          title="Blockers"
          value={totalBlockers}
          subtitle="Must fix before production"
          icon={ShieldAlert}
          valueColor={totalBlockers > 0 ? "text-red-500" : "text-emerald-500"}
        />
        <MetricCard
          title="Recent Activity"
          value={recentActivity}
          subtitle="Latest production events"
          icon={Activity}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Projects</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Production readiness by project
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
                description="Connect your GitHub repos or add a project manually."
                action={{ label: "Connect GitHub", href: "/integrations" }}
              />
            ) : (
              <div className="space-y-2">
                {recentProjects.map((project) => {
                  const readiness = projectReadiness.get(project.id);
                  const badge = readinessBadge(
                    readiness?.productionReady ?? null,
                    readiness?.blockersCount ?? 0
                  );
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
                      <Badge variant={badge.variant} className="text-xs shrink-0 ml-2">
                        {badge.label}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Blockers</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Issues that block production deployment
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {totalBlockers > 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title={`${totalBlockers} blocker${totalBlockers === 1 ? "" : "s"} across projects`}
                description="Open a project to review what must be fixed before going to production."
                action={{ label: "Review projects", href: "/projects" }}
              />
            ) : (
              <EmptyState
                icon={Rocket}
                title="No blockers detected"
                description="Run a production readiness check on your projects to find deployment blockers."
                variant="success"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <DashboardSecurityIntelligence />

      <SecurityActivityFeed />
    </div>
  );
}
