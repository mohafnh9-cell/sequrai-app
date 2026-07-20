export type WorkspacePresentation = {
  id: string;
  name: string;
  plan: string | null;
  logoUrl: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  BUILDER: "Builder",
  STUDIO: "Studio",
  AGENCY: "Agency",
};

export function formatWorkspacePlan(plan: string | null | undefined): string | null {
  if (!plan || plan === "FREE") return null;
  return PLAN_LABELS[plan] ?? plan;
}

export function getWorkspaceInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "W";

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase();
  }

  const compact = words[0] ?? trimmed;
  if (compact.length >= 2) return compact.slice(0, 2).toUpperCase();
  return compact.slice(0, 1).toUpperCase();
}

/** Deterministic accent for generated workspace avatars (HSL string). */
export function getWorkspaceAccentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 48% 42%)`;
}

export function partitionWorkspaces(
  workspaces: WorkspacePresentation[],
  activeWorkspaceId: string | null
) {
  const active =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0] ?? null;
  const others = workspaces.filter((workspace) => workspace.id !== active?.id);
  return { active, others };
}
