import Link from "next/link";
import { FolderGit2, ExternalLink, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeDate } from "@/lib/utils";
import type { ProjectRow } from "@/types/database";

interface ProjectCardProps {
  project: ProjectRow;
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

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="group">
      <Card className="border-border/50 group-hover:border-border transition-colors h-full cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <FolderGit2 className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm truncate">{project.name}</CardTitle>
              {project.framework && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {FRAMEWORK_LABELS[project.framework] ?? project.framework}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {project.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
          )}

          <div className="flex flex-wrap gap-2">
            {!project.github_repo && !project.production_url && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                No integrations yet
              </Badge>
            )}
            {project.github_repo && (
              <Badge variant="outline" className="text-xs gap-1">
                <ExternalLink className="h-2.5 w-2.5" />
                GitHub
              </Badge>
            )}
            {project.production_url && (
              <Badge variant="outline" className="text-xs gap-1">
                <ExternalLink className="h-2.5 w-2.5" />
                Live URL
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Created {formatRelativeDate(project.created_at)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
