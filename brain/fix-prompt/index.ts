export type { FixPromptStack, ProductionFixPromptInput, ProductionFixPromptResult } from "./types";
export type {
  SafeFixAssessment,
  ImplementationRisk,
  ScopeComplexity,
} from "./assessment";
export {
  stackFromProfile,
  stackFromDetectedStack,
  formatStackLines,
  defaultStackFromFramework,
} from "./format-stack";
export { guidanceForCategory } from "./category-guidance";
export {
  assessSafeFix,
  formatEstimatedFixTime,
  riskColor,
} from "./assessment";
export {
  buildProductionFixPrompt,
  buildSafeFixPrompt,
  projectedVerdictAfterFix,
  projectedVerdictStatusAfterFix,
  projectedScoreAfterFix,
  fixPromptInputFromPriority,
  fixPromptInputFromFinding,
  findingsByIdMap,
} from "./build-production-fix-prompt";
