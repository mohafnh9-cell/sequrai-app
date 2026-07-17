import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/server/security-scanner/admin-client";
import { buildScanProductionVerdict } from "@/server/brain/build-scan-verdict";
import { ProductionVerdictExperience } from "@/features/production-verdict/components/ProductionVerdictExperience";
import { VERDICT_STATUS_LABELS } from "@/brain/production-verdict/schema";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Production Report" };

export default async function ProductionReportPage({
  params,
}: {
  params: Promise<{ id: string; scanId: string }>;
}) {
  const { id: projectId, scanId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, organization_id")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data: membership } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) notFound();

  const { data: scan } = await supabase
    .from("scans")
    .select("*")
    .eq("id", scanId)
    .eq("project_id", projectId)
    .eq("status", "completed")
    .maybeSingle();
  if (!scan) notFound();

  const { data: findings } = await supabase
    .from("scan_findings")
    .select("title, severity, recommendation, category")
    .eq("scan_id", scanId);

  const categoryCounts: Record<string, number> = {};
  for (const row of findings ?? []) {
    const key = String(row.category ?? "unknown").toLowerCase();
    categoryCounts[key] = (categoryCounts[key] ?? 0) + 1;
  }

  const admin = createAdminClient();
  const legacyVerdict = await buildScanProductionVerdict(admin, {
    scanId: scan.id,
    projectId: scan.project_id,
    organizationId: scan.organization_id,
    securityScore: scan.security_score,
    severityCounts: {
      critical: scan.critical_count ?? 0,
      high: scan.high_count ?? 0,
      medium: scan.medium_count ?? 0,
      low: scan.low_count ?? 0,
      info: scan.info_count ?? 0,
    },
    categoryCounts,
    findings: (findings ?? []).map((row) => ({
      title: row.title,
      severity: row.severity,
      recommendation: row.recommendation,
    })),
  });

  const verdict = legacyVerdict.v1;
  const commitSha = scan.commit_sha ?? scan.commit;
  const completedAt = scan.completed_at ?? scan.created_at;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href={`/projects/${projectId}/scans/${scanId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to analysis
          </Link>
        </Button>
        <p className="text-xs text-muted-foreground">Production report (private)</p>
      </div>

      <header className="space-y-2 border-b border-border/70 pb-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          SequrAI Production Report
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
        <dl className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide">Production Verdict</dt>
            <dd className="text-foreground">{VERDICT_STATUS_LABELS[verdict.status]}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Commit</dt>
            <dd className="font-mono text-foreground">{commitSha?.slice(0, 12) ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Reviewed</dt>
            <dd className="text-foreground">
              {completedAt ? new Date(completedAt).toLocaleString() : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide">Production blockers</dt>
            <dd className="text-foreground">{verdict.blockersCount}</dd>
          </div>
        </dl>
      </header>

      <ProductionVerdictExperience
        verdict={verdict}
        projectId={projectId}
        scanId={scanId}
        showEngineer
      />

      <footer className="text-center text-xs text-muted-foreground">
        <a href="https://sequrai-app.vercel.app" className="underline underline-offset-2">
          SequrAI
        </a>{" "}
        — tells you when your AI-built application is ready to ship.
      </footer>
    </div>
  );
}
