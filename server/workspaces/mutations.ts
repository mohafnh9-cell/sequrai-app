import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { writeActiveWorkspaceCookie } from "@/server/workspaces/active-workspace-cookie";
import {
  assertWorkspaceMembership,
  persistActiveWorkspaceSelection,
} from "@/server/workspaces/service";

export type SwitchWorkspaceResult =
  | { ok: true; workspaceId: string }
  | { ok: false; code: "unauthorized" | "forbidden" | "persist_failed"; message: string };

export async function switchActiveWorkspace(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
): Promise<SwitchWorkspaceResult> {
  const trimmed = workspaceId.trim();
  if (!trimmed) {
    return { ok: false, code: "forbidden", message: "Invalid workspace" };
  }

  const allowed = await assertWorkspaceMembership(supabase, userId, trimmed);
  if (!allowed) {
    return {
      ok: false,
      code: "forbidden",
      message: "You do not have access to this workspace",
    };
  }

  const persisted = await persistActiveWorkspaceSelection(supabase, userId, trimmed);
  if (persisted.error) {
    return {
      ok: false,
      code: "persist_failed",
      message: persisted.error,
    };
  }

  await writeActiveWorkspaceCookie(trimmed);
  revalidatePath("/", "layout");

  return { ok: true, workspaceId: trimmed };
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type CreateWorkspaceResult =
  | { ok: true; workspaceId: string }
  | { ok: false; code: "validation" | "create_failed" | "persist_failed"; message: string };

export async function createWorkspaceForUser(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<CreateWorkspaceResult> {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 80) {
    return {
      ok: false,
      code: "validation",
      message: "Workspace name must be between 2 and 80 characters",
    };
  }

  const slug = `${slugify(trimmed)}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: workspaceId, error } = await supabase.rpc("create_organization_with_owner", {
    organization_name: trimmed,
    organization_slug: slug,
  });

  if (error || !workspaceId) {
    return {
      ok: false,
      code: "create_failed",
      message: error?.message ?? "Workspace could not be created",
    };
  }

  const switched = await switchActiveWorkspace(supabase, userId, workspaceId as string);
  if (!switched.ok) {
    return {
      ok: false,
      code: "persist_failed",
      message: switched.message,
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings/workspaces");

  return { ok: true, workspaceId: workspaceId as string };
}
