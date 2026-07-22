"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { switchActiveWorkspace } from "@/server/workspaces/mutations";
import { resolveActiveWorkspaceIdForUser } from "@/server/workspaces/service";
import { resolveOrganizationRedirect } from "@/lib/onboarding/organization-redirect";

const orgSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters"),
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CreateOrganizationResult =
  | { ok: true; redirectTo: string; workspaceId: string; recovered?: boolean }
  | { ok: false; error: Record<string, string[]> };

export async function createOrganizationAction(formData: FormData): Promise<CreateOrganizationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nextStep = (formData.get("nextStep") as string | null)?.trim() || "github";
  const redirectTo = resolveOrganizationRedirect(nextStep);

  const existingWorkspaceId = await resolveActiveWorkspaceIdForUser(supabase, user.id);
  if (existingWorkspaceId) {
    await switchActiveWorkspace(supabase, user.id, existingWorkspaceId);
    revalidatePath("/onboarding");
    revalidatePath("/dashboard");
    return { ok: true, redirectTo, workspaceId: existingWorkspaceId, recovered: true };
  }

  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.flatten().fieldErrors };
  }

  const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: workspaceId, error } = await supabase.rpc("create_organization_with_owner", {
    organization_name: parsed.data.name,
    organization_slug: slug,
  });

  if (error || !workspaceId) {
    return { ok: false, error: { _root: [error?.message ?? "Workspace could not be created"] } };
  }

  const switched = await switchActiveWorkspace(supabase, user.id, workspaceId as string);
  if (!switched.ok) {
    return { ok: false, error: { _root: [switched.message] } };
  }

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/settings/workspaces");

  return { ok: true, redirectTo, workspaceId: workspaceId as string };
}

export async function updateOrganizationAction(orgId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = orgSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase
    .from("organizations")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (error) return { error: { _root: [error.message] } };

  revalidatePath("/settings");
  return { error: null };
}
