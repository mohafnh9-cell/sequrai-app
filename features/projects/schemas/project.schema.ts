import { z } from "zod";

// ─── Project Schemas ──────────────────────────────────────────────────────────

export const FRAMEWORKS = [
  { value: "NEXTJS", label: "Next.js" },
  { value: "REACT", label: "React" },
  { value: "VUE", label: "Vue" },
  { value: "SVELTE", label: "SvelteKit" },
  { value: "NUXT", label: "Nuxt" },
  { value: "REMIX", label: "Remix" },
  { value: "ASTRO", label: "Astro" },
  { value: "OTHER", label: "Other" },
] as const;

export type Framework = (typeof FRAMEWORKS)[number]["value"];

export const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(100, "Name must be under 100 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional(),
  github_repo: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || /^https?:\/\/.+/.test(val),
      "Must be a valid URL"
    ),
  production_url: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim() === "" || /^https?:\/\/.+/.test(val),
      "Must be a valid URL"
    ),
  framework: z
    .enum(["NEXTJS", "REACT", "VUE", "SVELTE", "NUXT", "REMIX", "ASTRO", "OTHER"])
    .optional(),
});

export const projectUpdateSchema = projectSchema.extend({
  name: z.string().min(1, "Project name is required").max(100),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
export type ProjectUpdateFormValues = z.infer<typeof projectUpdateSchema>;
