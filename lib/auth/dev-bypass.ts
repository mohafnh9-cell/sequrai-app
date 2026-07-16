import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export function isAuthBypassEnabled(): boolean {
  return (
    process.env.SEQURAI_BYPASS_AUTH === "true" || process.env.SEQURAI_BYPASS_AUTH === "1"
  );
}

type BypassContext = {
  user: User;
  organizationId: string;
  orgName: string;
};

let cachedBypass: BypassContext | null = null;

export async function getDevBypassContext(): Promise<BypassContext | null> {
  if (!isAuthBypassEnabled()) return null;
  if (cachedBypass) return cachedBypass;

  try {
    const admin = createAdminClient();
    const { data: member } = await admin
      .from("organization_members")
      .select("user_id, organization_id, organization:organizations(name)")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!member?.user_id || !member.organization_id) return null;

    cachedBypass = {
      user: {
        id: member.user_id,
        email: "bypass@sequrai.dev",
        app_metadata: {},
        user_metadata: { full_name: "Dev Preview" },
        aud: "authenticated",
        created_at: new Date().toISOString(),
      } as User,
      organizationId: member.organization_id,
      orgName: (member.organization as { name?: string } | null)?.name ?? "SequrAI",
    };
    return cachedBypass;
  } catch {
    return null;
  }
}

export type ServerAuthContext = {
  user: User;
  supabase: SupabaseClient;
  organizationId: string | null;
  orgName: string | null;
  bypass: boolean;
};

export async function getServerAuthContext(): Promise<ServerAuthContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id, organization:organizations(name)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    return {
      user,
      supabase,
      organizationId: membership?.organization_id ?? null,
      orgName: (membership?.organization as { name?: string } | null)?.name ?? null,
      bypass: false,
    };
  }

  const bypass = await getDevBypassContext();
  if (!bypass) return null;

  return {
    user: bypass.user,
    supabase: createAdminClient(),
    organizationId: bypass.organizationId,
    orgName: bypass.orgName,
    bypass: true,
  };
}
