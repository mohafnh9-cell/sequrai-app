import { DemoIntegrationsPreview } from "@/features/demo/components/DemoIntegrationsPreview";
import { buildDemoDataset } from "@/features/demo/fixtures/build-demo-dataset";
import { parseDemoScenario } from "@/features/demo/scenarios";

export default async function DemoIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const params = await searchParams;
  const scenario = parseDemoScenario(params.scenario);
  const dataset = buildDemoDataset(scenario);

  return <DemoIntegrationsPreview githubConnected={dataset.githubConnected} />;
}
