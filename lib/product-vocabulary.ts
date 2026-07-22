/**
 * Canonical product vocabulary for user-facing copy.
 * Prefer these terms in UI; avoid legacy security-scanner language.
 */
export const PRODUCT_VOCABULARY = {
  productionReview: "Production Review",
  productionVerdict: "Production Verdict",
  continuousReviews: "Continuous Reviews",
  nextAction: "Next Action",
  reviewHistory: "Review History",
  githubConnection: "GitHub Connection",
  project: "Project",
  deploymentRisk: "deployment risk",
  issue: "issue",
} as const;

export type ProductVocabularyKey = keyof typeof PRODUCT_VOCABULARY;
