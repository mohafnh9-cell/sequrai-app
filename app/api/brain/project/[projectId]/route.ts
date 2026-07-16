import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildProjectBrain } from "@/server/brain/build-project-brain";

export const runtime = "nodejs";

const paramsSchema = z.object({ projectId: z.string().uuid() });

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", parsed.data.projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", project.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const brain = await buildProjectBrain(supabase, parsed.data.projectId);
  if (!brain) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  return NextResponse.json(
    { brain },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    }
  );
}
