import type { ProductionJourney } from "@/brain/production-journey/schema";
import type { WhatChangedItem } from "./schema";

function areaImprovementKey(label: string): string | null {
  const normalized = label.trim().toLowerCase();
  const map: Record<string, string> = {
    authentication: "whatChanged.areaAuthentication",
    authorization: "whatChanged.areaAuthorization",
    security: "whatChanged.areaSecurity",
    dependencies: "whatChanged.areaDependencies",
    deployment: "whatChanged.areaDeployment",
    performance: "whatChanged.areaPerformance",
    database: "whatChanged.areaDatabase",
  };
  for (const [needle, key] of Object.entries(map)) {
    if (normalized.includes(needle)) return key;
  }
  return null;
}

export function buildWhatChanged(journey: ProductionJourney): {
  items: WhatChangedItem[];
  improvements: WhatChangedItem[];
  regressions: WhatChangedItem[];
  hasChanges: boolean;
} {
  const latest = journey.timeline[journey.timeline.length - 1];
  const items: WhatChangedItem[] = [];

  if (latest?.scoreDelta != null && latest.scoreDelta !== 0) {
    items.push({
      id: "score-delta",
      kind: latest.scoreDelta > 0 ? "improvement" : "regression",
      messageKey:
        latest.scoreDelta > 0
          ? "whatChanged.scoreIncreased"
          : "whatChanged.scoreDecreased",
      params: { points: Math.abs(latest.scoreDelta) },
    });
  }

  if (latest && latest.resolvedBlockersCount > 0) {
    items.push({
      id: "blockers-resolved",
      kind: "improvement",
      messageKey: "whatChanged.blockersResolved",
      params: { count: latest.resolvedBlockersCount },
    });
  }

  if (latest && latest.introducedBlockersCount > 0) {
    items.push({
      id: "blockers-introduced",
      kind: "regression",
      messageKey: "whatChanged.blockersIntroduced",
      params: { count: latest.introducedBlockersCount },
    });
  }

  for (const area of journey.areasProgress) {
    if (
      area.status === "evaluated" &&
      area.previousScore != null &&
      area.currentScore != null &&
      area.currentScore > area.previousScore
    ) {
      const key = areaImprovementKey(area.label);
      if (key) {
        items.push({
          id: `area-${area.key}`,
          kind: "improvement",
          messageKey: key,
        });
      }
    }
  }

  const improvements = items.filter((item) => item.kind === "improvement");
  const regressions = items.filter((item) => item.kind === "regression");

  return {
    items,
    improvements,
    regressions,
    hasChanges: items.length > 0,
  };
}
