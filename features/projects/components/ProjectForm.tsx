"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  projectSchema,
  FRAMEWORKS,
  type ProjectFormValues,
} from "@/features/projects/schemas/project.schema";
import type { ProjectRow } from "@/types/database";

interface ProjectFormProps {
  defaultValues?: Partial<ProjectRow>;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  isLoading?: boolean;
  submitLabel?: string;
  onCancel?: () => void;
}

export function ProjectForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel = "Create project",
  onCancel,
}: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      github_repo: defaultValues?.github_repo ?? "",
      production_url: defaultValues?.production_url ?? "",
      framework: (defaultValues?.framework as ProjectFormValues["framework"]) ?? undefined,
    },
  });

  const framework = watch("framework");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">
          Project name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          placeholder="My Next.js App"
          disabled={isLoading}
          className={cn(errors.name && "border-destructive")}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="A short description of this project"
          disabled={isLoading}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      {/* Framework */}
      <div className="space-y-1.5">
        <Label>Framework</Label>
        <Select
          value={framework}
          onValueChange={(v) => setValue("framework", v as ProjectFormValues["framework"])}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a framework" />
          </SelectTrigger>
          <SelectContent>
            {FRAMEWORKS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* GitHub Repo */}
      <div className="space-y-1.5">
        <Label htmlFor="github_repo">GitHub repository URL</Label>
        <Input
          id="github_repo"
          placeholder="https://github.com/user/repo"
          disabled={isLoading}
          className={cn(errors.github_repo && "border-destructive")}
          {...register("github_repo")}
        />
        <p className="text-xs text-muted-foreground">
          Optional — for code scanning (not implemented yet)
        </p>
        {errors.github_repo && (
          <p className="text-xs text-destructive">{errors.github_repo.message}</p>
        )}
      </div>

      {/* Production URL */}
      <div className="space-y-1.5">
        <Label htmlFor="production_url">Production URL</Label>
        <Input
          id="production_url"
          placeholder="https://myapp.vercel.app"
          disabled={isLoading}
          className={cn(errors.production_url && "border-destructive")}
          {...register("production_url")}
        />
        <p className="text-xs text-muted-foreground">
          Optional — for HTTP header scanning (not implemented yet)
        </p>
        {errors.production_url && (
          <p className="text-xs text-destructive">{errors.production_url.message}</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
