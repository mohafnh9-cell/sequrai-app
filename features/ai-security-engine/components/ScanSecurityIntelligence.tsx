"use client";

import { useCallback, useEffect, useState } from "react";
import { Brain, Loader2, Sparkles, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Intelligence = {
  report?: {
    status?: string;
    executive_summary?: string;
    coach_tip?: string;
    security_score?: number;
    risk_score?: number;
    priority_level?: string;
  } | null;
  priorities?: Array<{
    rank: number;
    title: string;
    description: string;
    estimated_minutes?: number;
    security_impact?: string;
  }>;
  recommendations?: Array<{
    title: string;
    description: string;
    estimated_minutes?: number;
    priority?: string;
  }>;
  insights?: Array<{ title: string; body: string }>;
  fixes?: Array<{ finding_id: string; explanation_simple?: string; cursor_prompt?: string }>;
  risk?: { risk_score?: number; priority_level?: string } | null;
};

export function ScanSecurityIntelligence({
  scanId,
  scanCompleted,
}: {
  scanId: string;
  scanCompleted: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [intelligence, setIntelligence] = useState<Intelligence | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/scans/${scanId}/ai-analysis`, { cache: "no-store" });
    const body = (await response.json().catch(() => null)) as
      | { intelligence?: Intelligence | null; error?: string }
      | null;
    if (!response.ok) throw new Error(body?.error || "Could not load AI analysis");
    setIntelligence(body?.intelligence ?? null);
  }, [scanId]);

  const analyze = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/scans/${scanId}/ai-analysis`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => null)) as
        | { intelligence?: Intelligence | null; error?: string }
        | null;
      if (!response.ok) throw new Error(body?.error || "AI analysis failed");
      setIntelligence(body?.intelligence ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI analysis failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!scanCompleted) return;
    queueMicrotask(() => {
      void load().catch(() => undefined);
    });
  }, [load, scanCompleted]);

  if (!scanCompleted) return null;

  const report = intelligence?.report;
  const hasAnalysis = report?.status === "completed";

  return (
    <section className="space-y-4" aria-labelledby="ai-security-intelligence-heading">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 id="ai-security-intelligence-heading" className="flex items-center gap-2 text-lg font-semibold">
            <Brain className="h-5 w-5 text-primary" />
            AI Security Engineer
          </h2>
          <p className="text-sm text-muted-foreground">
            Actionable priorities and fixes — not another vulnerability dump.
          </p>
        </div>
        <Button onClick={() => void analyze()} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing…
            </>
          ) : hasAnalysis ? (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Refresh analysis
            </>
          ) : (
            <>
              <Target className="mr-2 h-4 w-4" />
              Generate security plan
            </>
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!hasAnalysis && !loading && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Run AI analysis to get today&apos;s priorities, risk score, and ready-to-use fixes.
          </CardContent>
        </Card>
      )}

      {hasAnalysis && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Executive summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{report?.executive_summary}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Security {report?.security_score ?? "—"}/100</Badge>
                <Badge variant="outline">Risk {report?.risk_score ?? intelligence?.risk?.risk_score ?? "—"}/100</Badge>
                <Badge>{report?.priority_level ?? intelligence?.risk?.priority_level ?? "medium"}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Security coach</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {report?.coach_tip}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Today&apos;s priorities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(intelligence?.priorities ?? []).slice(0, 5).map((priority) => (
                <div key={priority.rank} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">
                      {priority.rank}. {priority.title}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      ~{priority.estimated_minutes ?? "?"} min
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{priority.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(intelligence?.recommendations ?? []).slice(0, 4).map((item, index) => (
                <div key={`${item.title}-${index}`}>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(intelligence?.insights ?? []).slice(0, 4).map((insight, index) => (
                <div key={`${insight.title}-${index}`}>
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-muted-foreground">{insight.body}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
