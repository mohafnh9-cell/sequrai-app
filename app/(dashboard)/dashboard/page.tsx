import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Shield,
  FolderGit2,
  ShieldAlert,
  Activity,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { formatRelativeDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get organization membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // No org → prompt setup
  if (!membership) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold">Welcome to SequrAI</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your organization to start securing your AI-built applications.
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

  // Fetch projects count
  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", org.id);

  // Fetch recent projects
  const { data: recentProjects } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentScans } = await supabase
    .from("scans")
    .select(
      "repository_id, security_score, critical_count, findings_count, status, completed_at, created_at"
    )
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const latestCompletedByRepository = new Map<
    string,
    { security_score: number | null; critical_count: number }
  >();
  for (const scan of recentScans ?? []) {
    if (
      scan.status === "completed" &&
      !latestCompletedByRepository.has(scan.repository_id)
    ) {
      latestCompletedByRepository.set(scan.repository_id, scan);
    }
  }
  const scored = [...latestCompletedByRepository.values()].filter(
    (scan) => scan.security_score !== null
  );
  const averageScore =
    scored.length > 0
      ? Math.round(
          scored.reduce((total, scan) => total + (scan.security_score ?? 0), 0) /
            scored.length
        )
      : null;
  const criticalIssues = [...latestCompletedByRepository.values()].reduce(
    (total, scan) => total + scan.critical_count,
    0
  );
  const recentActivity = recentScans?.length ?? 0;

  const totalProjects = projectCount ?? 0;
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
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
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

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Security Score"
          value={averageScore ?? "—"}
          subtitle={averageScore === null ? "No scans yet" : "Average latest score"}
          icon={Shield}
          valueColor={averageScore === null ? "text-muted-foreground" : undefined}
        />
        <MetricCard
          title="Projects"
          value={totalProjects}
          subtitle={`${totalProjects} connected`}
          icon={FolderGit2}
        />
        <MetricCard
          title="Critical Issues"
          value={criticalIssues}
          subtitle="Across latest scans"
          icon={ShieldAlert}
          valueColor={criticalIssues > 0 ? "text-red-500" : "text-emerald-500"}
        />
        <MetricCard
          title="Recent Activity"
          value={recentActivity}
          subtitle="Latest recorded scans"
          icon={Activity}
        />
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects */}
        <Card className="border-border/50">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Projects</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Your connected projects
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
                {recentProjects.map((project) => (
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
                    <Badge variant="outline" className="text-xs shrink-0 ml-2">
                      Ready
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Critical Issues */}
        <Card className="border-border/50">
          <CardHeader className="flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-base">Critical Issues</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Requires immediate attention
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {criticalIssues > 0 ? (
              <EmptyState
                icon={ShieldAlert}
                title={`${criticalIssues} critical ${
                  criticalIssues === 1 ? "issue" : "issues"
                } detected`}
                description="Open a scanned project to review the findings requiring immediate attention."
                action={{ label: "Review projects", href: "/projects" }}
              />
            ) : (
              <EmptyState
                icon={Shield}
                title="No critical issues"
                description="Run a scan to detect vulnerabilities in your projects."
                variant="success"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Coming soon modules */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ComingSoonCard
          icon={Sparkles}
          title="AI Fixes"
          description="Auto-generated security patches using Claude AI."
        />
        <ComingSoonCard
          icon={Clock}
          title="Timeline"
          description="Security history and scan activity over time."
        />
        <ComingSoonCard
          icon={Activity}
          title="AI Recommendations"
          description="Proactive security advice for your stack."
        />
      </div>
    </div>
  );
}

function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-5 space-y-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Coming soon
      </Badge>
    </div>
  );
}
