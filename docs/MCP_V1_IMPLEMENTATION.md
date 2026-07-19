# MCP V1 — Canonical Tool Implementation

**Status:** IMPLEMENTED
**Applies to:** the public SequrAI MCP server (`/api/mcp`), consumed by Cursor, Claude Code, and any future MCP-compatible client.
**Governed by:** `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`, `docs/MCP_V1_PRODUCTION_ENGINE.md`, `docs/PRODUCTION_ENGINE_V1.md`, `docs/SEVERITY_DOMAINS.md`.

This document describes what the SequrAI MCP server does, exactly. It is the reference for the final public tool surface — not a proposal.

---

## 1. Non-negotiable rule

> **Only the Production Verdict Engine calculates product truth.**

Every MCP tool handler in `server/mcp/tools/*.ts` may only **retrieve**, **compare**, **aggregate**, **format**, or **translate** already-persisted `ProductionVerdictV1` data. No handler contains scoring logic, status logic, blocker-counting logic, priority-ordering logic, or a second confidence model. This is enforced structurally (every handler calls `getCurrentProductionVerdict` / `loadVerdictJourneyRecords` and reads existing fields) and is spot-checked by `server/mcp/__tests__/canonical-tools.test.ts` and `brain/__tests__/production-verdict-consolidation.test.ts`.

---

## 2. The five canonical tools

| # | Tool | Question it answers |
|---|------|----------------------|
| 1 | `can_i_deploy` | "Can I deploy this application?" |
| 2 | `safe_fix` | "How do I safely fix this blocker?" |
| 3 | `what_changed` | "What changed since my previous valid Production Review?" |
| 4 | `production_history` | "How has my project evolved?" |
| 5 | `deployment_confidence` | "What is SequrAI's deployment recommendation?" |

No sixth tool exists. This is enforced by `server/mcp/__tests__/tool-surface.test.ts`, which fails the build if `MCP_TOOL_DEFINITIONS` ever grows beyond five entries or drifts from `brain/copilot-contract.ts`.

### Legacy name mapping

| Legacy V0 tool | Real capability | Where it went in V1 |
|---|---|---|
| `get_production_readiness` | Read latest verdict, format score/status/blockers | Folded into `can_i_deploy` |
| `review_current_changes` | Compare latest vs. previous verdict | Folded into `what_changed` |
| `explain_production_blocker` | Explain a specific blocker + how to fix it | Folded into `safe_fix` |
| `get_production_blockers` | List current blockers | Folded into `safe_fix` (no-blocker-specified mode) |
| `list_projects` | Resolve which project a call is about | Demoted to an internal helper (`resolveMcpProject` in `server/mcp/project-resolution.ts`) — never a public tool |

No temporary compatibility aliases were kept. `execute-tool.ts` dispatches on exactly the five canonical names; anything else throws `unknown_tool`.

---

## 3. Transport

One HTTP endpoint serves every client: **`POST /api/mcp`** (`app/api/mcp/route.ts`), plus `GET /api/mcp` for unauthenticated-safe tool discovery and a stdio bridge for clients that only speak stdio.

- **HTTP, JSON-RPC 2.0** — `initialize`, `tools/list`, `tools/call`, `ping`. This is the primary transport and what remote/HTTP-capable MCP clients use directly.
- **HTTP, legacy direct call** — `{ "tool": "can_i_deploy", "input": {...} }` also works against the same endpoint, for simplicity and for the stdio bridge.
- **Stdio bridge** (`mcp/stdio-bridge.mjs`) — a zero-dependency Node script that speaks MCP JSON-RPC over stdin/stdout and forwards every message to `POST /api/mcp` over HTTPS with the caller's API key as a Bearer token. This is what Cursor's and Claude Code's `command`-based (stdio) server configuration launches.

Both transports are backed by the exact same `executeMcpTool` dispatcher and the exact same five tool handlers — there is no client-specific code path.

---

## 4. Authentication

- Model: hashed MCP API keys (`mcp_api_keys` table), Bearer-token auth (`Authorization: Bearer seq_live_...`).
- `resolveMcpAuth()` (`server/mcp/auth.ts`) hashes the raw key with SHA-256, looks it up, and rejects revoked keys (`revoked_at IS NULL` filter). A missing/invalid/revoked key returns `unauthorized` — never a stack trace, never which part of the lookup failed.
- Every authenticated call carries `organizationId` (from the key's owning organization) and `userId` (the key's creator, used only for locale resolution). Both are supplied by `resolveMcpAuth`, never by client input.
- `resolveMcpProject()` (`server/mcp/project-resolution.ts`) is the single choke point through which every tool must pass a `projectId`/`repositoryId`/`repositoryFullName` before touching any verdict data. It always re-checks `organization_id = ctx.organizationId` server-side — client-supplied IDs are never trusted directly.
- Last-used timestamp is updated on every successful key lookup for observability/rotation hygiene.

