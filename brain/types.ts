import type { ProjectProductionStatus } from "./production-experience/project-status";

export const BRAIN_VERSION = "0.1.0";

export type ReadinessDimensionKey =
  | "security"
  | "architecture"
  | "bestPractices"
  | "performance"
  | "authentication"
  | "databaseDesign"
  | "deploymentReadiness";

export type ReadinessDimensions = Record<ReadinessDimensionKey, number | null>;

export type ProductionReadyScore = {
  overall: number | null;
  dimensions: ReadinessDimensions;
  blockersCount: number;
  improvementsCount: number;
  estimatedMinutesToReady: number;
  readyForProduction: boolean;
};

export type BrainPriority = {
  rank: number;
  title: string;
  description: string;
  estimatedMinutes?: number;
  source: "ai" | "scan";
};

export type BrainActivityEvent = {
  id: string;
  eventType: string;
  title: string;
  description: string | null;
  occurredAt: string;
  source: "repository_activity" | "security_timeline";
};

export type ProjectBrainSnapshot = {
  projectId: string;
  organizationId: string;
  projectName: string;
  githubRepo: string | null;
  productionReady: ProductionReadyScore;
  securityScore: number | null;
  riskScore: number | null;
  healthStatus: string | null;
  lastScanAt: string | null;
  lastCommitSha: string | null;
  webhookEnabled: boolean;
  todayPriorities: BrainPriority[];
  coachTip: string | null;
  executiveSummary: string | null;
  recentActivity: BrainActivityEvent[];
  snapshotAt: string;
  brainVersion: typeof BRAIN_VERSION;
};

export type ProjectBrainSummary = {
  projectId: string;
  projectName: string;
  productionReady: number | null;
  blockersCount: number;
  healthStatus: string | null;
  status: ProjectProductionStatus;
};

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

export type OrgBrainSnapshot = {
  organizationId: string;
  averageProductionReady: number | null;
  averageDimensions: ReadinessDimensions;
  totalBlockers: number;
  totalEstimatedMinutes: number;
  productionRoadmap: ProductionRoadmap;
  projects: ProjectBrainSummary[];
  todayPriorities: BrainPriority[];
  recentActivity: BrainActivityEvent[];
  snapshotAt: string;
  brainVersion: typeof BRAIN_VERSION;
};
