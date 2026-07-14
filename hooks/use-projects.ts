"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ProjectRow, ProjectInsert, ProjectUpdate } from "@/types/database";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const projectKeys = {
  all: ["projects"] as const,
  byOrg: (orgId: string) => [...projectKeys.all, "org", orgId] as const,
  detail: (id: string) => [...projectKeys.all, "detail", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useProjects(organizationId: string | null | undefined) {
  return useQuery({
    queryKey: projectKeys.byOrg(organizationId ?? ""),
    queryFn: async () => {
      if (!organizationId) return [];
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as ProjectRow[];
    },
    enabled: !!organizationId,
  });
}

export function useProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(projectId ?? ""),
    queryFn: async () => {
      if (!projectId) return null;
      const supabase = createClient();
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw new Error(error.message);
      return data as ProjectRow;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (payload: ProjectInsert) => {
      const { data, error } = await supabase
        .from("projects")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ProjectRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.byOrg(data.organization_id) });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: ProjectUpdate }) => {
      const { data, error } = await supabase
        .from("projects")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as ProjectRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.byOrg(data.organization_id) });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ id, orgId }: { id: string; orgId: string }) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return { id, orgId };
    },
    onSuccess: ({ id, orgId }) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: projectKeys.byOrg(orgId) });
    },
  });
}
