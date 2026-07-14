import { createClient } from "@/lib/supabase/client";
import type {
  MemberWithProfile,
  OrganizationMemberInsert,
  ServiceResult,
} from "@/types/database";

// ─── Members Service ──────────────────────────────────────────────────────────

export async function getMembersByOrg(
  organizationId: string
): Promise<ServiceResult<MemberWithProfile[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("*, profile:profiles(*)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as MemberWithProfile[], error: null };
}

export async function addMember(
  payload: OrganizationMemberInsert
): Promise<ServiceResult<void>> {
  const supabase = createClient();
  const { error } = await supabase.from("organization_members").insert(payload);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

export async function removeMember(memberId: string): Promise<ServiceResult<void>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}

export async function updateMemberRole(
  memberId: string,
  role: "OWNER" | "ADMIN" | "MEMBER"
): Promise<ServiceResult<void>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
