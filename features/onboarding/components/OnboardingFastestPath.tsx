"use client";

import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProductionPriority } from "@/brain/production-verdict/schema";

export function OnboardingFastestPath({
  priorities,
  onContinue,
}: {
  priorities: ProductionPriority[];
  onContinue: () => void;
}) {
  const topThree = priorities.slice(0, 3);

  if (topThree.length === 0) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border/60 bg-secondary/20 p-5 text-sm text-muted-foreground">
          No production blockers detected. Your application looks close to production readiness.
        </div>
        <Button className="w-full" size="lg" onClick={onContinue}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h2 className="text-xl font-semibold">Fastest Path Forward</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Resolve these three priorities for the fastest route to production.
        </p>
      </div>

      <ol className="space-y-3 list-none">
        {topThree.map((priority) => (
          <li
            key={priority.id}
            className="rounded-xl border border-border/70 bg-[#101014]/60 p-4 flex items-start gap-3"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border/80 text-xs font-semibold">
              {priority.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug">{priority.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {priority.estimatedTimeLabel}
              </p>
            </div>
            <Zap className="h-4 w-4 text-primary shrink-0 mt-1" aria-hidden />
          </li>
        ))}
      </ol>

      <Button className="w-full" size="lg" onClick={onContinue}>
        Continue
      </Button>
    </div>
  );
}
