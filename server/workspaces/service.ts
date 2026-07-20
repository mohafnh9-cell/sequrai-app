import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatWorkspacePlan } from "@/lib/workspaces/presentation";
import type { WorkspacePresentation } from "@/lib/workspaces/presentation";
import {
  pickPrimaryOrganizationId,
  type OrganizationMembershipRow,
} from "@/server/organizations/resolve-user-organization";
import { readActiveWorkspaceCookie } from "@/server/workspaces/active-workspace-cookie";

export type ActiveWorkspaceResolutionInput = {
  profilePreferenceId?: string | null;
  cookieId?: string | null;
};

type OrganizationRelationRow = {
  id: string;
  name: string;
  plan: string;
  logo_url: string | null;
  created_at: string;
};

function readOrganizationRelation(value: unknown): OrganizationRelationRow | null {
  if (!value) return null;

  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== "object") return null;

  const record = candidate as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.name !== "string") return null;

  return {
    id: record.id,
    name: record.name,
    plan: typeof record.plan === "string" ? record.plan : "FREE",
    logo_url: typeof record.logo_url === "string" ? record.logo_url : null,
    created_at: typeof record.created_at === "string" ? record.created_at : "",
  };
}

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
      const organization = readOrganizationRelation(row.organization);
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
    input.cookieId?.trim(),
    input.profilePreferenceId?.trim(),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (membershipIds.has(candidate)) return candidate;
  }

  return pickPrimaryOrganizationId(memberships as OrganizationMembershipRow[]);
}

export async function resolveActiveWorkspaceIdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const [profilePreferenceId, cookieId] = await Promise.all([
    readProfileWorkspacePreference(supabase, userId),
    readActiveWorkspaceCookie(),
  ]);

  return resolveActiveWorkspaceId(supabase, userId, {
    profilePreferenceId,
    cookieId,
  });
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

const MISSING_PROFILE_COLUMN_CODES = new Set(["PGRST204", "42703"]);

export async function persistActiveWorkspaceSelection(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<{ error: string | null; profilePersisted: boolean }> {
  const { error } = await supabase
    .from("profiles")
    .update({
      active_organization_id: workspaceId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    if (error.code && MISSING_PROFILE_COLUMN_CODES.has(error.code)) {
      return { error: null, profilePersisted: false };
    }
    return { error: error.message, profilePersisted: false };
  }
  return { error: null, profilePersisted: true };
}
