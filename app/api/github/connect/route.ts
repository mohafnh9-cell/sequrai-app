import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { repos } = await request.json() as {
    repos: Array<{
      id: number;
      name: string;
      full_name: string;
      html_url: string;
      description: string | null;
      private: boolean;
    }>;
  };

  if (!repos?.length) return NextResponse.json({ error: "No repos provided" }, { status: 400 });

  const userId = session.user.id;
  const org = await prisma.organization.findFirst({
    where: { members: { some: { userId } } },
  });

  if (!org) return NextResponse.json({ error: "No organization found" }, { status: 404 });

  let saved = 0;
  for (const repo of repos) {
    const existing = await prisma.project.findFirst({
      where: { organizationId: org.id, repoUrl: repo.html_url },
    });

    if (existing) {
      await prisma.project.update({
        where: { id: existing.id },
        data: { name: repo.name, description: repo.description ?? undefined },
      });
    } else {
      await prisma.project.create({
        data: {
          organizationId: org.id,
          name: repo.name,
          repoUrl: repo.html_url,
          description: repo.description ?? undefined,
          provider: "GITHUB",
          status: "ACTIVE",
        },
      });
    }
    saved++;
  }

  return NextResponse.json({ saved, total: repos.length });
}
