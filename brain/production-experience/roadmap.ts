import type { BrainPriority } from "../types";

export type ProductionRoadmapItem = {
  rank: number;
  title: string;
  description?: string;
  category: string;
  scoreDelta: number;
  estimatedMinutes: number;
};

export type ProductionRoadmap = {
  items: ProductionRoadmapItem[];
  currentScore: number | null;
  projectedScore: number | null;
  totalMinutes: number;
};

const DEFAULT_SCORE_DELTAS = [15, 8, 6, 5, 4, 3, 2];

const CATEGORY_KEYWORDS: Array<{ keywords: string[]; category: string }> = [
  { keywords: ["auth", "login", "session", "jwt", "oauth"], category: "Authentication" },
  { keywords: ["csp", "header", "cors", "deployment", "vercel", "env"], category: "Deployment" },
  { keywords: ["rate limit", "throttle"], category: "Performance" },
  { keywords: ["secret", "key", "credential", "token"], category: "Security" },
  { keywords: ["sql", "injection", "xss", "rls", "supabase", "database"], category: "Database" },
  { keywords: ["architecture", "structure", "module"], category: "Architecture" },
  { keywords: ["monitor", "log", "observability"], category: "Monitoring" },
  { keywords: ["openai", "anthropic", "ai", "llm", "model"], category: "AI Integrations" },
];

function inferCategory(title: string, description?: string): string {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
      return entry.category;
    }
  }
  return "Best Practices";
}

export function buildProductionRoadmap(input: {
  currentScore: number | null;
  priorities: BrainPriority[];
  recommendations?: Array<{ title: string; description: string }>;
}): ProductionRoadmap {
  const sources = [
    ...input.priorities.map((item) => ({
      title: item.title,
      description: item.description,
      estimatedMinutes: item.estimatedMinutes ?? 10,
    })),
    ...(input.recommendations ?? []).slice(0, 3).map((item) => ({
      title: item.title,
      description: item.description,
      estimatedMinutes: 8,
    })),
  ];

  const unique = sources.filter(
    (item, index, array) =>
      array.findIndex((candidate) => candidate.title === item.title) === index
  );

  const current = input.currentScore ?? 0;
  let running = current;
  let totalMinutes = 0;

  const items: ProductionRoadmapItem[] = unique.slice(0, 6).map((source, index) => {
    const defaultDelta = DEFAULT_SCORE_DELTAS[index] ?? 2;
    const remaining = 100 - running;
    const scoreDelta = Math.max(1, Math.min(defaultDelta, remaining));
    running += scoreDelta;
    totalMinutes += source.estimatedMinutes;

    return {
      rank: index + 1,
      title: source.title,
      description: source.description,
      category: inferCategory(source.title, source.description),
      scoreDelta,
      estimatedMinutes: source.estimatedMinutes,
    };
  });

  return {
    items,
    currentScore: input.currentScore,
    projectedScore: items.length > 0 ? Math.min(100, running) : input.currentScore,
    totalMinutes,
  };
}

export function normalizeTimelineTitle(title: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/security scan completed/i, "GitHub push analyzed"],
    [/incremental security scan/i, "GitHub push analyzed"],
    [/incremental production check/i, "GitHub push analyzed"],
    [/production readiness check completed/i, "GitHub push analyzed"],
    [/ai security insights/i, "Production insights updated"],
    [/ai production insights/i, "Production insights updated"],
    [/ai security analysis/i, "AI recommendations generated"],
    [/security score increased/i, "Production score increased"],
    [/security score decreased/i, "Production score decreased"],
    [/critical vulnerability/i, "Production blocker detected"],
    [/pull request security/i, "Pull request analyzed"],
  ];

  let result = title;
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(result)) return replacement;
  }
  return result;
}
