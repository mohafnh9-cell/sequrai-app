import { DIMENSION_LABELS, type ReadinessDimensionKey, type ReadinessDimensions } from "@/brain";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const DIMENSION_ORDER: ReadinessDimensionKey[] = [
  "security",
  "authentication",
  "databaseDesign",
  "bestPractices",
  "architecture",
  "performance",
  "deploymentReadiness",
];

function scoreTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-emerald-500";
  if (score >= 70) return "text-amber-500";
  return "text-red-500";
}

export function OrgReadinessDimensions({
  dimensions,
  overall,
}: {
  dimensions: ReadinessDimensions;
  overall: number | null;
}) {
  if (overall === null) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Production dimensions</CardTitle>
        <CardDescription className="text-xs">
          Average readiness across scanned projects
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 pt-0">
        {DIMENSION_ORDER.map((key) => {
          const value = dimensions[key];
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border border-border/40 px-3 py-2 text-sm"
            >
              <span className="text-muted-foreground">{DIMENSION_LABELS[key]}</span>
              <span className={`font-medium ${scoreTone(value)}`}>{value ?? "—"}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
