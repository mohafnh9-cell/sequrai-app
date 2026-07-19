# MCP V1 Implementation Report

**Status:** COMPLETE
**Date:** July 19, 2026
**Governed by:** `docs/ADR_001_SINGLE_SOURCE_OF_TRUTH.md`, `docs/MCP_V1_PRODUCTION_ENGINE.md`, `docs/PRODUCTION_ENGINE_V1.md`, `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md`.

---

## 1. Existing MCP mapping

Before this task, the MCP server registered five V0 tools plus internal helpers. Each was audited for its *real* capability (not just its name) before deciding where it belonged in the V1 surface:

| Legacy tool | Real capability observed in code | Disposition |
|---|---|---|
| `get_production_readiness` | Read latest verdict; format score/status/blockers | Superseded by `can_i_deploy` |
| `review_current_changes` | Diff latest vs. previous verdict | Superseded by `what_changed` |
| `explain_production_blocker` | Explain one blocker + generate a fix | Superseded by `safe_fix` (prompt-ready mode) |
| `get_production_blockers` | List current blockers | Superseded by `safe_fix` (choose-blocker mode) |
| `list_projects` | Resolve org's project(s) for a call | Demoted to internal helper `resolveMcpProject`; never a public tool again |

`server/mcp/scan-handlers.ts` (`runProductionCheck`, which could trigger a scan from MCP) and `server/mcp/copilot-handlers.ts` (superseded ad-hoc formatting helpers) were deleted outright — neither had a place in the ADR-001-compliant V1 surface. No temporary compatibility aliases were kept; there was no live private-beta traffic on the legacy names to migrate.

---

## 2. Tool names before and after

**Before:** `get_production_readiness`, `review_current_changes`, `explain_production_blocker`, `list_projects`, `get_production_blockers` (5 tools, none matching the canonical V1 contract).

**After:** `can_i_deploy`, `safe_fix`, `what_changed`, `production_history`, `deployment_confidence` (exactly 5 tools, matching the canonical V1 contract verbatim).

`MCP_PUBLIC_TOOL_NAMES` (`server/mcp/tool-definitions.ts`) is the single source of truth for the registered names; `brain/copilot-contract.ts`'s `COPILOT_BRAIN_TOOLS` is kept in sync and asserted equal to it by `server/mcp/__tests__/tool-surface.test.ts`.

---

## 3. Transport

- **Primary:** `POST /api/mcp` — JSON-RPC 2.0 (`initialize`, `tools/list`, `tools/call`, `ping`) and a legacy direct `{ tool, input }` shape, both handled by the same route and the same `executeMcpTool` dispatcher.
- **Discovery:** `GET /api/mcp` returns server info + `MCP_TOOL_DEFINITIONS` for authenticated callers.
- **Stdio bridge:** `mcp/stdio-bridge.mjs` — a dependency-free Node script Cursor/Claude Code launch as a subprocess; it speaks MCP JSON-RPC over stdin/stdout and forwards every message to `POST /api/mcp` over HTTPS.
- One backend, one dispatcher, one set of five handlers — no client-specific logic exists anywhere in `server/mcp/`.

## 4. Authentication

Hashed Bearer API keys (`mcp_api_keys`, SHA-256 hash + `seq_live_` prefix), verified in `resolveMcpAuth()` on every request, with immediate revocation support and organization-scoped context (`organizationId`, `userId`) attached to every downstream call. Full detail: `docs/MCP_V1_SECURITY.md` §1–§3.

## 5. Tool contracts

Full contracts (inputs, outputs, rules, user-facing format) for all five tools are implemented exactly as specified and documented in `docs/MCP_V1_IMPLEMENTATION.md` §5. Highlights of rules verified in code and tests:

