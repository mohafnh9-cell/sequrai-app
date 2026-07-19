# ADR-001 Architecture Cleanup Report

**Status:** Complete
**Scope:** Remove ADR-001 violations found in the pre-implementation audit. No MCP V1 tool contracts were implemented in this task.
**Related:** `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`, `docs/PRODUCTION_ENGINE_V1.md`, `docs/MCP_V1_PRODUCTION_ENGINE.md`, `docs/SEVERITY_DOMAINS.md`

---

## 1. Active conflict resolved

**Conflict:** `estimateRiskFromScan` (`brain/production-readiness/calculator.ts`) computed an independent, product-level `riskScore` from severity counts, category counts, findings count, and detected stack. This is exactly the kind of parallel calculation ADR-001 forbids — a second place where a value that reads like a product decision was derived outside the Production Verdict Engine.

It had **two live runtime call sites**, not one:

1. `server/brain/build-project-brain.ts` — a *fallback* computation used whenever no persisted `risk_score` existed. This was the call site named explicitly in the cleanup request.
2. `server/github-automation/orchestrator.ts` — an **unconditional** computation run on every completed scan, feeding `server/github-automation/health.ts`'s `calculateRepositoryHealth()`, which used `riskScore >= 85` / `riskScore >= 65` thresholds to decide a repository's `healthStatus` (`excellent` / `good` / `needs_attention` / `critical`). That status was persisted to `repository_health` and `projects.repository_health`, and shown in the activity/timeline feed — a real product-facing signal computed independently of the canonical Production Verdict.

This second call site was not in the original request's file list. Per the instruction to "document every removed or replaced consumer" and to treat an "unexpected real consumer" carefully, it is called out here explicitly rather than silently left in place (which would have made the "fallback" removal cosmetic — `calculateRepositoryHealth` would have kept relying on the same deleted-in-spirit formula).

**Resolution:**
- `build-project-brain.ts`: the fallback computation was deleted outright. `riskScore` is now read **only** from persisted, separate-domain historical rows (`ai_reports.risk_score` — AI Security Engine report domain; `repository_health.risk_score` — GitHub automation health domain). Nothing computes a new value; it is either a real historical value or `null`.
- `orchestrator.ts` / `health.ts` / `post-scan.ts` / `activity.ts`: `estimateRiskFromScan` was removed entirely. `calculateRepositoryHealth()` no longer accepts or uses `riskScore` — its `healthStatus` thresholds are now derived only from `securityScore`, `openFindings`, `criticalOpen`, and `scoreTrend`, i.e. the same scanner-derived inputs the Verdict Engine already consumes. `repository_health.risk_score` and `security_timeline.risk_score` are now persisted as `null` for all new rows; historical rows are untouched.
- No consumer was left silently broken: `app/(dashboard)/timeline/page.tsx`'s risk display is already conditional (`event.risk_score !== null && ... &&`), so new events simply stop showing a risk line instead of rendering a stale/undefined value. The GitHub commit status check shown on PRs was **not** driven by `riskScore`/`healthStatus` at all (it uses `checkStatus` from `securityCheckStatus()` and the canonical `verdict` from `formatGithubCheckDescription()`), so it is unaffected.
- No value was invented as a replacement. `riskScore` was not silently redefined as `100 - score` or any other derived mapping, per the explicit instruction not to do so.

## 2. Legacy engine removal

**Audited:** `brain/production-readiness/calculator.ts` (`calculateProductionReadiness`, `estimateRiskFromScan`), `brain/production-readiness/dimensions.ts` (`DIMENSION_WEIGHTS`, `CATEGORY_TO_DIMENSIONS`, `DIMENSION_CATEGORY_MAP`, `DIMENSION_LABELS`), `brain/index.ts` exports, `brain/__tests__/calculator.test.ts`.

