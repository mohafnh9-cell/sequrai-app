import type { ProductionVerdictV1 } from "@/brain/production-verdict/schema";
import type { AreaProgress } from "./schema";

function areaStatusFromAssessment(
  area: { status: string; score: number | null }
): "evaluated" | "partial" | "not_evaluated" {
  if (area.status === "evaluated") return "evaluated";
  if (area.status === "partial") return "partial";
  return "not_evaluated";
}

export function buildAreasProgress(
  previous: ProductionVerdictV1 | null,
  current: ProductionVerdictV1 | null
): AreaProgress[] {
  if (!current) return [];

  const previousByKey = new Map<string, { score: number | null; label: string; status: string }>();
  if (previous) {
    for (const area of [
      ...previous.evaluatedAreas,
      ...previous.partiallyEvaluatedAreas,
      ...previous.unevaluatedAreas,
    ]) {
      previousByKey.set(area.key, {
        score: area.score,
        label: area.label,
        status: area.status,
      });
    }
  }

  const currentAreas = [
    ...current.evaluatedAreas,
    ...current.partiallyEvaluatedAreas,
    ...current.unevaluatedAreas,
  ];

  return currentAreas.map((area) => {
    const prev = previousByKey.get(area.key);
    return {
      key: area.key,
      label: area.label,
      previousScore: prev?.score ?? null,
      currentScore: area.score,
      status: areaStatusFromAssessment(area),
    };
  });
}
