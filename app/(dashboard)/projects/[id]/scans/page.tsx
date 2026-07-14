import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectScanOverview } from "@/features/security-scanner/components/ProjectScanOverview";
import { createClient } from "@/lib/supabase/server";

export default async function ScanHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: project, error } = await supabase
    .from("projects")
    .select("github_repo")
    .eq("id", id)
    .single();
  if (error || !project) notFound();

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
      />
    </div>
  );
}
