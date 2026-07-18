export const DEMO_SCENARIOS = [
  {
    id: "ready-to-ship",
    label: "Ready to Ship",
    description: "Production Verdict shows a shippable project with Continuous Reviews up to date.",
  },
  {
    id: "not-ready",
    label: "Not Ready to Ship",
    description: "Blockers prevent deployment with clear priorities.",
  },
  {
    id: "more-analysis-required",
    label: "More Analysis Required",
    description: "Repository connected but coverage is too low for a score.",
  },
  {
    id: "analysis-failed",
    label: "Analysis Failed",
    description: "Latest Production Review did not complete successfully.",
  },
  {
    id: "review-in-progress",
    label: "Review in Progress",
    description: "Continuous Reviews is processing the latest push.",
  },
  {
    id: "github-disconnected",
    label: "GitHub Disconnected",
    description: "Project exists without a connected repository.",
  },
  {
    id: "no-projects",
    label: "No Projects",
    description: "Empty portfolio before the first repository is connected.",
  },
  {
    id: "first-verdict",
    label: "First Production Verdict",
    description: "Just completed the first Production Review.",
  },
] as const;

export type DemoScenarioId = (typeof DEMO_SCENARIOS)[number]["id"];

export const DEFAULT_DEMO_SCENARIO: DemoScenarioId = "ready-to-ship";

export function parseDemoScenario(value: string | null | undefined): DemoScenarioId {
  if (value && DEMO_SCENARIOS.some((scenario) => scenario.id === value)) {
    return value as DemoScenarioId;
  }
  return DEFAULT_DEMO_SCENARIO;
}

export function demoScenarioLabel(id: DemoScenarioId): string {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id)?.label ?? id;
}
