export type PriorityLevel = "low" | "medium" | "high" | "very_high" | "critical";
export type Difficulty = "easy" | "medium" | "hard";
export type ImpactLevel = "low" | "medium" | "high" | "critical";

export interface FindingContext {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: string;
  confidence: string;
  category: string;
  filePath: string;
  startLine: number;
  codeSnippet?: string | null;
  evidence?: string | null;
  recommendation: string;
}

export interface ProjectSecurityContext {
  organizationId: string;
  projectId: string;
  projectName: string;
  scanId: string;
  securityScore: number;
  findingsCount: number;
  severityCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  stack: {
    languages: string[];
    frameworks: string[];
    services: string[];
    packageManagers: string[];
  };
  findings: FindingContext[];
  previousScores: number[];
  recurringPatterns: string[];
  locale?: "en" | "es";
}

export interface ScanAnalysisResult {
  executiveSummary: string;
  coachTip: string;
  riskScore: number;
  priorityLevel: PriorityLevel;
  riskFactors: Record<string, number>;
  priorities: Array<{
    rank: number;
    title: string;
    description: string;
    findingIds: string[];
    patternGroup?: string;
    estimatedMinutes: number;
    difficulty: Difficulty;
    securityImpact: ImpactLevel;
  }>;
  recommendations: Array<{
    category: string;
    title: string;
    description: string;
    rationale: string;
    stackTags: string[];
    priority: "low" | "medium" | "high";
    estimatedMinutes: number;
  }>;
  insights: Array<{
    insightType: string;
    title: string;
    body: string;
    metricValue?: number;
    metricDelta?: number;
  }>;
  learning: Array<{
    learningType: string;
    content: Record<string, unknown>;
  }>;
  findingFixes: Array<FindingFixResult>;
}

export interface FindingFixResult {
  findingId: string;
  explanationSimple: string;
  explanationTechnical: string;
  risk: string;
  impact: string;
  exploitationProbability: string;
  fixExplanation: string;
  codeSuggestion?: string;
  diffPatch?: string;
  cursorPrompt: string;
  claudePrompt: string;
  implementationSteps: string[];
  validationChecklist: string[];
  estimatedMinutes: number;
  difficulty: Difficulty;
  securityImprovement: ImpactLevel;
}
