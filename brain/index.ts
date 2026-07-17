export type {
  BrainActivityEvent,
  BrainPriority,
  OrgBrainSnapshot,
  ProductionReadyScore,
  ProjectBrainSnapshot,
  ProjectBrainSummary,
  ReadinessDimensionKey,
  ReadinessDimensions,
} from "./types";
export { BRAIN_VERSION } from "./types";
export {
  calculateProductionReadiness,
  estimateRiskFromScan,
  type ReadinessInput,
} from "./production-readiness/calculator";
export {
  CATEGORY_TO_DIMENSIONS,
  DIMENSION_LABELS,
  DIMENSION_WEIGHTS,
} from "./production-readiness/dimensions";
export {
  buildProductionRoadmap,
  normalizeTimelineTitle,
  type ProductionRoadmap,
  type ProductionRoadmapItem,
} from "./production-experience/roadmap";
export {
  getProductionLevel,
  isReadyToDeploy,
  isSeniorEngineerApproved,
  PRODUCTION_LEVELS,
  type ProductionLevel,
  type ProductionLevelId,
} from "./production-experience/levels";
export {
  getHeroHeadline,
  getHeroSubheadline,
  getProjectProductionStatus,
  getProjectStatusBadgeVariant,
  PROJECT_STATUS_LABELS,
  type ProjectProductionStatus,
} from "./production-experience/project-status";
export {
  buildProductionVerdict,
  formatGithubCheckDescription,
  formatGithubCheckSummary,
  formatMcpVerdictSummary,
  githubVerdictLabel,
  PRODUCTION_VERDICT_LABELS,
  type ProductionVerdict,
  type ProductionVerdictPriority,
  type ProductionVerdictV1,
  type EvaluatedArea,
} from "./production-verdict/build-verdict";
export {
  PRODUCTION_VERDICT_VERSION,
  VERDICT_STATUS_LABELS,
  ProductionVerdictSchema,
  parseProductionVerdict,
} from "./production-verdict/schema";
export { generateProductionVerdict } from "./production-verdict/engine";
export type { VerdictStatus, ProductionPriority, ProductionAreaAssessment } from "./production-verdict/schema";
export {
  verdictLabel,
  verdictDescription,
  verdictBadgeVariant,
  verdictHeadlineDisplay,
  verdictToneClass,
  verdictRecommendedAction,
  displayScore,
  shouldShowScore,
  legacyStatusToV1,
} from "./production-verdict/status-ui";
export {
  heroViewFromVerdict,
  heroViewFromOrgBrain,
  heroScoreDisplay,
  type ProductionHeroViewModel,
} from "./production-verdict/hero-view";
export { assertConsumerConsistency } from "./production-verdict/adapters/consistency";
export {
  verdictExperienceFromVerdict,
  projectSummaryCopy,
  buildDeltaNarrative,
  type VerdictExperienceView,
} from "./production-verdict/experience-view";
