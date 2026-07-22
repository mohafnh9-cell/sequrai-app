import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function organizationHasProductionVerdict(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const { data: projects } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId);

  const projectIds = (projects ?? []).map((project) => project.id);
  if (projectIds.length === 0) return false;

  const { count } = await supabase
    .from("production_verdicts")
    .select("id", { count: "exact", head: true })
    .in("project_id", projectIds);

  return (count ?? 0) > 0;
}
