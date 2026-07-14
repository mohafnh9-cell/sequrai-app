"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { OrganizationWithMembership } from "@/types/database";

// ─── Organization Hooks ───────────────────────────────────────────────────────

export const orgKeys = {
  byUser: (userId: string) => ["organization", "user", userId] as const,
  detail: (id: string) => ["organization", "detail", id] as const,
};

export function useOrganization(userId: string | null | undefined) {
  return useQuery({
    queryKey: orgKeys.byUser(userId ?? ""),
    queryFn: async (): Promise<OrganizationWithMembership | null> => {
      if (!userId) return null;
      const supabase = createClient();

      const { data: membership, error } = await supabase
        .from("organization_members")
        .select("*, organization:organizations(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!membership) return null;

      const { count: memberCount } = await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id);

      const { count: projectCount } = await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id);

      return {
        ...(membership.organization as OrganizationWithMembership),
        membership: {
          id: membership.id,
          organization_id: membership.organization_id,
          user_id: membership.user_id,
          role: membership.role,
          created_at: membership.created_at,
        },
        member_count: memberCount ?? 0,
        project_count: projectCount ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
