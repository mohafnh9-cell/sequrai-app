"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ProductionVerdictHero } from "@/features/production-verdict/components/ProductionVerdictHero";
import { verdictExperienceFromVerdict } from "@/brain/production-verdict/experience-view";
import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";

export function OnboardingVerdictReveal({
  verdict,
  onContinue,
}: {
  verdict: ProductionVerdictV1;
  onContinue: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const view = verdictExperienceFromVerdict(verdict);

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealed(true), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const blockerLine =
    view.blockersCount > 0
      ? `Your latest review introduced ${view.blockersCount} Production Blocker${view.blockersCount === 1 ? "" : "s"}.`
      : view.statusMessage;

  return (
    <div className="space-y-6">
      <div
        className={`transition-all duration-700 ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <ProductionVerdictHero verdict={verdict} view={view} />

        <div className="mt-4 rounded-xl border border-border/60 bg-secondary/20 p-4 text-sm space-y-2">
          <p>{blockerLine}</p>
          {view.estimatedFixMinutes > 0 && view.status !== "ready_to_ship" && (
            <p>
              Estimated time to production:{" "}
              <strong>{view.estimatedFixMinutes} minutes</strong>.
            </p>
          )}
          {view.projectedScore != null && view.showScore && (
            <p>
              Projected Score: <strong>{view.projectedScore} / 100</strong>
            </p>
          )}
        </div>
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={onContinue}
        disabled={!revealed}
      >
        Review Fastest Path Forward
      </Button>
    </div>
  );
}
