import { ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title="Security"
        description="Vulnerability detection and security posture overview."
        action={
          <Badge variant="outline" className="text-muted-foreground">
            Coming soon
          </Badge>
        }
      />
      <EmptyState
        icon={ShieldAlert}
        title="Security scanner coming soon"
        description="The security scanner will analyze your codebases for vulnerabilities, exposed secrets, misconfigured policies, and more. Connect your projects and we'll notify you when scanning is available."
        className="py-24"
      />
    </div>
  );
}
