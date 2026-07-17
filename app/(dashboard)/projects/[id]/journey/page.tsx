import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { getTranslator } from "@/lib/i18n/server";
import { getProductionJourneyByProject } from "@/server/production-journey/service";
import { ProjectSubNav } from "@/features/production-journey/components/ProjectSubNav";
import { ProductionJourneyView } from "@/features/production-journey/components/ProductionJourneyView";
import type { Metadata } from "next";

interface JourneyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator("productionJourney");
  return { title: t("title") };
}

export default async function ProjectJourneyPage({ params }: JourneyPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { t: tp } = await getTranslator("projects");
  const { t } = await getTranslator("productionJourney");

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!project) notFound();

  const journey = await getProductionJourneyByProject(supabase, id, user.id).catch(() => null);

  const { data: latestScan } = await supabase
    .from("scans")
    .select("id")
    .eq("project_id", id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestReportHref = latestScan?.id
    ? `/projects/${id}/scans/${latestScan.id}/report`
    : undefined;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-1">
        <Link href={`/projects/${id}`}>
          <ArrowLeft className="h-4 w-4" />
          {tp("backToProjects")}
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <ProjectSubNav projectId={id} latestReportHref={latestReportHref} />

      {journey ? (
        <ProductionJourneyView journey={journey} projectId={id} />
      ) : (
        <p className="text-sm text-destructive">{t("loadFailed")}</p>
      )}
    </div>
  );
}
