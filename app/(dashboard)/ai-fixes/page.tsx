import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "AI Fixes" };

export default function AIFixesPage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title="AI Fixes"
        description="Auto-generated security patches powered by Claude AI."
        action={
          <Badge variant="outline" className="text-muted-foreground">
            Coming soon
          </Badge>
        }
      />
      <EmptyState
        icon={Sparkles}
        title="AI-powered fixes coming soon"
        description="SequrAI will use Claude to automatically generate pull requests that fix detected vulnerabilities. No manual patching required."
        className="py-24"
      />
    </div>
  );
}
