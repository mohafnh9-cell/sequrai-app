"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Brain, Clock, Sparkles, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type IntelligencePayload = {
  priorities: Array<{
    rank: number;
    title: string;
    description: string;
    estimated_minutes?: number;
  }>;
  recommendations: Array<{ title: string; description: string; priority?: string }>;
  insights: Array<{ title: string; body: string }>;
  timeline: Array<{
    id: string;
    title: string;
    description?: string;
    security_score?: number;
    risk_score?: number;
    occurred_at: string;
  }>;
  patterns: Array<{ pattern_label: string; occurrence_count: number }>;
  latestReport?: {
    executive_summary?: string;
    coach_tip?: string;
    security_score?: number;
    risk_score?: number;
    priority_level?: string;
    project?: { id?: string; name?: string };
  } | null;
  coachTip?: string | null;
  riskScores: Array<{
    risk_score: number;
    security_score: number;
    priority_level: string;
    project?: { id?: string; name?: string };
  }>;
};

export function DashboardSecurityIntelligence() {
  const [data, setData] = useState<IntelligencePayload | null>(null);

  useEffect(() => {
    void fetch("/api/security-intelligence", { cache: "no-store" })
      .then((res) => res.json())
      .then((body) => setData(body))
      .catch(() => setData(null));
  }, []);

  if (!data) return null;

  const hasContent =
    (data.priorities?.length ?? 0) > 0 ||
    (data.recommendations?.length ?? 0) > 0 ||
    (data.insights?.length ?? 0) > 0;

  if (!hasContent && !data.latestReport) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Complete a scan and run <strong>Generate production plan</strong> on the scan report to
          activate your AI Production Engineer.
        </CardContent>
      </Card>
    );
  }

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
            <p>{data.latestReport?.executive_summary ?? "Your production intelligence will appear here after AI analysis."}</p>
            {data.latestReport && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Production {data.latestReport.security_score ?? "—"}/100</Badge>
                <Badge variant="outline">Risk {data.latestReport.risk_score ?? "—"}/100</Badge>
                <Badge>{data.latestReport.priority_level ?? "medium"}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Production coach
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {data.coachTip ?? data.latestReport?.coach_tip ?? "Run AI analysis on a completed scan to get personalized coaching."}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" />
              Today&apos;s priorities
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.priorities.slice(0, 5).map((priority) => (
              <div key={priority.rank} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {priority.rank}. {priority.title}
                  </p>
                  <span className="text-xs text-muted-foreground">~{priority.estimated_minutes ?? "?"} min</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{priority.description}</p>
              </div>
            ))}
            {!data.priorities.length && (
              <p className="text-sm text-muted-foreground">No priorities yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Production insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.insights.slice(0, 4).map((insight, index) => (
              <div key={`${insight.title}-${index}`}>
                <p className="font-medium">{insight.title}</p>
                <p className="text-muted-foreground">{insight.body}</p>
              </div>
            ))}
            {!data.insights.length && (
              <p className="text-muted-foreground">Insights appear after AI analysis.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">AI recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.recommendations.slice(0, 4).map((item, index) => (
              <div key={`${item.title}-${index}`}>
                <p className="font-medium">{item.title}</p>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Production timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.timeline.slice(0, 6).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                  )}
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0">
                  {event.security_score !== null && event.security_score !== undefined && (
                    <p>{event.security_score}/100</p>
                  )}
                  {event.risk_score !== null && event.risk_score !== undefined && (
                    <p>Risk {event.risk_score}</p>
                  )}
                </div>
              </div>
            ))}
            <Button variant="ghost" size="sm" asChild className="mt-2">
              <Link href="/timeline">View full timeline</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
