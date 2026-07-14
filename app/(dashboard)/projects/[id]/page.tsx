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
import { formatDate } from "@/lib/utils";
import type { ProjectRow } from "@/types/database";
import type { Metadata } from "next";

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

  const { data: project, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !project) notFound();

  const p = project as ProjectRow;

  return (
    <div className="p-6 space-y-8 max-w-6xl">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-1">
        <Link href="/projects">
          <ArrowLeft className="h-4 w-4" />
          Projects
        </Link>
      </Button>

      {/* Header */}
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
                Created {formatDate(p.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${p.id}/edit`}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <ProjectDeleteButton project={p} />
        </div>
      </div>

      {/* Details */}
      <div className="grid gap-6">
        {/* Description + links */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Project Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {p.description && (
                <p className="text-sm text-foreground">{p.description}</p>
              )}
              {!p.description && (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <GitBranch className="h-3.5 w-3.5" /> GitHub repo
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
                    <span className="text-muted-foreground text-xs">Not connected</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5" /> Production URL
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
                    <span className="text-muted-foreground text-xs">Not set</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" /> Created
                  </span>
                  <span className="text-xs">{formatDate(p.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <ProjectScanOverview
        projectId={p.id}
        repositoryConnected={Boolean(p.github_repo)}
      />
    </div>
  );
}
