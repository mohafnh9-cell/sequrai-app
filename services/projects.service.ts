import { createClient } from "@/lib/supabase/client";
import type {
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  ServiceResult,
} from "@/types/database";

// ─── Projects Service ─────────────────────────────────────────────────────────
// Pure data access layer — no React, no server-only code.
// Used by both server actions and React Query hooks.

export async function getProjectsByOrg(
  organizationId: string
): Promise<ServiceResult<ProjectRow[]>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data: data ?? [], error: null };
}

export async function getProjectById(
  projectId: string
): Promise<ServiceResult<ProjectRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function createProject(
  payload: ProjectInsert
): Promise<ServiceResult<ProjectRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateProject(
  projectId: string,
  payload: ProjectUpdate
): Promise<ServiceResult<ProjectRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function deleteProject(
  projectId: string
): Promise<ServiceResult<void>> {
  const supabase = createClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) return { data: null, error: error.message };
  return { data: undefined, error: null };
}