---

## 5. Tool contracts (summary)

Full request/response shapes live in the exported TypeScript types next to each handler. Summary:

### `can_i_deploy` (`server/mcp/tools/can-i-deploy.ts`)
Retrieves the latest persisted verdict for the resolved project via `getCurrentProductionVerdict`. Formats status, score (`null` stays `null`, never coerced to `0`), score delta, blockers count, up to 3 top blockers, next action (`verdict.recommendedAction`), evaluated coverage, generation timestamp, reviewed/latest commit SHAs, `stale`/`reviewInProgress` flags (from `getStalenessInfo`), and a fixed deployment recommendation (`SHIP_IT` / `DO_NOT_DEPLOY` / `MORE_ANALYSIS_REQUIRED`, from `decision-mapping.ts`).

### `safe_fix` (`server/mcp/tools/safe-fix.ts`)
Without a `blockerId`/`priorityId`/`findingId`, returns up to 5 candidate blockers (top priorities first, then additional critical/high findings not already covered) and asks the caller to choose one. With an ID, resolves the exact priority or finding, calls the existing Production Safe Fix Engine (`brain/fix-prompt`) to build the prompt, and returns `safeFixPrompt`, `safeFixConfidence`, `implementationRisk` (LOW/MEDIUM/HIGH), `estimatedFixTime`, `estimatedFilesChanged`, `estimatedScope`, and a clearly-labeled `projectedScore`/`projectedVerdict` (via `projectedScoreAfterFix` / `projectedVerdictStatusAfterFix`, which call into the Verdict Engine's own projection capability — no local scoring). Never modifies files, executes commands, or creates commits/PRs.

### `what_changed` (`server/mcp/tools/what-changed.ts`)
Loads verdict history via `loadVerdictJourneyRecords`, filters to valid verdicts (`isValidJourneyVerdict`), and diffs the two most recent ones by priority ID: priorities present before but not now are `resolvedBlockers`; priorities present now but not before are `detectedBlockers`. `confirmedIntroducedBlockers` is always `[]` — there is no repository-diff-evidence system wired to MCP yet, so the handler never claims causality it cannot prove. New blockers are always reported as "detected in the latest review," never "introduced by your latest change."

### `production_history` (`server/mcp/tools/production-history.ts`)
Loads verdict history and aggregates it through the existing Production History/Journey engine (`buildProductionJourney`). Returns current/best score, trend, valid/failed review counts, a concise recent-score timeline capped at `limit` (default 7, max 20, regardless of `range`), blockers resolved/detected totals, and first/last reviewed timestamps. Null scores stay null; failed scans are excluded from `totalValidReviews` and never contribute a score point.

### `deployment_confidence` (`server/mcp/tools/deployment-confidence.ts`)
Retrieves the current verdict and translates `verdict.status` into `deploy` / `do_not_deploy` / `more_analysis_required` through the fixed, documented mapping in `server/mcp/decision-mapping.ts`. `confidenceBand` is read directly from `verdict.confidence` (the Verdict Engine's own field) — this tool never invents a second confidence number. `reason` is a translated sentence built from already-known fields (blockers count, status).

---

## 6. Services reused (nothing duplicated)

| Concern | Canonical source | Consumed by |
|---|---|---|
| Verdict retrieval | `server/production-verdict/service.ts` → `core.ts` (`getCurrentProductionVerdict`, `getProductionVerdictByScan`) | all five tools |
| Verdict history/journey | `server/production-journey/load-verdicts.ts`, `brain/production-journey` (`buildProductionJourney`, `isValidJourneyVerdict`) | `what_changed`, `production_history` |
| Safe Fix prompt generation | `brain/fix-prompt` (`buildProductionFixPrompt`, `fixPromptInputFromPriority`, `fixPromptInputFromFinding`, `projectedScoreAfterFix`, `projectedVerdictStatusAfterFix`) | `safe_fix` |
| Decision mapping | `server/mcp/decision-mapping.ts` (`mapVerdictStatusToDecision`) | `can_i_deploy`, `deployment_confidence` |
| Staleness | `server/mcp/staleness.ts` (`getStalenessInfo`) | `can_i_deploy`, `deployment_confidence` |
| Project resolution / tenant isolation | `server/mcp/project-resolution.ts` (`resolveMcpProject`) | all five tools |
| i18n | `server/mcp/i18n.ts` + `messages/{en,es}/mcp.json` | all five tools |
| Response formatting | `server/mcp/response-format.ts` (`activityHeader`, `buildTextResponse`) | all five tools |

No tool file computes a score, a status, a blocker count, or a priority order. See §1.

---

## 7. Staleness behavior

`getStalenessInfo()` compares the verdict's `reviewedCommitSha` (`verdict.commitSha`) against `repository_scan_state.last_commit_sha` (the latest commit SequrAI has detected for that repository) and `repository_scan_state.active_scan_id`:

- `stale: true` when the latest detected commit differs from the reviewed commit — the tool still returns the last verdict, but every user-facing summary includes an explicit warning ("This verdict does not cover the latest detected commit...").
- `reviewInProgress: true` when a scan is currently active for the repository — the summary states that Continuous Review is processing and the response reflects the last *completed* review.
- A verdict is never presented as current without one of these warnings when applicable. Both flags are also returned as raw booleans in the structured response for programmatic clients.

Exercised by `canonical-tools.test.ts` (`flags a stale verdict...`, `flags reviewInProgress...`).

---

## 8. Error behavior

All typed errors are instances of `McpError` (`status`, `code`, `message`, optional `data`) and are localized (English/Español) via `messages/{en,es}/mcp.json` → `errors.*`:

`unauthorized` · `invalid_api_key` · `project_not_found` · `ambiguous_project` (carries `data.projects`, a concise name+ID list) · `repository_disconnected` · `no_verdict_available` · `review_in_progress` · `insufficient_data` · `analysis_failed` · `blocker_not_found` · `safe_fix_unavailable` · `rate_limited` · `internal_error`.

`app/api/mcp/route.ts` propagates `McpError` as either a JSON-RPC error object or a `{ error, code, data? }` HTTP body (never a stack trace, never a token). Full test coverage in `canonical-tools.test.ts` and `server/http/__tests__/rate-limit.test.ts`.

---

## 9. Consistent activity identifier

Every tool's `summary` text (and the underlying `buildTextResponse` helper) always starts with:

```
SEQURAI

<MODE LABEL>
```

where `<MODE LABEL>` is exactly one of `PRODUCTION REVIEW`, `SAFE FIX`, `CONTINUOUS REVIEW`, `PRODUCTION HISTORY`, `DEPLOYMENT CONFIDENCE` (localized). No "activating," "thinking," or "scanning your universe" language exists anywhere in `messages/*/mcp.json`.

---

## 10. I18N

English and Español are both fully translated (`messages/en/mcp.json`, `messages/es/mcp.json`). Locale resolution order (`resolveMcpLocale` in `server/mcp/i18n.ts`): explicit `locale` input → the API key owner's profile locale → English fallback. No MCP-facing copy is hardcoded outside these message files.

---

## 11. Performance & limits

- `can_i_deploy`, `what_changed`, `production_history`, and `deployment_confidence` only read persisted rows — none of them trigger a repository scan.
- `safe_fix` only calls the existing Safe Fix Engine to render a prompt from already-persisted findings/priorities — it does not scan a repository either.
- Request body is capped at 64 KB (`MAX_REQUEST_BODY_BYTES` in `app/api/mcp/route.ts`).
- `production_history`'s recent-score timeline is capped at 20 rows (`MAX_RECENT_LIMIT`), default 7.
- Both `GET` and `POST /api/mcp` are rate-limited (`enforceRateLimit`, keyed by client IP, `keyPrefix: "mcp"`), returning a typed `rate_limited` error on the 429 response body.
- `maxDuration = 60` seconds on the route; all handlers are simple reads/aggregations expected to complete in low tens of milliseconds against persisted data.

---

## 12. Observability

`logMcpCall()` (`server/mcp/observability.ts`) logs, per call: tool name, organization ID, project ID (when resolved), duration in ms, result (`success`/`error`), error code, and optional client metadata. It never logs API keys, Authorization headers, GitHub tokens, secrets, source file contents, or Safe Fix Prompt bodies. This gives a foundation for calls-per-tool, error-rate, latency, and stale-response metrics without exposing anything sensitive.

---

## 13. Cursor and Claude Code

Both clients talk to the exact same server (`/api/mcp`) via the same stdio bridge or, for HTTP-capable clients, directly over HTTP JSON-RPC. See `docs/MCP_CURSOR_SETUP.md` and `docs/MCP_CLAUDE_CODE_SETUP.md` for exact configuration syntax, troubleshooting, and key revocation.

---

## 14. Web / GitHub / MCP consistency

All three surfaces read the same persisted `ProductionVerdictV1` row through the same retrieval function (`getCurrentProductionVerdict`). `brain/production-verdict/adapters/consistency.ts` and `adapters/format.ts` provide the shared formatting/translation layer; `server/mcp/__tests__/web-github-mcp-consistency.test.ts` is the integration contract test that asserts status, score, blockers count, top priority/next action, and reviewed commit agree across the web view model (`productionReadyFromVerdict`), GitHub check formatters (`formatGithubCheckSummary`, `formatGithubCheckDescription`), and the `can_i_deploy` MCP tool for the same fixture verdict. Formatting differs; the underlying values never do.

---

## 15. Testing

See `docs/MCP_V1_IMPLEMENTATION_REPORT.md` §11 for the full test inventory and run results.
