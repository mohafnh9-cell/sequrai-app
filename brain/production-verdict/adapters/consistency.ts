import type { ProductionVerdictV1 } from "../schema";
import { formatGithubCheckDescription } from "./format";
import { formatMcpVerdictSummary } from "./format";

export type VerdictConsumerSnapshot = {
  status: ProductionVerdictV1["status"];
  score: number | null;
  scoreDelta: number | null;
  blockersCount: number;
  priorityTitles: string[];
  evaluatedAreaCount: number;
};

export function snapshotFromVerdict(verdict: ProductionVerdictV1): VerdictConsumerSnapshot {
  return {
    status: verdict.status,
    score: verdict.score,
    scoreDelta: verdict.scoreDelta,
    blockersCount: verdict.blockersCount,
    priorityTitles: verdict.topPriorities.map((p) => p.title),
    evaluatedAreaCount:
      verdict.evaluatedAreas.length + verdict.partiallyEvaluatedAreas.length,
  };
}

export function dashboardAdapter(verdict: ProductionVerdictV1): VerdictConsumerSnapshot {
  return snapshotFromVerdict(verdict);
}

export function projectAdapter(verdict: ProductionVerdictV1): VerdictConsumerSnapshot {
  return snapshotFromVerdict(verdict);
}

export function scanAdapter(verdict: ProductionVerdictV1): VerdictConsumerSnapshot {
  return snapshotFromVerdict(verdict);
}

export function githubAdapter(verdict: ProductionVerdictV1): VerdictConsumerSnapshot & {
  description: string;
} {
  return {
    ...snapshotFromVerdict(verdict),
    description: formatGithubCheckDescription(verdict),
  };
}

export function mcpAdapter(verdict: ProductionVerdictV1): VerdictConsumerSnapshot & {
  summary: string;
} {
  return {
    ...snapshotFromVerdict(verdict),
    summary: formatMcpVerdictSummary(verdict),
  };
}

export function assertConsumerConsistency(verdict: ProductionVerdictV1): boolean {
  const base = snapshotFromVerdict(verdict);
  const consumers = [
    dashboardAdapter(verdict),
    projectAdapter(verdict),
    scanAdapter(verdict),
    snapshotFromVerdict(verdict),
  ];

  return consumers.every(
    (consumer) =>
      consumer.status === base.status &&
      consumer.score === base.score &&
      consumer.scoreDelta === base.scoreDelta &&
      consumer.blockersCount === base.blockersCount &&
      consumer.priorityTitles.join("|") === base.priorityTitles.join("|")
  );
}
