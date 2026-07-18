import type { StackProfile } from "@/features/security-scanner/types";
import type { FixPromptStack } from "./types";

const DEPENDENCY_STACK_HINTS: Array<{ packages: string[]; label: string; bucket: keyof FixPromptStack }> = [
  { packages: ["stripe", "@stripe/stripe-js"], label: "Stripe", bucket: "services" },
  { packages: ["tailwindcss", "@tailwindcss/postcss"], label: "Tailwind CSS", bucket: "frameworks" },
  { packages: ["@clerk/nextjs", "@clerk/clerk-react", "@clerk/clerk-expo"], label: "Clerk", bucket: "services" },
  { packages: ["next-auth", "@auth/core"], label: "Auth.js", bucket: "services" },
  { packages: ["expo", "expo-router"], label: "Expo", bucket: "frameworks" },
  { packages: ["react-native"], label: "React Native", bucket: "frameworks" },
  { packages: ["firebase", "firebase-admin"], label: "Firebase", bucket: "services" },
  { packages: ["@supabase/supabase-js", "@supabase/ssr", "@supabase/auth-helpers-nextjs"], label: "Supabase", bucket: "services" },
  { packages: ["next"], label: "Next.js", bucket: "frameworks" },
  { packages: ["react", "react-dom"], label: "React", bucket: "frameworks" },
  { packages: ["typescript"], label: "TypeScript", bucket: "languages" },
  { packages: ["pg", "postgres"], label: "PostgreSQL", bucket: "services" },
  { packages: ["@prisma/client", "prisma"], label: "Prisma", bucket: "services" },
];

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function enrichFromDependencies(
  stack: FixPromptStack,
  dependencies: Record<string, string> = {}
): FixPromptStack {
  const packages = new Set(Object.keys(dependencies));
  const next = {
    languages: [...stack.languages],
    frameworks: [...stack.frameworks],
    services: [...stack.services],
  };

  for (const hint of DEPENDENCY_STACK_HINTS) {
    if (hint.packages.some((pkg) => packages.has(pkg))) {
      next[hint.bucket].push(hint.label);
    }
  }

  return {
    languages: uniqueSorted(next.languages),
    frameworks: uniqueSorted(next.frameworks),
    services: uniqueSorted(next.services),
  };
}

export function stackFromProfile(profile?: StackProfile | null): FixPromptStack {
  if (!profile) {
    return { languages: [], frameworks: [], services: [] };
  }

  const base: FixPromptStack = {
    languages: uniqueSorted(profile.languages ?? []),
    frameworks: uniqueSorted(profile.frameworks ?? []),
    services: uniqueSorted(profile.services ?? []),
  };

  if (profile.dependencies && Object.keys(profile.dependencies).length > 0) {
    return enrichFromDependencies(base, profile.dependencies);
  }

  return base;
}

export function stackFromDetectedStack(raw: unknown): FixPromptStack {
  if (!raw || typeof raw !== "object") {
    return { languages: [], frameworks: [], services: [] };
  }

  const record = raw as Record<string, unknown>;
  const base: FixPromptStack = {
    languages: uniqueSorted(
      Array.isArray(record.languages)
        ? record.languages.filter((item): item is string => typeof item === "string")
        : []
    ),
    frameworks: uniqueSorted(
      Array.isArray(record.frameworks)
        ? record.frameworks.filter((item): item is string => typeof item === "string")
        : []
    ),
    services: uniqueSorted(
      Array.isArray(record.services)
        ? record.services.filter((item): item is string => typeof item === "string")
        : []
    ),
  };

  const dependencies =
    record.dependencies && typeof record.dependencies === "object"
      ? (record.dependencies as Record<string, string>)
      : {};

  return enrichFromDependencies(base, dependencies);
}

export function formatStackLines(stack: FixPromptStack): string[] {
  const lines: string[] = [];
  for (const language of stack.languages) lines.push(`- ${language}`);
  for (const framework of stack.frameworks) lines.push(`- ${framework}`);
  for (const service of stack.services) lines.push(`- ${service}`);
  return lines.length > 0 ? lines : ["- TypeScript (detected during static analysis)"];
}

export function defaultStackFromFramework(framework?: string | null): FixPromptStack {
  const label = framework?.toUpperCase();
  switch (label) {
    case "NEXTJS":
      return { languages: ["TypeScript"], frameworks: ["Next.js", "React"], services: [] };
    case "REACT":
      return { languages: ["TypeScript"], frameworks: ["React"], services: [] };
    case "VUE":
      return { languages: ["TypeScript"], frameworks: ["Vue"], services: [] };
    case "NUXT":
      return { languages: ["TypeScript"], frameworks: ["Nuxt"], services: [] };
    case "REMIX":
      return { languages: ["TypeScript"], frameworks: ["Remix", "React"], services: [] };
    case "SVELTE":
      return { languages: ["TypeScript"], frameworks: ["SvelteKit"], services: [] };
    case "ASTRO":
      return { languages: ["TypeScript"], frameworks: ["Astro"], services: [] };
    default:
      return { languages: ["TypeScript"], frameworks: [], services: [] };
  }
}
