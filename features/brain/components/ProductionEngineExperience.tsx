"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductionRoadmapPanel } from "@/features/brain/components/ProductionRoadmapPanel";
import type { OrgBrainSnapshot } from "@/brain";

type IntelligencePayload = {
  latestReport?: {
    executive_summary?: string;
    coach_tip?: string;
    security_score?: number;
  } | null;
  coachTip?: string | null;
};

export function ProductionEngineExperience() {
  const [data, setData] = useState<IntelligencePayload | null>(null);
  const [brain, setBrain] = useState<OrgBrainSnapshot | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/security-intelligence", { cache: "no-store" }).then((res) => res.json()),
      fetch("/api/brain/organization", { cache: "no-store" }).then((res) =>
        res.ok ? res.json() : null
      ),
    ])
      .then(([intelligence, brainBody]) => {
        setData(intelligence);
        setBrain(brainBody?.brain ?? null);
      })
      .catch(() => {
        setData(null);
        setBrain(null);
      });
  }, []);

  if (!brain && !data) return null;

  const score = brain?.averageProductionReady ?? data?.latestReport?.security_score ?? null;
  const projected =
    brain?.productionRoadmap.projectedScore ??
    (score !== null ? Math.min(100, score + 37) : null);

  const engineerCopy =
    score === null
      ? "I have not analyzed your portfolio yet. Connect a project and run a production readiness check to get started."
      : projected !== null && projected > (score ?? 0)
        ? `I analyzed your projects. Your portfolio is currently ${score}% production ready. If you implement the Production Roadmap below, your Production Ready Score will increase to ${projected}%.`
        : `I analyzed your projects. Your portfolio is currently ${score ?? "—"}% production ready. Focus on the highest-impact improvements in your Production Roadmap.`;

  const estimatedMinutes =
    brain?.productionRoadmap.totalMinutes ?? brain?.totalEstimatedMinutes ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-primary" />
              AI Production Engineer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{data?.latestReport?.executive_summary ?? engineerCopy}</p>
            {estimatedMinutes > 0 && score !== null && (
              <p className="text-muted-foreground">
                Estimated implementation time: <strong>{estimatedMinutes} minutes</strong>.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Production Ready {score ?? "—"}/100</Badge>
              {projected !== null && score !== null && projected > score && (
                <Badge variant="secondary">Projected {projected}/100</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Recommended next action
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              {data?.coachTip ??
                data?.latestReport?.coach_tip ??
                "Start with priority 1 on your fastest path forward before shipping to production."}
            </p>
          </CardContent>
        </Card>
      </div>

      {brain?.productionRoadmap && (
        <ProductionRoadmapPanel roadmap={brain.productionRoadmap} />
      )}

      {!brain?.productionRoadmap?.items.length && (
        <Card className="border-dashed">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Complete a production check and run{" "}
            <Link href="/projects" className="text-primary underline underline-offset-2">
              Generate production plan
            </Link>{" "}
            on a scan report to activate your AI Production Engineer.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
