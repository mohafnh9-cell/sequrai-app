import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function isVerdictAutopilotEnabled(
  client: SupabaseClient,
  organizationId: string
): Promise<boolean> {
  const { data, error } = await client
    .from("organizations")
    .select("verdict_autopilot_enabled")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) {
    if (error.message.includes("verdict_autopilot_enabled")) {
      return true;
    }
    console.warn("autopilot_setting_read_failed", { organizationId, message: error.message });
    return true;
  }

  return data?.verdict_autopilot_enabled !== false;
}
