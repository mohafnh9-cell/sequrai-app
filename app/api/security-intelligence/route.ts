import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "No organization" }, { status: 404 });

  const orgId = membership.organization_id;

  const [priorities, recommendations, insights, timeline, patterns, reports, riskScores] =
    await Promise.all([
      supabase
        .from("ai_priorities")
        .select("*, scan:scans(id, project_id, completed_at)")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("ai_recommendations")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("security_insights")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("security_timeline")
        .select("*")
        .eq("organization_id", orgId)
        .order("occurred_at", { ascending: false })
        .limit(12),
      supabase
        .from("security_patterns")
        .select("*")
        .eq("organization_id", orgId)
        .order("occurrence_count", { ascending: false })
        .limit(8),
      supabase
        .from("ai_reports")
        .select("*, project:projects(id, name)")
        .eq("organization_id", orgId)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("project_risk_scores")
        .select("*, project:projects(id, name)")
        .eq("organization_id", orgId)
        .order("calculated_at", { ascending: false })
        .limit(5),
    ]);

  const latestReport = reports.data?.[0] ?? null;

  return NextResponse.json({
    priorities: priorities.data ?? [],
    recommendations: recommendations.data ?? [],
    insights: insights.data ?? [],
    timeline: timeline.data ?? [],
    patterns: patterns.data ?? [],
    latestReport,
    riskScores: riskScores.data ?? [],
    coachTip: latestReport?.coach_tip ?? null,
  });
}
