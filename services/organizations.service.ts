import { createClient } from "@/lib/supabase/client";
import type {
  OrganizationRow,
  OrganizationInsert,
  OrganizationUpdate,
  OrganizationWithMembership,
  ServiceResult,
} from "@/types/database";

// ─── Organizations Service ────────────────────────────────────────────────────

export async function getOrganizationByUser(
  userId: string
): Promise<ServiceResult<OrganizationWithMembership | null>> {
  const supabase = createClient();

  const { data: membership, error: memberError } = await supabase
    .from("organization_members")
    .select("*, organization:organizations(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (memberError) {
    if (memberError.code === "PGRST116") return { data: null, error: null };
    return { data: null, error: memberError.message };
  }

  if (!membership) return { data: null, error: null };

  const { count: memberCount } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", membership.organization_id);

  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", membership.organization_id);

  return {
    data: {
      ...(membership.organization as OrganizationRow),
      membership: {
        id: membership.id,
        organization_id: membership.organization_id,
        user_id: membership.user_id,
        role: membership.role,
        created_at: membership.created_at,
      },
      member_count: memberCount ?? 0,
      project_count: projectCount ?? 0,
    },
    error: null,
  };
}

export async function getOrganizationById(
  id: string
): Promise<ServiceResult<OrganizationRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createOrganization(
  payload: OrganizationInsert
): Promise<ServiceResult<OrganizationRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateOrganization(
  id: string,
  payload: OrganizationUpdate
): Promise<ServiceResult<OrganizationRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
