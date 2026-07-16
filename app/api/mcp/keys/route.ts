import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateMcpApiKey } from "@/server/mcp/auth";

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80).default("Cursor MCP"),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const { data: keys } = await supabase
    .from("mcp_api_keys")
    .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
    .eq("organization_id", membership.organization_id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return NextResponse.json({ keys: keys ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const parsed = createKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const { rawKey, prefix, hash } = generateMcpApiKey();
  const admin = createAdminClient();
  const { data: key, error } = await admin
    .from("mcp_api_keys")
    .insert({
      organization_id: membership.organization_id,
      created_by_user_id: user.id,
      name: parsed.data.name,
      key_prefix: prefix,
      key_hash: hash,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error || !key) {
    return NextResponse.json({ error: "Could not create API key" }, { status: 500 });
  }

  return NextResponse.json({
    key: {
      ...key,
      rawKey,
    },
    message: "Copy this key now — it will not be shown again.",
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");
  if (!keyId) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "No organization" }, { status: 403 });
  }

  const { error } = await supabase
    .from("mcp_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", keyId)
    .eq("organization_id", membership.organization_id)
    .is("revoked_at", null);

  if (error) {
    return NextResponse.json({ error: "Could not revoke key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
