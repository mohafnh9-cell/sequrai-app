import type { VerdictStatus } from "@/brain/production-verdict/schema";

export type DeploymentDecision = "deploy" | "do_not_deploy" | "more_analysis_required";

/**
 * ADR-001: this is a fixed, documented translation table from the canonical
 * verdict status to a deployment decision. It never inspects scores,
 * findings, or any other raw input — status is already product truth
 * computed by the Production Verdict Engine.
 *
 *   ready_to_ship                              -> deploy
 *   almost_ready / needs_improvement / not_ready -> do_not_deploy
 *   insufficient_data / analysis_failed        -> more_analysis_required
 */
export function mapVerdictStatusToDecision(status: VerdictStatus): DeploymentDecision {
  switch (status) {
    case "ready_to_ship":
      return "deploy";
    case "almost_ready":
    case "needs_improvement":
    case "not_ready":
      return "do_not_deploy";
    case "insufficient_data":
    case "analysis_failed":
      return "more_analysis_required";
  }
}
