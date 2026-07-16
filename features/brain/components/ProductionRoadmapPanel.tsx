import { Map, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProductionRoadmap } from "@/brain";

export function ProductionRoadmapPanel({ roadmap }: { roadmap: ProductionRoadmap }) {
  if (!roadmap.items.length) {
    return (
      <Card className="border-dashed border-border/50">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Run a production analysis to generate your personalized Production Roadmap.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base">
          <Map className="h-4 w-4 text-primary" />
          Production Roadmap
        </CardTitle>
        <CardDescription className="text-xs">
          Prioritized steps to increase your Production Ready Score
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {roadmap.items.map((item) => (
          <div
            key={item.rank}
            className="rounded-lg border border-border/50 bg-secondary/10 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {item.rank}. {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Badge variant="secondary">+{item.scoreDelta} Production Score</Badge>
                <Badge variant="outline">{item.category}</Badge>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Estimated time: {item.estimatedMinutes} min
            </p>
          </div>
        ))}

        {roadmap.projectedScore !== null && roadmap.currentScore !== null && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>TOTAL</span>
              <span className="flex items-center gap-2">
                {roadmap.currentScore}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                {roadmap.projectedScore} Production Score
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Estimated implementation time: {roadmap.totalMinutes} minutes
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
