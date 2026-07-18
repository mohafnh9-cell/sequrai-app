import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type OrganizationMembershipRow = {
  organization_id: string;
  role: string;
  created_at: string;
};

export function pickPrimaryOrganizationId(
  memberships: OrganizationMembershipRow[]
): string | null {
  if (!memberships.length) return null;
  if (memberships.length === 1) return memberships[0].organization_id;

  const owners = memberships.filter((membership) => membership.role === "OWNER");
  const candidates = owners.length > 0 ? owners : memberships;

  return [...candidates].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0].organization_id;
}

export async function resolveUserOrganizationId(
  supabase: SupabaseClient,
  userId: string,
  preferredOrganizationId?: string | null
): Promise<string | null> {
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role, created_at")
    .eq("user_id", userId);

  if (!memberships?.length) return null;

  if (preferredOrganizationId) {
    const match = memberships.find(
      (membership) => membership.organization_id === preferredOrganizationId
    );
    if (match) return match.organization_id;
  }

  return pickPrimaryOrganizationId(memberships);
}
