import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: timeline } = await supabase
    .from("security_timeline")
    .select("*, project:projects(name)")
    .eq("organization_id", membership.organization_id)
    .order("occurred_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title="Security Timeline"
        description="Track security score, risk score, and milestones over time."
      />

      {!timeline?.length ? (
        <EmptyState
          icon={Clock}
          title="No timeline events yet"
          description="Complete a scan and run AI analysis to start building your security history."
          className="py-24"
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {timeline.map((event) => (
              <div key={event.id} className="flex items-start justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-medium">{event.title}</p>
                  {event.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{event.description}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(event.project as { name?: string } | null)?.name ?? "Project"} ·{" "}
                    {formatRelativeDate(event.occurred_at)}
                  </p>
                </div>
                <div className="text-right text-sm shrink-0">
                  {event.security_score !== null && event.security_score !== undefined && (
                    <p className="font-semibold">{event.security_score}/100</p>
                  )}
                  {event.risk_score !== null && event.risk_score !== undefined && (
                    <p className="text-xs text-muted-foreground">Risk {event.risk_score}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
