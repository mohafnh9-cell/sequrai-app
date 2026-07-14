export { scanRepository, deduplicateFindings } from "./scanner";
export type { ScanOptions } from "./scanner";
export { DEFAULT_SCAN_CONFIG, resolveConfig } from "./config";
export type { ScanConfig, ScanConfigInput } from "./config";
export { sanitizePath, extensionOf } from "./path";
export { normalizeFiles } from "./normalization";
export { redactEvidence, maskSecret } from "./redaction";
export { stableHash, findingFingerprint } from "./fingerprint";
export { detectStack } from "./stack";
export { scoreFindings } from "./scoring";
export { RuleRegistry, createDefaultRegistry } from "./rules/registry";
export { LOCAL_DEPENDENCY_CATALOG } from "./rules/dependencies";
export type { ScanRule, RuleContext } from "./rules/types";
export type {
  Confidence,
  Finding,
  FindingDraft,
  InputFile,
  NormalizedFile,
  ScanMetrics,
  ScanOmission,
  ScanResult,
  ScoreBreakdown,
  Severity,
  StackProfile,
} from "./types";
