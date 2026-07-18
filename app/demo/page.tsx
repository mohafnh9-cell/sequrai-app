import Link from "next/link";
import { DEMO_SCENARIOS } from "@/features/demo/scenarios";
import { demoHref } from "@/features/demo/paths";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function DemoHubPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">SequrAI Product Demo</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Read-only QA environment with fictional data. Choose a scenario to preview Builder Edition
          V1 without signing in.
        </p>
        <Button asChild size="sm" variant="outline">
          <Link href="/">Exit demo</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {DEMO_SCENARIOS.map((scenario) => (
          <Card key={scenario.id} className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{scenario.label}</CardTitle>
              <CardDescription className="text-sm">{scenario.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm" className="gap-1.5">
                <Link href={demoHref("/dashboard", scenario.id)}>
                  Open scenario
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
