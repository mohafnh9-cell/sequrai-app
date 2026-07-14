import { Puzzle, GitBranch, Webhook, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Integrations" };

const INTEGRATIONS = [
  {
    name: "GitHub",
    description: "Connect repos for automatic scanning on push.",
    icon: GitBranch,
    status: "coming_soon",
  },
  {
    name: "Webhooks",
    description: "Send security events to your own endpoints.",
    icon: Webhook,
    status: "coming_soon",
  },
  {
    name: "Slack",
    description: "Get notified about critical issues in Slack.",
    icon: Zap,
    status: "coming_soon",
  },
];

export default function IntegrationsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <PageHeader
        title="Integrations"
        description="Connect SequrAI with your existing tools and workflows."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <Card key={integration.name} className="border-border/50 opacity-70">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
                  <integration.icon className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Soon
                </Badge>
              </div>
              <CardTitle className="text-sm mt-3">{integration.name}</CardTitle>
              <CardDescription className="text-xs">{integration.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
