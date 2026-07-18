"use client";

import Link from "next/link";
import { FlaskConical, ArrowLeft } from "lucide-react";
import { DemoScenarioSwitcher } from "./DemoScenarioSwitcher";
import { useDemoNavigation } from "../use-demo-navigation";

export function DemoBanner() {
  const { scenario } = useDemoNavigation();

  return (
    <div className="border-b border-primary/20 bg-primary/5 px-4 py-2">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <FlaskConical className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            <span className="font-medium text-foreground">Demo data</span> — fictional read-only
            preview. No real repositories, tokens, or production data.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DemoScenarioSwitcher currentScenario={scenario} />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Exit demo
          </Link>
        </div>
      </div>
    </div>
  );
}
