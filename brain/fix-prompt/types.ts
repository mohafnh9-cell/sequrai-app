import type { VerdictStatus } from "@/brain/production-verdict/schema";
import type { SafeFixAssessment } from "./assessment";

export type FixPromptStack = {
  languages: string[];
  frameworks: string[];
  services: string[];
};

export type ProductionFixPromptInput = {
  projectName?: string;
  issueTitle: string;
  issueDescription: string;
  category: string;
  severity: string;
  whyItMatters: string;
  estimatedImpact?: string;
  affectedFiles: string[];
  stack: FixPromptStack;
  recommendedAction: string;
  estimatedFixMinutes?: number;
  projectedScoreImpact?: number;
  currentVerdictStatus?: VerdictStatus;
  currentScore?: number | null;
  buildCommands?: string[];
};

export type ProductionFixPromptResult = {
  prompt: string;
  projectedVerdictLabel: string;
  assessment: SafeFixAssessment;
};
