import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Fixes" };

export default async function AIFixesPage() {
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

  const { data: fixes } = await supabase
    .from("ai_fixes")
    .select("*, finding:scan_findings(title, severity, file_path, start_line)")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <PageHeader
        title="Production Fixes"
        description="Ready-to-implement fixes prepared by your AI Production Engineer."
      />

      {!fixes?.length ? (
        <EmptyState
          icon={Sparkles}
          title="No AI fixes yet"
          description="Run a production analysis, then run senior review on the scan report to create fixes and Cursor prompts."
          className="py-24"
        />
      ) : (
        <div className="space-y-4">
          {fixes.map((fix) => (
            <Card key={fix.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">
                    {(fix.finding as { title?: string } | null)?.title ?? "Security fix"}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{fix.difficulty ?? "medium"}</Badge>
                    <Badge>~{fix.estimated_minutes ?? "?"} min</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{fix.explanation_simple}</p>
                <p className="text-muted-foreground">{fix.fix_explanation}</p>
                {fix.cursor_prompt && (
                  <pre className="overflow-x-auto rounded-md bg-secondary/40 p-3 text-xs whitespace-pre-wrap">
                    {fix.cursor_prompt}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
