"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OrganizationInsert } from "@/types/database";
import { z } from "zod";

// ─── Organization Server Actions ──────────────────────────────────────────────

const orgSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createOrganizationAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = { name: formData.get("name") as string };
  const parsed = orgSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const payload: OrganizationInsert = {
    name: parsed.data.name,
    slug,
    plan: "FREE",
  };

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert(payload)
    .select()
    .single();

  if (orgError) return { error: { _root: [orgError.message] } };

  const { error: memberError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: "OWNER",
    });

  if (memberError) return { error: { _root: [memberError.message] } };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateOrganizationAction(orgId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const raw = { name: formData.get("name") as string };
  const parsed = orgSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) return { error: { _root: [error.message] } };

  revalidatePath("/settings");
  return { error: null };
}
