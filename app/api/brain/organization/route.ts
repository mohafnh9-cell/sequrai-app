import { NextResponse } from "next/server";
import { getServerAuthContext } from "@/lib/auth/dev-bypass";
import { buildOrgBrain } from "@/server/brain/build-org-brain";

export const runtime = "nodejs";

export async function GET() {
  const auth = await getServerAuthContext();
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!auth.organizationId) {
    return NextResponse.json({ error: "No organization" }, { status: 404 });
  }

  const brain = await buildOrgBrain(auth.supabase, auth.organizationId);

  return NextResponse.json(
    { brain },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    }
  );
}
