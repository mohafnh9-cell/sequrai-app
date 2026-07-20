import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatWorkspacePlan } from "@/lib/workspaces/presentation";
import type { WorkspacePresentation } from "@/lib/workspaces/presentation";
import {
  pickPrimaryOrganizationId,
  type OrganizationMembershipRow,
} from "@/server/organizations/resolve-user-organization";

export type ActiveWorkspaceResolutionInput = {
  profilePreferenceId?: string | null;
  cookieId?: string | null;
};

export async function listAccessibleWorkspaces(
  supabase: SupabaseClient,
  userId: string
): Promise<WorkspacePresentation[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(
      "role, created_at, organization:organizations(id, name, plan, logo_url, created_at)"
    )
    .eq("user_id", userId);

  if (error || !data?.length) return [];

  const rows = data
    .map((row) => {
      const organization = row.organization as {
        id: string;
        name: string;
        plan: string;
        logo_url: string | null;
        created_at: string;
      } | null;
      if (!organization?.id) return null;
      return {
        id: organization.id,
        name: organization.name,
        plan: formatWorkspacePlan(organization.plan),
        logoUrl: organization.logo_url,
        role: row.role as string,
        membershipCreatedAt: row.created_at as string,
        organizationCreatedAt: organization.created_at,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  return rows
    .sort((a, b) => {
      const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      if (nameCompare !== 0) return nameCompare;
      return a.id.localeCompare(b.id);
    })
    .map(({ id, name, plan, logoUrl }) => ({ id, name, plan, logoUrl }));
}

export async function readProfileWorkspacePreference(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("active_organization_id")
    .eq("id", userId)
    .maybeSingle();

  return (data?.active_organization_id as string | null | undefined) ?? null;
}

export async function resolveActiveWorkspaceId(
  supabase: SupabaseClient,
  userId: string,
  input: ActiveWorkspaceResolutionInput = {}
): Promise<string | null> {
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role, created_at")
    .eq("user_id", userId);

  if (!memberships?.length) return null;

  const membershipIds = new Set(
    memberships.map((membership) => membership.organization_id as string)
  );

  const candidates = [
    input.profilePreferenceId?.trim(),
    input.cookieId?.trim(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (membershipIds.has(candidate)) return candidate;
  }

  return pickPrimaryOrganizationId(memberships as OrganizationMembershipRow[]);
}

export async function assertWorkspaceMembership(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("organization_id", workspaceId)
    .maybeSingle();

  return Boolean(data?.organization_id);
}

export async function persistActiveWorkspaceSelection(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      active_organization_id: workspaceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) return { error: error.message };
  return { error: null };
}
