import { Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Timeline" };

export default function TimelinePage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title="Timeline"
        description="Security history and activity log across all projects."
        action={
          <Badge variant="outline" className="text-muted-foreground">
            Coming soon
          </Badge>
        }
      />
      <EmptyState
        icon={Clock}
        title="Timeline coming soon"
        description="Track every scan, fix, and security event across your organization over time. Full audit history with filtering and export."
        className="py-24"
      />
    </div>
  );
}
