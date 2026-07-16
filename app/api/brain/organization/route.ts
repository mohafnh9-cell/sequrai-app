import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildOrgBrain } from "@/server/brain/build-org-brain";

export const runtime = "nodejs";

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
  if (!membership) return NextResponse.json({ error: "No organization" }, { status: 404 });

  const brain = await buildOrgBrain(supabase, membership.organization_id);

  return NextResponse.json(
    { brain },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    }
  );
}
