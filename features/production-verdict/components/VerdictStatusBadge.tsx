"use client";

import { Badge } from "@/components/ui/badge";
import { verdictBadgeVariant, verdictLabel } from "@/brain/production-verdict/status-ui";
import type { VerdictStatus } from "@/brain/production-verdict/schema";

export function VerdictStatusBadge({
  status,
  className,
}: {
  status: VerdictStatus;
  className?: string;
}) {
  return (
    <Badge
      variant={verdictBadgeVariant(status)}
      className={className}
      aria-label={`Production verdict: ${verdictLabel(status)}`}
    >
      {verdictLabel(status)}
    </Badge>
  );
}