**Runtime consumer check (before deletion):**
- `calculateProductionReadiness`: zero runtime consumers outside its own test. The live translator that populates `ProductionReadyScore` (`server/brain/verdict-view-model.ts`'s `productionReadyFromVerdict`) derives every field directly from the canonical `ProductionVerdictV1` and does not call `calculateProductionReadiness` or use `DIMENSION_WEIGHTS`/`CATEGORY_TO_DIMENSIONS` — confirmed compliant with ADR-001 before this cleanup began.
- `estimateRiskFromScan`: two runtime consumers, both handled in §1 above and removed.
- `brain/production-readiness/dimensions.ts`: consumed only by `calculator.ts` itself; not re-exported or used anywhere else in the app.

No unexpected real consumer was found. Deletion proceeded.

**Removed:**
- `brain/production-readiness/calculator.ts` (deleted)
- `brain/production-readiness/dimensions.ts` (deleted)
- `brain/__tests__/calculator.test.ts` (deleted — tested only the deleted functions)
- Exports from `brain/index.ts` (`calculateProductionReadiness`, `estimateRiskFromScan`, `ReadinessInput`, `CATEGORY_TO_DIMENSIONS`, `DIMENSION_LABELS`, `DIMENSION_WEIGHTS`)
- `ReadinessInput` type import in `brain/production-verdict/build-verdict.ts` (this file only used the type, not the calculator function; a minimal local `LegacyReadinessInput` type was substituted so the `@deprecated` legacy adapter keeps compiling without resurrecting the deleted module)

No `@deprecated` shim or partial duplicate scoring engine was retained. The empty `brain/production-readiness/` directory no longer exists.

## 3. Severity domain boundaries

Documented in full in `docs/SEVERITY_DOMAINS.md`. Summary of the three domains and the rule:

| Domain | File | Scope | May influence Verdict? |
|---|---|---|---|
| Security Scanner severity | `features/security-scanner/constants.ts`, `scoring.ts` | Detection-time finding classification + raw scanner score | Input only — feeds normalized findings into the Verdict Engine |
| Production Verdict penalties/projection | `brain/production-verdict/projection.ts` | Canonical product decision (status, score, blockers, priorities, projection, recommendation) | **Yes — the only one that may** |
| AI Security Analyzer risk weighting | `features/ai-security-engine/risk-engine.ts` | Internal report prioritization only (`project_risk_scores`, timeline/insight display) | No — never exposed as verdict truth |

No broad severity refactor was performed, per instruction. Only naming/documentation clarity and one enforcement test (see §7) were added.

## 4. MCP public tools — before and after

**Before (7 registered, plus 5 additional undiscoverable-but-reachable switch cases):**

Registered in `MCP_TOOL_DEFINITIONS`:
`get_production_readiness`, `review_current_changes`, `explain_production_blocker`, `generate_blocker_fix`, `review_before_commit`, `list_projects`, `get_production_blockers`

Reachable via `executeMcpTool`'s switch but **not** publicly registered/discoverable:
`run_production_check` (alias of `review_current_changes`), `get_today_priorities`, `get_coach_tip`, `get_timeline`, `explain_issue` (alias of `explain_production_blocker`)

**After (exactly 5 registered, zero unregistered-but-reachable cases):**

`get_production_readiness`, `review_current_changes`, `explain_production_blocker`, `list_projects`, `get_production_blockers`

**Removed as confirmed duplicates** (already documented as duplicates in `docs/MCP_V1_PRODUCTION_ENGINE.md`'s own migration table before this cleanup):
- `generate_blocker_fix` — literal duplicate of `explain_production_blocker`.
- `review_before_commit` — literal duplicate of `get_production_readiness`.

**Removed as dead/unreachable-by-design cases** (never publicly registered, no test coverage, no client/bridge code, no beta consumer found in a repo-wide search):
- `run_production_check`, `get_today_priorities`, `get_coach_tip`, `get_timeline`, `explain_issue`.

Their handler functions (`getTodayPriorities`, `getCoachTip`, `getProductionTimeline` in `server/mcp/copilot-handlers.ts`) were deleted along with the switch cases, since nothing else called them. `runProductionCheck` (used by the legitimate `review_current_changes` case) was kept.

`list_projects` is retained as project-selection infrastructure, consistent with `docs/MCP_V1_PRODUCTION_ENGINE.md` §4, which explicitly states it "is not a sixth question" and "ships as infrastructure, never as a 6th capability."

`brain/copilot-contract.ts`'s `COPILOT_BRAIN_TOOLS` constant was updated to match the reduced registration exactly (previously included the two now-removed duplicates).

`README.md`'s MCP tool table documented all five legacy/undiscoverable names as if they were real tools — this was stale documentation and has been corrected to the actual five-tool surface.

**Not done in this task:** renaming the five current tools to the future canonical V1 names (`production_verdict` / `safe_fix_prompt` / `current_changes` / `production_history` / `deployment_confidence` per the MCP design doc, or `can_i_deploy` / `safe_fix` / `what_changed` / `production_history` / `deployment_confidence` per the cleanup request). That is MCP V1 implementation work and was explicitly out of scope for this cleanup.

## 5. Deprecated private handlers

None. Every handler behind a removed tool name was checked for other consumers before deletion (see §4); none were found, so nothing needed to be kept private/deprecated rather than deleted outright. There is no temporary compatibility layer and no removal deadline to track — the legacy names are fully gone from both the public registration and the internal switch.

## 6. Enforcement tests added

- `test/architecture/adr-001-enforcement.test.ts`
  - Fails if `calculateProductionReadiness` is reintroduced anywhere in `app/`, `brain/`, `server/`, or `features/`.
  - Fails if `estimateRiskFromScan` is reintroduced anywhere in the same tree.
  - Fails if any file outside `brain/production-verdict/` defines its own `SEVERITY_PENALTY` table (guards against a new shadow scoring engine appearing in MCP or project-brain adapters).
  - Fails if `brain/production-readiness/` is recreated.
- `server/mcp/__tests__/tool-surface.test.ts`
  - Fails if `MCP_TOOL_DEFINITIONS` does not have exactly 5 entries.
  - Fails on duplicate tool names.
  - Fails if `brain/copilot-contract.ts`'s `COPILOT_BRAIN_TOOLS` drifts from the MCP registration.
  - Fails if any of the seven removed legacy/duplicate tool names reappear in the registration.
  - Fails if `executeMcpTool`'s switch dispatches to any tool name not present in the public registration (source-scans `execute-tool.ts` for `case "..."` labels and checks each against the registered set) — this is the guard against a tool becoming reachable-but-undiscoverable again.

These use plain source scans and constant/array assertions, not a custom lint framework, per the instruction to keep enforcement simple and maintainable.

Agent/client-identity-affecting-verdict-inputs was audited manually (no such field exists anywhere in `brain/production-verdict/engine.ts`'s input type or `McpAuthContext`); no automated check was added for this because there is no stable string/import signature to scan for — it remains a manual review-time check per ADR-001 §"Agent identity exclusion", same as before this cleanup.

## 7. Files deleted

- `brain/production-readiness/calculator.ts`
- `brain/production-readiness/dimensions.ts`
- `brain/__tests__/calculator.test.ts`

## 8. Files modified

- `brain/index.ts` — removed legacy engine exports, added ADR-001 comment.
- `brain/copilot-contract.ts` — reduced `COPILOT_BRAIN_TOOLS` to the 5 registered tools.
- `brain/production-verdict/build-verdict.ts` — replaced `ReadinessInput` import (from the deleted module) with a local `LegacyReadinessInput` type for this `@deprecated` adapter.
- `server/brain/build-project-brain.ts` — removed the `estimateRiskFromScan` fallback; `riskScore` now read-only from persisted separate-domain rows.
- `server/github-automation/orchestrator.ts` — removed `estimateRiskFromScan` computation and its inputs (`stack`).
- `server/github-automation/health.ts` — removed `riskScore` from `calculateRepositoryHealth`'s input and thresholds.
- `server/github-automation/post-scan.ts` — removed `riskScore` from `finalizeScanAutomation`'s input and downstream calls.
- `server/github-automation/activity.ts` — `updateRepositoryHealth` and `recordTimelineEvent` now persist `risk_score: null` for new rows instead of a computed value.
- `server/github-automation/__tests__/health.test.ts` — updated fixtures to match the new `calculateRepositoryHealth` signature.
- `server/mcp/tool-definitions.ts` — removed `generate_blocker_fix` and `review_before_commit`; added ADR-001 comment.
- `server/mcp/execute-tool.ts` — removed dead/duplicate switch cases and unused imports.
- `server/mcp/copilot-handlers.ts` — deleted `getTodayPriorities`, `getCoachTip`, `getProductionTimeline` (no remaining callers).
- `server/mcp/request.schema.ts` — fixed a pre-existing Zod v4 `z.record()` signature break (unrelated to ADR-001, but blocked a clean typecheck) by supplying the required key schema.
- `README.md` — corrected the MCP tool table to the real 5-tool surface.

## 9. Files created

- `docs/SEVERITY_DOMAINS.md`
- `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md` (this report)
- `test/architecture/adr-001-enforcement.test.ts`
- `server/mcp/__tests__/tool-surface.test.ts`

`docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`, `docs/PRODUCTION_ENGINE_V1.md`, and `docs/MCP_V1_PRODUCTION_ENGINE.md` were updated in place (not recreated) to cross-reference this report and the enforcement tests.

## 10. Typecheck, lint, tests, and build results

All run from a clean state after the changes above:

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **Pass** — 0 errors (2 pre-existing errors fixed: a dangling import to the deleted calculator module, and an unrelated Zod v4 signature break in `server/mcp/request.schema.ts`) |
| Lint | `npm run lint` | **Pass** — 0 errors, 0 warnings |
| Tests | `npm run test` | **Pass** — 34 test files, 212 tests, 0 failures (includes the 2 new enforcement/contract test files) |
| Build | `npm run build` | **Pass** — `prisma generate && next build` completed successfully; all 26 static pages generated; all API routes (including `/api/mcp`, `/api/webhooks/github`, `/api/brain/*`) compiled |

Manual verification of the "no product truth lost" requirement:
- The web dashboard's verdict rendering path (`buildProjectBrain` → `productionReadyFromVerdict`/`prioritiesFromVerdict` → UI) was not touched beyond removing the dead `riskScore` fallback; `productionReady`, `currentVerdict`, and `todayPriorities` are computed exactly as before.
- Project pages, GitHub automation (webhook → scan → `finalizeScanAutomation` → commit status), and the MCP endpoint all compiled and their corresponding test suites (`server/github-automation/__tests__/*`, `server/mcp/__tests__/*`, `brain/__tests__/*`) pass unchanged in behavior (only `health.test.ts` fixtures were updated to match the new, narrower `calculateRepositoryHealth` signature — the assertions on resulting `status` values are unchanged).
- No score, status, blocker count, or recommendation value changed meaning. Only the independently-computed `riskScore`/health thresholds tied to it were removed; the canonical Production Verdict fields were never touched.

## 11. Remaining conflicts

None found that block MCP V1 implementation. Two items are worth tracking as they are not violations but are related follow-ups:

1. `features/ai-security-engine/risk-engine.ts`'s `calculateRiskScore` remains a legitimate, separate, internal-only domain (see `docs/SEVERITY_DOMAINS.md` §3). It is correctly unexposed as verdict truth today. No action was required, but it is the one remaining "risk score"-shaped value in the codebase and should be re-audited if it is ever wired into a new surface.
2. `brain/production-verdict/build-verdict.ts` and its `buildProductionVerdict()` function are already marked `@deprecated` in favor of `generateProductionVerdict` (`./engine.ts`) and are used only by their own test file. They were not removed in this cleanup because they were not named in the request and are not an ADR-001 violation (they delegate to the real engine and only adapt the shape) — but they are a candidate for deletion in a future cleanup pass once the last test depending on the legacy shape is migrated.

## 12. Recommendation

**YES.**

All active and latent ADR-001 violations identified in the audit were removed:
- The parallel risk score (`estimateRiskFromScan`) is deleted from both of its live call sites, with no invented replacement value.
- The legacy production-readiness engine is fully deleted, not retained as a deprecated duplicate.
- Severity weighting domains are documented and bounded, with an automated guard against a fourth domain appearing.
- The MCP public surface is exactly five tools, matching the ADR-001 constraint, with an automated contract test enforcing the count and cross-file consistency, and a guard against a tool becoming reachable-but-undiscoverable again.
- Documentation matches the code as of this cleanup.
- Typecheck, lint, the full test suite, and the production build all pass cleanly.

The codebase is safe to begin MCP V1 implementation (the five new tool contracts and their `production_verdict` / `safe_fix_prompt` / `current_changes` / `production_history` / `deployment_confidence` naming, per `docs/MCP_V1_PRODUCTION_ENGINE.md`) as a follow-up task.
