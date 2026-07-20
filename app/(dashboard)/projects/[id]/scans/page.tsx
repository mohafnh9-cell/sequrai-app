import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectScanOverview } from "@/features/security-scanner/components/ProjectScanOverview";
import { getCachedServerAuthContext } from "@/lib/server/request-cache";
import { getProjectReviewUiContext } from "@/server/projects/review-ui-context";

export default async function ScanHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const auth = await getCachedServerAuthContext();
  if (!auth) redirect("/login");

  const { data: project, error } = await auth.supabase
    .from("projects")
    .select("github_repo")
    .eq("id", id)
    .single();
  if (error || !project) notFound();

  const reviewContext = await getProjectReviewUiContext(auth.supabase, id);
  if (!reviewContext) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={`/projects/${id}`}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to project
        </Link>
      </Button>
      <ProjectScanOverview
        projectId={id}
        repositoryConnected={Boolean(project.github_repo)}
        reviewContext={reviewContext}
      />
    </div>
  );
}
