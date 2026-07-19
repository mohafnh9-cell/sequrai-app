# Severity & Risk Weighting Domains

Status: Active
Related: `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`, `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md`

## Why this note exists

The codebase contains multiple, intentionally separate severity/risk weighting
tables. Before this note, their boundaries were implicit. ADR-001 requires
that only the Production Verdict Engine may calculate product truth. This
note makes the domain boundaries explicit so a severity/weight table is never
mistaken for — or wired into — the canonical verdict by accident.

There are exactly three severity/risk domains in this codebase. They must
never be merged, and only one of them may influence the Production Verdict.

## 1. Security Scanner severity — detection & finding classification

- File: `features/security-scanner/constants.ts` (`SEVERITY_WEIGHT`)
- File: `features/security-scanner/scoring.ts`
- Purpose: classifies raw findings as they are detected (`critical` / `high`
  / `medium` / `low` / `info`) and produces the scanner's own raw
  `securityScore` for a scan.
- Scope: detection-time classification only. This is the scanner's opinion
  about a single finding, not a product decision.
- Allowed use: its output (normalized findings + raw `securityScore`) is a
  valid **input** to the Production Verdict Engine. The scanner does not, and
  must not, produce a verdict, status, blocker count, or deployment
  recommendation itself.

## 2. Production Verdict penalties/projection — canonical product decision

- File: `brain/production-verdict/projection.ts` (`SEVERITY_PENALTY`)
- File: `brain/production-verdict/*` (engine, build-verdict, status-rules,
  coverage, fix-time, priorities)
- Purpose: the **only** weighting table permitted to influence:
  - verdict status
  - Production Ready Score
  - blocker count
  - priority ordering
  - projected score
  - deployment recommendation inputs
- Scope: this is product truth. Per ADR-001, this is the single source of
  truth for all of the above. No other module may replicate, shadow, or
  override these weights.

## 3. AI Security Analyzer risk weighting — internal analysis prioritization only

- File: `features/ai-security-engine/risk-engine.ts` (`calculateRiskScore`,
  `SEVERITY_WEIGHT`, `EXPOSURE_BY_CATEGORY`)
- File: `server/ai-security-engine/claude-analyzer.ts`,
  `server/ai-security-engine/pipeline.ts`
- Purpose: an internal heuristic used only to order/prioritize findings and
  narrative insights inside the AI analysis report (e.g. "contextual risk is
  62 because of severity mix and stack exposure"). Persisted to
  `project_risk_scores` (a separate report table, migration `005`) and
  surfaced only in report/insight views such as
  `app/(dashboard)/timeline/page.tsx` and
  `app/api/security-intelligence/route.ts`.
- Scope: this value must never be exposed as, or consumed as, Production
  Verdict truth. It does not feed `can_i_deploy`, `safe_fix`,
  `deployment_confidence`, or any verdict field. It is a report-domain
  artifact, analogous to a persisted historical `risk_score` — display-only.

## Rules (enforced)

1. Only Production Verdict weights (`brain/production-verdict/projection.ts`)
   may influence status, score, blockers, priorities, projections, or
   deployment recommendation.
2. Scanner severity (`features/security-scanner/constants.ts`) may only feed
   normalized findings into the Verdict Engine as an input.
3. AI analyzer risk weighting (`features/ai-security-engine/risk-engine.ts`)
   must never be exposed as, or consumed as, Production Verdict truth. It may
   only drive its own internal report prioritization.
4. Naming must keep domains obvious: `SEVERITY_WEIGHT` in the scanner and the
   AI analyzer are intentionally scoped to their own module and are not
   exported for reuse elsewhere. `SEVERITY_PENALTY` in
   `production-verdict/projection.ts` is the only weighting table exported
   from the Production Verdict Engine's public surface (`@/brain`).

## What changed in the cleanup (see the full report for details)

- The former "active parallel risk score" (`estimateRiskFromScan`, deleted)
  was a fourth, undocumented weighting formula that mixed inputs from domains
  1 and 3 to produce a value consumed as if it were product truth. It has
  been removed entirely — see
  `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md`.
