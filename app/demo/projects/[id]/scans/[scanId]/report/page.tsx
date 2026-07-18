import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductionVerdictExperience } from "@/features/production-verdict/components/ProductionVerdictExperience";
import {
  buildDemoDataset,
  getDemoProject,
} from "@/features/demo/fixtures/build-demo-dataset";
import { demoHref } from "@/features/demo/paths";
import { parseDemoScenario } from "@/features/demo/scenarios";
import { getTranslator } from "@/lib/i18n/server";

export default async function DemoProductionReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; scanId: string }>;
  searchParams: Promise<{ scenario?: string }>;
}) {
  const { id, scanId } = await params;
  const query = await searchParams;
  const scenario = parseDemoScenario(query.scenario);
  const dataset = buildDemoDataset(scenario);
  const project = getDemoProject(dataset, id);
  if (!project) notFound();

  const brain = dataset.projectBrains[id];
  const verdict = brain?.currentVerdict;
  if (!verdict) notFound();

  const { t: tp } = await getTranslator("projects");

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl">
      <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-1">
        <Link href={demoHref(`/projects/${id}`, scenario)}>
          <ArrowLeft className="h-4 w-4" />
          {tp("backToProjects")}
        </Link>
      </Button>

      <ProductionVerdictExperience
        verdict={verdict}
        projectId={id}
        scanId={scanId}
        showEngineer={false}
      />
    </div>
  );
}
