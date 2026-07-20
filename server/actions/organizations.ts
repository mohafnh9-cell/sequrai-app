"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { switchActiveWorkspace } from "@/server/workspaces/mutations";

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

  const { data: workspaceId, error } = await supabase.rpc("create_organization_with_owner", {
    organization_name: parsed.data.name,
    organization_slug: slug,
  });

  if (error || !workspaceId) return { error: { _root: [error?.message ?? "Workspace could not be created"] } };

  const switched = await switchActiveWorkspace(supabase, user.id, workspaceId as string);
  if (!switched.ok) return { error: { _root: [switched.message] } };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/settings/workspaces");

  const redirectTo = (formData.get("redirectTo") as string | null)?.trim();
  if (redirectTo === "/dashboard") {
    redirect("/dashboard");
  }

  redirect("/onboarding?step=welcome");
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
