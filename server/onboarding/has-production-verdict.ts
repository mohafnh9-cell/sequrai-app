import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function organizationHasProductionVerdict(
  supabase: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("production_verdicts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return (count ?? 0) > 0;
}
