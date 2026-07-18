"use client";

import { useRouter, usePathname } from "next/navigation";
import { DEMO_SCENARIOS, type DemoScenarioId } from "../scenarios";
import { demoHref } from "../paths";

export function DemoScenarioSwitcher({ currentScenario }: { currentScenario: DemoScenarioId }) {
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (scenarioId: DemoScenarioId) => {
    const demoPath = pathname.startsWith("/demo") ? pathname : `/demo/dashboard`;
    router.push(demoHref(demoPath.replace(/\?.*$/, ""), scenarioId));
  };

  return (
    <label className="inline-flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Scenario</span>
      <select
        value={currentScenario}
        onChange={(event) => onChange(event.target.value as DemoScenarioId)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        aria-label="Demo scenario"
      >
        {DEMO_SCENARIOS.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.label}
          </option>
        ))}
      </select>
    </label>
  );
}
