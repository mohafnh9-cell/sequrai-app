import { createClient } from "@/lib/supabase/client";
import type { ProfileRow, ProfileInsert, ProfileUpdate, ServiceResult } from "@/types/database";

// ─── Profiles Service ─────────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<ServiceResult<ProfileRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function upsertProfile(payload: ProfileInsert): Promise<ServiceResult<ProfileRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

export async function updateProfile(
  userId: string,
  payload: ProfileUpdate
): Promise<ServiceResult<ProfileRow>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}
