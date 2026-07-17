import Link from "next/link";
import { FolderGit2, ExternalLink, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTranslator } from "@/lib/i18n/server";
import { formatRelativeLocalized } from "@/lib/i18n/format";
import { verdictStatusLabel } from "@/lib/i18n/verdict-copy";
import { verdictBadgeVariant } from "@/brain/production-verdict/status-ui";
import type { VerdictStatus } from "@/brain/production-verdict/schema";
import type { ProjectRow } from "@/types/database";

interface ProjectCardProps {
  project: ProjectRow;
  verdictStatus?: VerdictStatus;
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

export async function ProjectCard({
  project,
  verdictStatus = "insufficient_data",
}: ProjectCardProps) {
  const { locale, t } = await getTranslator("projects");
  const { t: tc } = await getTranslator("common");
  const { t: tAll } = await getTranslator();

  const dateLabels = {
    never: tc("never"),
    justNow: tc("justNow"),
    minutesAgo: tc("minutesAgo"),
    hoursAgo: tc("hoursAgo"),
    daysAgo: tc("daysAgo"),
  };

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
            <Badge variant={verdictBadgeVariant(verdictStatus)} className="text-xs">
              {verdictStatusLabel(verdictStatus, (key, params) => tAll(key, params))}
            </Badge>
            {!project.github_repo && !project.production_url && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {t("noIntegrationsYet")}
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
                {t("liveUrl")}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {t("created")}{" "}
              {formatRelativeLocalized(locale, project.created_at, dateLabels)}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
