import type { ReadinessDimensionKey } from "../types";

export const DIMENSION_WEIGHTS: Record<ReadinessDimensionKey, number> = {
  security: 0.25,
  authentication: 0.15,
  databaseDesign: 0.1,
  bestPractices: 0.15,
  architecture: 0.1,
  performance: 0.1,
  deploymentReadiness: 0.15,
};

export const DIMENSION_LABELS: Record<ReadinessDimensionKey, string> = {
  security: "Security",
  architecture: "Architecture",
  bestPractices: "Best Practices",
  performance: "Performance",
  authentication: "Authentication",
  databaseDesign: "Database Design",
  deploymentReadiness: "Deployment Readiness",
};

export const CATEGORY_TO_DIMENSIONS: Record<string, ReadinessDimensionKey[]> = {
  secrets: ["security", "bestPractices", "deploymentReadiness"],
  authentication: ["authentication", "security"],
  authorization: ["authentication", "security"],
  injection: ["security"],
  xss: ["security", "bestPractices"],
  web: ["security", "deploymentReadiness"],
  configuration: ["deploymentReadiness", "bestPractices"],
  cors: ["deploymentReadiness"],
  headers: ["deploymentReadiness"],
  supabase: ["databaseDesign", "authentication"],
  database: ["databaseDesign"],
  dependencies: ["security", "bestPractices"],
};

export const DIMENSION_CATEGORY_MAP: Record<ReadinessDimensionKey, string[]> = {
  security: ["secrets", "injection", "xss", "web", "dependencies", "authentication", "authorization"],
  authentication: ["authentication", "authorization", "supabase"],
  databaseDesign: ["supabase", "database"],
  bestPractices: ["secrets", "xss", "configuration", "dependencies"],
  architecture: [],
  performance: [],
  deploymentReadiness: ["configuration", "cors", "headers", "web", "secrets"],
};
