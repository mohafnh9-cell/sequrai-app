# ADR-001: Production Verdict Engine as the Single Source of Truth

**Status:** APPROVED — PERMANENT — NON-NEGOTIABLE
**Applies to:** MCP V1, Web Application, GitHub Automation, Reports, and every future surface.
**Supersedes nothing. Extends:** the existing rule in `docs/PRODUCTION_VERDICT.md` ("No consumer may calculate Production Ready Score, status, or priorities outside the Production Verdict Engine") to explicitly cover the four engines defined in `docs/PRODUCTION_ENGINE_V1.md` and every MCP client defined in `docs/MCP_V1_PRODUCTION_ENGINE.md`.

This document is a contract, not a narrative. It exists so that no future sprint, feature request, or "just this once" shortcut can quietly reintroduce a second place where product truth is calculated.

---

## The rule

> **Only the Production Verdict Engine may calculate product truth.**

Product truth means, specifically, any of the following values:

- Verdict status (`ready_to_ship`, `almost_ready`, `needs_improvement`, `not_ready`, `insufficient_data`, `analysis_failed`)
- Production Ready Score
- Blocker count (critical / high / total)
- Priority ordering (which findings matter most, and in what order)
- Projected score (the score a fix would produce if applied)
- Deployment recommendation inputs (whatever numbers or booleans feed the `SHIP IT` / `DO NOT SHIP` decision)

No other engine, service, transport, or client — present or future — may independently derive any of the above. Not approximately. Not as a fallback. Not "for now."

---

## What every other engine and transport may do

The MCP layer, the Safe Fix Engine, the Continuous Reviews Engine, the Production History Engine, and the Deployment Confidence Engine are permitted exactly five operations against product truth:

1. **Retrieve** — read an already-persisted `ProductionVerdictV1` record.
2. **Compare** — diff two already-persisted records (e.g. Continuous Reviews computing an improvement/regression delta between two verdicts).
3. **Aggregate** — combine multiple already-persisted records over time (e.g. Production History computing a trend from a timeline of verdicts).
4. **Format** — render an existing value for a specific surface (e.g. the `SEQURAI` MCP block, a GitHub commit status string, a dashboard card).
5. **Translate** — map an existing value onto a different vocabulary without changing its meaning (e.g. Deployment Confidence turning `status: "ready_to_ship"` into the sentence *"I would deploy it today"*).

If an operation cannot be described as one of these five verbs, it is not allowed, regardless of how small or reasonable it seems in isolation.

---

## Correction to `docs/PRODUCTION_ENGINE_V1.md` §3.2 (Safe Fix Engine)

The architecture document currently describes the Safe Fix Engine's projected verdict as running "the same scoring function the Verdict Engine uses." That wording is corrected here to remove any ambiguity:

**Before (ambiguous):** the Safe Fix Engine runs the same scoring function.
**After (binding):** the Safe Fix Engine never contains scoring logic, not even a duplicated or "shared" copy of it. It calls the Production Verdict Engine's own projection capability — a function that already lives inside the Verdict Engine's module boundary (`brain/production-verdict/projection.ts` in the current codebase) — and **retrieves** the projected score as an output. The Safe Fix Engine's only inputs to that call are which blockers are hypothetically resolved; it supplies no severity weights, no penalty curve, and no scoring math of its own.

This is already true in the current codebase (`projectScoreAfterPriorities` lives inside `brain/production-verdict/`, not inside the fix-prompt module) — this ADR makes it a permanent constraint rather than an incidental fact of where a file happens to live today.

---

## Cross-surface consistency guarantee

The same repository and the same commit **must** return the same core values (status, score, blockers, recommendation) through:

- the web application (dashboard, scan reports)
- GitHub automation (commit status checks, PR annotations)
- the MCP (any client — Cursor, Claude Code, Windsurf, Lovable, Bolt, Replit, Copilot, Codex, v0, or any future MCP client)
- reports (exports, summaries, any future document generation)

There is exactly one way to satisfy this guarantee: every one of those surfaces reads from the same persisted `production_verdicts` record for that commit. There is no second way that also satisfies it — any surface-specific recalculation, "quick estimate," or cached shortcut that skips the persisted record is a violation of this ADR even if its output happens to match on a given day.

---

## Agent identity exclusion

**Agent identity must not affect the Production Verdict.** No field, parameter, header, or heuristic anywhere in the Production Verdict Engine's input may represent or infer which AI agent (or human) produced the code being scored. Cursor, Claude Code, and every future MCP client are transports only. This ADR forbids client-specific product logic anywhere in the pipeline — a client may format its own presentation of a verdict, but it may never receive a different verdict, score, or recommendation than any other client would receive for the identical commit.

---

## Enforcement

This ADR is the canonical reference for review of any future engine, tool, or feature proposal. The test for any new capability is:

1. Does it introduce a new place where status, score, blocker count, priority ordering, projected score, or recommendation inputs are derived? → **Rejected**, unless it is the Production Verdict Engine itself being extended.
2. Does it make any of those values depend on which agent produced the code? → **Rejected**, unconditionally.
3. Can it be fully described using only retrieve / compare / aggregate / format / translate against already-persisted verdicts? → **Approved to proceed to design.**

Any code review, design document, or MCP tool definition that cannot answer "yes" to test #3 does not ship, regardless of who requests it or how urgent it seems.

### Automated enforcement

Manual review is backed by automated tests that fail the build if this ADR is violated:

- `test/architecture/adr-001-enforcement.test.ts` — fails if `calculateProductionReadiness` or `estimateRiskFromScan` (the legacy engine and its parallel risk score, both removed — see the cleanup report below) are reintroduced anywhere in `app/`, `brain/`, `server/`, or `features/`; fails if any module outside `brain/production-verdict/` defines its own `SEVERITY_PENALTY` table; fails if `brain/production-readiness/` is recreated.
- `server/mcp/__tests__/tool-surface.test.ts` — fails if more than five public MCP tools are registered, if a registered tool name is duplicated, if `brain/copilot-contract.ts` drifts from `server/mcp/tool-definitions.ts`, or if `executeMcpTool`'s switch dispatches to a tool name that isn't publicly registered.

### Cleanup history

An audit performed after this ADR was approved found active and latent violations predating it (a parallel `estimateRiskFromScan` risk score, a legacy `calculateProductionReadiness` engine, and an MCP tool surface larger than five). These were resolved; see `docs/ADR_001_ARCHITECTURE_CLEANUP_REPORT.md` and `docs/SEVERITY_DOMAINS.md` for the full record of what was removed, why, and what replaced it.