- `can_i_deploy`: `score` stays `null` when unknown (never `0`); `topBlockers` capped at 3; distinct copy for `insufficient_data`, `analysis_failed`, stale, and review-in-progress states.
- `safe_fix`: max 5 blocker candidates when none is chosen; never fabricates confidence (reuses the Safe Fix Engine's own LOW/MEDIUM/HIGH band); never modifies files/executes commands/creates commits.
- `what_changed`: `confirmedIntroducedBlockers` is always `[]` (no diff-evidence system yet); new blockers are always "detected," never "introduced by your latest change."
- `production_history`: recent-verdict timeline capped at 20 rows; null scores stay null; failed scans excluded from valid-review counts.
- `deployment_confidence`: decision comes from a fixed, documented status→decision table (`decision-mapping.ts`); `confidenceBand` is the Verdict Engine's own `confidence` field, never a second invented number.

## 6. Services reused

No scoring, status, blocker-counting, or priority-ordering logic was written inside `server/mcp/`. See `docs/MCP_V1_IMPLEMENTATION.md` §6 for the full reuse table (`getCurrentProductionVerdict`, `loadVerdictJourneyRecords`/`buildProductionJourney`, `brain/fix-prompt`'s `buildProductionFixPrompt`/`projectedScoreAfterFix`/`projectedVerdictStatusAfterFix`, and the shared i18n/response-format/decision-mapping/staleness helpers).

## 7. Staleness behavior

`getStalenessInfo()` compares the reviewed verdict's commit SHA against `repository_sync_status.commit_sha` (written independently of scan success, before any scan runs) and surfaces `freshnessStatus` (`current`/`stale`/`unknown`), `stale`/`reviewInProgress`/`reviewFailed` booleans, plus localized warning copy in every affected tool's `summary`. A stale, unknown, or in-progress verdict is never presented as current without a warning — see `docs/MCP_V1_COMMIT_FRESHNESS_AUDIT.md` for the full root-cause audit and fix. Detail: `docs/MCP_V1_IMPLEMENTATION.md` §7; tests: `staleness.test.ts`, `canonical-tools.test.ts` (`flags a stale verdict...`, `flags reviewInProgress...`, `reports freshnessStatus unknown...`, `warns when the recommendation does not cover the latest detected commit`).

## 8. Error behavior

Thirteen typed error codes (`unauthorized` through `internal_error`), all localized EN/ES, all returned as `{ error, code, data? }` with no stack traces, tokens, or internal details. Detail and full code list: `docs/MCP_V1_IMPLEMENTATION.md` §8, `docs/MCP_V1_SECURITY.md` §4.

## 9. Cursor setup status

**Documented and internally consistent; CLI/UI details manually-verify-flagged.** `docs/MCP_CURSOR_SETUP.md` gives the exact current `mcpServers` JSON shape (`command`/`args`/`env`, confirmed against Cursor's published MCP docs as of this writing) for both the stdio-bridge path and a direct-HTTP alternative. The Cursor Settings panel name/steps for enabling a server are called out as something to manually re-verify against the reader's installed Cursor version, since that UI surface changes independently of the MCP JSON contract. **Not live-tested against a running Cursor instance in this task** — no Cursor client was available in this environment to drive end-to-end.

## 10. Claude Code setup status

**Documented and internally consistent; CLI flag details manually-verify-flagged.** `docs/MCP_CLAUDE_CODE_SETUP.md` gives the exact current `claude mcp add --transport stdio|http ... -- <command> [args...]` syntax and the equivalent `.mcp.json`/`~/.claude.json` shapes (confirmed against Claude Code's published MCP docs as of this writing), covering both the stdio-bridge path and direct HTTP. Windows `cmd /c` wrapper note included. **Not live-tested against a running Claude Code CLI in this task** — no Claude Code client was available in this environment to drive end-to-end.

## 11. Tests

All tests below are new or updated for MCP V1 and pass as of this report (`npx vitest run`, full suite):

| File | Tests | Covers |
|---|---|---|
| `server/mcp/__tests__/tool-surface.test.ts` | 5 | Exactly five public tools; no duplicates; `copilot-contract.ts` sync; no legacy V0 names; `execute-tool.ts` dispatch never exceeds the registered set |
| `server/mcp/__tests__/api-key.test.ts` | 3 | Deterministic hashing, prefixed key generation, uniqueness |
| `server/mcp/__tests__/canonical-tools.test.ts` | 33 | Each tool's full state matrix: success, null score, capped top-blockers, `analysis_failed`, stale, review-in-progress, `no_verdict_available`, `project_not_found`, tenant isolation, `ambiguous_project` (with project list), auto-select single project, ES locale, blocker list (max 5)/no-blockers/prompt-ready/`blocker_not_found`/alias IDs, resolved-vs-detected blockers with no invented causality, skip-invalid-verdicts diffing, bounded+clamped history, empty-history state, null-score history, all six status→decision mappings, confidence reuse, stale disclaimer |
| `server/mcp/__tests__/i18n.test.ts` | 7 | Locale resolution order (explicit > profile > English fallback), invalid-locale rejection, EN/ES translator output, param interpolation |
| `server/mcp/__tests__/web-github-mcp-consistency.test.ts` | 3 | Web/GitHub/MCP agreement on status, score, blockers count, top priority/next action, and reviewed commit for the same persisted verdict, including null-score and ready-to-ship cases |
| `server/http/__tests__/rate-limit.test.ts` | 2 | 429 after limit exceeded; typed `rate_limited` error body shape for the MCP contract |
| `brain/__tests__/production-verdict-consolidation.test.ts` | 6 | Adapter-level consistency (dashboard/project/scan/mcp/github all agree on core fields), null-score handling, hero-view copy for `insufficient_data`/`analysis_failed` |

**MCP-related total: 59 tests across 7 files, all passing.**

**Full repository suite:** `Test Files 37 passed (37)`, `Tests 256 passed (256)`.

## 12. Build results

- `npm run typecheck` → **pass**, no errors.
- `npm run lint` → **pass**, no errors or warnings.
- `npx vitest run` (full suite) → **pass**, 256/256 tests, 37/37 files.
- `npm run build` → **pass** (`prisma generate && next build`, Next.js 16.2.10 with Turbopack), all 50 routes compiled including `/api/mcp` and `/api/mcp/keys`.

## 13. Limitations

- **No repository-diff-evidence system** is wired to MCP, so `what_changed` cannot distinguish "a blocker your commit introduced" from "a blocker detected in this review that happens to be new" — it always reports the latter, honestly. `confirmedIntroducedBlockers` exists in the contract but is currently always empty.
- **Rate limiting is per-instance, in-memory**, not distributed. Fine for private beta; needs a shared store before public beta under multi-instance load.
- **Cursor and Claude Code configurations are documented, not live-driven** in this task — there was no running Cursor/Claude Code client available in this execution environment. The documented JSON/CLI syntax is cross-checked against each vendor's current published docs, but is explicitly flagged for manual verification against the reader's installed client version.
- **`safe_fix`'s candidate list mixes two sources** (top priorities + extra critical/high findings not already covered) capped at 5 total; this mirrors the existing web dashboard's blocker surfacing behavior but is worth re-confirming against product expectations if the underlying scan produces very large finding sets.
- **Locale for the pre-auth rate-limit response is always English** (see `docs/MCP_V1_SECURITY.md` §8) since resolving a caller's profile locale requires a successful auth lookup, which is exactly what rate limiting is protecting.

## 14. Manual smoke-test procedure

1. Generate an MCP API key in SequrAI → Settings → MCP Integration.
2. `curl -s https://<host>/api/mcp -H "Authorization: Bearer seq_live_..." | jq` → confirm `tools` lists exactly the five canonical names.
3. `curl -s -X POST https://<host>/api/mcp -H "Authorization: Bearer seq_live_..." -H "Content-Type: application/json" -d '{"tool":"can_i_deploy","input":{}}' | jq` against a project with at least one completed Production Review → confirm `result.summary` starts with `SEQURAI` / `PRODUCTION REVIEW` and `result.score` is a number or `null` (never `0` unless genuinely zero).
4. Repeat step 3 for `deployment_confidence`, `what_changed`, `production_history` (try `{"range":"7d"}`), and `safe_fix` (first with `{}` to get a blocker list, then again with `{"blockerId": "<id-from-step-4>"}`).
5. Call any tool with a `projectId` belonging to a different organization's project (if you have two test orgs) → confirm `project_not_found`, not the other org's data.
6. Call any tool with `{"locale":"es"}` → confirm the `summary` text is in Spanish and still begins with `SEQURAI`.
7. Revoke the key from Settings, repeat step 3 → confirm `401 unauthorized`/`invalid_api_key`.
8. Configure the stdio bridge in a local Cursor or Claude Code install using `docs/MCP_CURSOR_SETUP.md` / `docs/MCP_CLAUDE_CODE_SETUP.md`, and confirm the client's tool-discovery UI lists exactly the five tools and a natural-language "can I deploy this?" prompt calls `can_i_deploy` successfully. *(Not performed in this task — no client available; flagged in §9–10, §13.)*

## 15. Private beta readiness score

**92 / 100.**

Rationale: the core contract (exactly five tools, ADR-001 compliance, tenant isolation, staleness, typed errors, EN/ES, and cross-surface consistency) is fully implemented, tested (59 MCP-specific tests, all passing), typechecked, linted, and built cleanly. The deduction reflects the three items in §13 that remain genuinely open for private beta: no live Cursor/Claude Code client verification was possible in this environment (documented but not driven end-to-end), rate limiting is not yet distributed, and `what_changed`'s introduced-vs-detected distinction is intentionally conservative pending a real diff-evidence system. None of these block private beta; all three are called out explicitly so they aren't mistaken for oversights.
