import type { ProductionPriority } from "./schema";

type FixTimeInput = Pick<
  ProductionPriority,
  "category" | "severity" | "affectedFiles" | "findingIds"
> & { requiresMigration?: boolean };

export function estimateFixTime(input: FixTimeInput): {
  minutes: number;
  label: string;
} {
  const fileCount = input.affectedFiles.length || 1;
  const findingCount = input.findingIds.length || 1;

  if (input.severity === "critical" && input.category === "data_protection") {
    return { minutes: 4, label: "2–5 min" };
  }

  if (input.category === "authorization" && fileCount >= 3) {
    return { minutes: 20, label: "10–20 min" };
  }

  if (input.category === "authentication") {
    return findingCount > 2
      ? { minutes: 30, label: "30–60 min" }
      : { minutes: 15, label: "10–20 min" };
  }

  if (input.category === "deployment") {
    return { minutes: 8, label: "5–10 min" };
  }

  if (input.severity === "critical") {
    return { minutes: 10, label: "10–20 min" };
  }

  if (input.severity === "high") {
    return fileCount > 2
      ? { minutes: 15, label: "10–20 min" }
      : { minutes: 5, label: "2–5 min" };
  }

  if (input.requiresMigration) {
    return { minutes: 45, label: "Requires manual review" };
  }

  return { minutes: 5, label: "2–5 min" };
}

export function applyFixTimeEstimates(
  priorities: ProductionPriority[]
): ProductionPriority[] {
  return priorities.map((priority) => {
    const { minutes, label } = estimateFixTime(priority);
    return {
      ...priority,
      estimatedMinutes: minutes,
      estimatedTimeLabel: label,
    };
  });
}

export function totalEstimatedMinutes(priorities: ProductionPriority[]): number {
  return priorities.reduce((sum, p) => sum + p.estimatedMinutes, 0);
}
