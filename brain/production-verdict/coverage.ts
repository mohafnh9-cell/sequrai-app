import type { NormalizedFinding } from "./normalize-finding";
import type { AreaKey, ProductionAreaAssessment } from "./schema";

const AREA_DEFINITIONS: Record<
  AreaKey,
  { label: string; defaultStatus: ProductionAreaAssessment["status"]; methodology: string; limitations?: string }
> = {
  security: {
    label: "Security",
    defaultStatus: "evaluated",
    methodology: "Static analysis of source files against security rules.",
  },
  authentication: {
    label: "Authentication",
    defaultStatus: "partial",
    methodology: "Inferred from auth-related findings and configuration patterns.",
    limitations: "Runtime auth flows are not executed.",
  },
  authorization: {
    label: "Authorization",
    defaultStatus: "partial",
    methodology: "Inferred from authorization and access-control findings.",
    limitations: "Resource ownership is not tested at runtime.",
  },
  data_protection: {
    label: "Data Protection",
    defaultStatus: "partial",
    methodology: "Secrets and sensitive data exposure via static rules.",
    limitations: "Encryption at rest and transit not fully verified.",
  },
  dependencies: {
    label: "Dependencies",
    defaultStatus: "not_evaluated",
    methodology: "Dependency manifest analysis when lockfiles are scanned.",
    limitations: "CVE database lookup not included in v1.",
  },
  architecture: {
    label: "Architecture",
    defaultStatus: "partial",
    methodology: "Lightweight structural inference from file patterns.",
    limitations: "No runtime topology or load analysis.",
  },
  testing: {
    label: "Testing",
    defaultStatus: "not_evaluated",
    methodology: "Not assessed in v1.",
    limitations: "Test coverage and quality are not analyzed.",
  },
  performance: {
    label: "Performance",
    defaultStatus: "not_evaluated",
    methodology: "Not assessed in v1.",
    limitations: "No profiling or load testing.",
  },
  deployment: {
    label: "Deployment",
    defaultStatus: "partial",
    methodology: "Configuration and deployment-related static checks.",
    limitations: "Actual deployment environment not inspected.",
  },
  observability: {
    label: "Observability",
    defaultStatus: "not_evaluated",
    methodology: "Not assessed in v1.",
    limitations: "Logging, metrics, and tracing not verified.",
  },
  database: {
    label: "Database",
    defaultStatus: "partial",
    methodology: "SQL, RLS, and database configuration findings.",
    limitations: "Live database policies not executed.",
  },
  reliability: {
    label: "Reliability",
    defaultStatus: "not_evaluated",
    methodology: "Not assessed in v1.",
    limitations: "Fault tolerance and resilience not tested.",
  },
};

const CATEGORY_TO_AREAS: Record<string, AreaKey[]> = {
  secrets: ["security", "data_protection"],
  authentication: ["authentication", "security"],
  authorization: ["authorization", "authentication"],
  injection: ["security", "database"],
  xss: ["security"],
  web: ["security", "deployment"],
  configuration: ["deployment", "security"],
  database: ["database", "security"],
  dependencies: ["dependencies"],
  architecture: ["architecture"],
};

function areaEvidenceCount(area: AreaKey, findings: NormalizedFinding[]): number {
  return findings.filter((f) => {
    const areas = CATEGORY_TO_AREAS[f.category] ?? ["security"];
    return areas.includes(area);
  }).length;
}

function resolveAreaStatus(
  area: AreaKey,
  evidenceCount: number,
  filesAnalyzed: number
): ProductionAreaAssessment["status"] {
  const def = AREA_DEFINITIONS[area];
  if (def.defaultStatus === "not_evaluated" && evidenceCount === 0) {
    return "not_evaluated";
  }
  if (def.defaultStatus === "evaluated" && filesAnalyzed > 0) {
    return "evaluated";
  }
  if (evidenceCount > 0 || (area === "security" && filesAnalyzed > 0)) {
    return def.defaultStatus === "not_evaluated" ? "partial" : def.defaultStatus;
  }
  if (def.defaultStatus === "evaluated") return "evaluated";
  if (def.defaultStatus === "partial" && filesAnalyzed > 0) return "partial";
  return "not_evaluated";
}

function areaScore(
  area: AreaKey,
  status: ProductionAreaAssessment["status"],
  securityScore: number | null,
  evidenceCount: number
): number | null {
  if (status === "not_evaluated") return null;
  if (securityScore === null) return null;
  if (area === "security") return securityScore;

  const penalty = Math.min(40, evidenceCount * 8);
  if (status === "partial") {
    return Math.max(0, Math.min(100, Math.round(securityScore * 0.85 - penalty)));
  }
  return Math.max(0, Math.min(100, securityScore - penalty));
}

export function assessCoverage(input: {
  findings: NormalizedFinding[];
  securityScore: number | null;
  filesAnalyzed: number;
}): {
  evaluatedAreas: ProductionAreaAssessment[];
  partiallyEvaluatedAreas: ProductionAreaAssessment[];
  unevaluatedAreas: ProductionAreaAssessment[];
  coverageRatio: number | null;
} {
  const { findings, securityScore, filesAnalyzed } = input;
  const allAreas = Object.keys(AREA_DEFINITIONS) as AreaKey[];

  const assessments: ProductionAreaAssessment[] = allAreas.map((key) => {
    const def = AREA_DEFINITIONS[key];
    const evidenceCount = areaEvidenceCount(key, findings);
    const status = resolveAreaStatus(key, evidenceCount, filesAnalyzed);
    const score = areaScore(key, status, securityScore, evidenceCount);

    let confidence: ProductionAreaAssessment["confidence"] = "low";
    if (status === "evaluated") confidence = "high";
    else if (status === "partial" && evidenceCount > 0) confidence = "medium";

    return {
      key,
      label: def.label,
      status,
      score,
      confidence,
      evidenceCount,
      methodology: def.methodology,
      limitations: def.limitations,
    };
  });

  const evaluatedAreas = assessments.filter((a) => a.status === "evaluated");
  const partiallyEvaluatedAreas = assessments.filter((a) => a.status === "partial");
  const unevaluatedAreas = assessments.filter((a) => a.status === "not_evaluated");

  const coverageRatio =
    filesAnalyzed > 0
      ? Math.min(
          1,
          Math.max(
            filesAnalyzed >= 10 ? 0.2 : 0,
            findings.length > 0
              ? 0.4 + Math.min(0.6, filesAnalyzed / 200)
              : filesAnalyzed / 100
          )
        )
      : null;

  return {
    evaluatedAreas,
    partiallyEvaluatedAreas,
    unevaluatedAreas,
    coverageRatio,
  };
}

export function hasSufficientCoverage(input: {
  filesAnalyzed: number;
  coverageRatio: number | null;
  scanStatus: string;
}): boolean {
  if (input.scanStatus === "failed") return false;
  if (input.filesAnalyzed < 3) return false;
  if (input.coverageRatio != null && input.coverageRatio < 0.15) return false;
  return true;
}
