import { GitBranch, Webhook, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DemoIntegrationsPreview({ githubConnected }: { githubConnected: boolean }) {
  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Preview how GitHub connects repositories for Continuous Reviews. Actions are disabled in
          demo mode.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                <GitBranch className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">GitHub</CardTitle>
                <CardDescription className="text-xs">
                  Connect repos for automatic production analysis on every push
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                githubConnected
                  ? "text-xs text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                  : "text-xs text-muted-foreground"
              }
            >
              {githubConnected ? "Connected (demo)" : "Not connected (demo)"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {githubConnected
              ? "Demo scenario shows a connected repository with webhooks registered automatically."
              : "Demo scenario shows the disconnected state before GitHub is linked."}
          </p>
          <Button disabled className="gap-2" aria-disabled>
            <GitBranch className="h-4 w-4" />
            Connect GitHub repositories
          </Button>
          <p className="text-xs text-muted-foreground">Read-only demo — connect actions are disabled.</p>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm">GitHub Production Automation</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Webhooks register automatically when repositories are connected in the live product.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 text-sm">
          <code className="block rounded-md bg-secondary/50 px-3 py-2 text-xs break-all">
            https://demo.sequrai.dev/api/webhooks/github
          </code>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {["Slack", "Discord"].map((name) => (
          <Card key={name} className="border-border/50 opacity-50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Soon
                </Badge>
              </div>
              <CardTitle className="text-sm mt-3">{name}</CardTitle>
              <CardDescription className="text-xs">Coming soon in Builder Edition.</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
