"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectForm } from "@/features/projects/components/ProjectForm";
import { useCreateProject } from "@/hooks/use-projects";
import { useOrganization } from "@/hooks/use-organization";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { ProjectFormValues } from "@/features/projects/schemas/project.schema";

export default function NewProjectPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const { data: org } = useOrganization(userId);
  const { mutateAsync: createProject, isPending } = useCreateProject();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const handleSubmit = async (values: ProjectFormValues) => {
    if (!org) return;
    const project = await createProject({
      organization_id: org.id,
      name: values.name,
      description: values.description ?? null,
      github_repo: values.github_repo ?? null,
      production_url: values.production_url ?? null,
      framework: (values.framework as import("@/types/database").ProjectRow["framework"]) ?? null,
    });
    router.push(`/projects/${project.id}`);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">New project</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Register a project to track its security posture.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Project details</CardTitle>
          <CardDescription>
            Basic information about your project. You can connect GitHub and scanning later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            onSubmit={handleSubmit}
            isLoading={isPending || !org}
            submitLabel="Create project"
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
