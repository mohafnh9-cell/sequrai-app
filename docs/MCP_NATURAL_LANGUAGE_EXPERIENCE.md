# MCP Natural Language Experience

SequrAI MCP v2.2.0 lets users speak naturally in Cursor, Claude Code, and other MCP clients. The **client model** selects tools from intent; SequrAI improves selection through rich tool descriptions, server instructions, optional prompts, and a documented intent model — **not** server-side keyword routing.

## Architectural principle

- Exactly **five** public tools (ADR-001): `review_now`, `can_i_deploy`, `safe_fix`, `what_changed`, `production_history`.
- No sixth tool, no free-form chat endpoint, no second Production Verdict engine.
- Product truth is computed only by the Verdict Engine; MCP tools read or trigger reviews — they never invent scores.
- Keyword lists are **signals for evaluation and docs**, not production routing logic.

## Intent map

| Intent | Tool | Meaning |
|--------|------|---------|
| `REVIEW_NOW` | `review_now` | Start a new Production Review (scan). |
| `CAN_I_DEPLOY` | `can_i_deploy` | Read latest persisted Production Verdict. |
| `SAFE_FIX` | `safe_fix` | Safe Fix Prompt for a blocker (text only). |
| `WHAT_CHANGED` | `what_changed` | Compare last two valid reviews. |
| `PRODUCTION_HISTORY` | `production_history` | Score/blocker evolution over time. |

Implementation: `server/mcp/intent-model.ts`, `server/mcp/tool-descriptions.ts`.

## Tool selection guidance

### `review_now`

Use when the user wants to **review, scan, analyze, inspect, or check latest work** — especially before launch.

Examples: “Review my project.” · “Check the latest commit.” · “Analyze everything before I deploy.” · “Revisa el último commit.”

**Do not** use merely because “deploy” appears. If they only ask readiness from the existing verdict → `can_i_deploy`.

If the verdict is stale and they want a current decision: explain staleness, then offer or run `review_now` when intent is clear.

**Compute:** yes (async). **Confirmation:** optional for weak signals.

### `can_i_deploy`

Use for deploy readiness without starting a scan.

Examples: “Can I deploy?” · “Is this ready?” · “Can I launch this?” · “¿Puedo desplegar?”

**Compute:** no. If stale → say so, recommend `review_now`, never present outdated verdict as current.

### `safe_fix`

Use for fix prompts — never executes code.

Examples: “How do I fix this?” · “Give me the Cursor prompt.” · “Fix the main blocker.”

Resolve by blocker ID, title, category, or top blocker. If ambiguous → list choices. **Never** claim the fix was applied.

### `what_changed`

Compare last two valid reviews.

Examples: “What changed?” · “What did I break?” · “Why did my score drop?”

Never claim causality without diff evidence — use “Detected in the latest review.”

### `production_history`

Trends and retrospectives — **not** a current deploy decision.

Examples: “How has this project evolved?” · “Show the last 30 days.” · “¿Cuál fue mi mejor score?”

## Keyword signal dictionary (evaluation only)

| Category | Signals (EN + ES samples) |
|----------|---------------------------|
| Deployment | deploy, ship, launch, publish, release, production, real users, go live, desplegar, lanzar, usuarios reales |
| Review | review, scan, analyze, inspect, check, verify, latest commit, revisa, escanea, analiza, último commit |
| Fix | fix, solve, repair, prompt, Cursor prompt, safe fix, blocker, arreglar, solucionar, bloqueador |
| Changes | changed, broke, improved, regressed, introduced, resolved, latest review, qué cambió, qué rompí |
| History | history, evolution, trend, last week, best score, progress, historial, evolución, tendencia |

**Important:** Keywords are signals only. Full phrase and intent determine tool choice.

## Compound orchestration

| User phrase (example) | Sequence |
|------------------------|----------|
| “Review this and tell me whether I can deploy.” | `review_now` → `can_i_deploy` |
| “Tell me what changed and give me a fix for the main problem.” | `what_changed` → `safe_fix` |
| “Can I deploy, and if not, tell me how to fix it.” | `can_i_deploy` → `safe_fix` |

No all-purpose orchestration tool. Optional MCP prompts (`prepare_for_deploy`, `review_latest_work`, `fix_top_blocker`) suggest sequences only.

## Ambiguous phrases

Weak signals such as “I’m done.”, “I think it’s ready.”, “Voy a publicar.” → ask one concise confirmation before compute-heavy tools:

> Your latest commit has not been reviewed. Shall I run a Production Review?

Do not call `review_now` on weak conversational signals without clear intent.

## Response style

Responses should read like a calm senior Production Engineer:

```
SEQURAI

PRODUCTION REVIEW

Your latest commit has not been reviewed.

Next action:
Run a Production Review before deploying.
```

Avoid chatty tone, jokes, fear-mongering, or model opinion overriding canonical verdicts.

## Server wiring

| Component | Role |
|-----------|------|
| `server/mcp/tool-descriptions.ts` | Rich descriptions on `tools/list` |
| `server/mcp/client-instructions.ts` | `instructions` on MCP `initialize` |
| `server/mcp/prompt-definitions.ts` | Optional `prompts/list` + `prompts/get` |
| `app/api/mcp/route.ts` | HTTP + JSON-RPC MCP handler |
| `mcp/stdio-bridge.mjs` | Forwards `initialize` to API (single source of truth) |
| `server/mcp/evaluation/*` | Dataset + evaluation harness (**not** production routing) |

## Evaluation

- Dataset: `server/mcp/evaluation/intent-dataset.ts` (205 phrases).
- Tests: `server/mcp/__tests__/intent-evaluation.test.ts`.
- Report: [MCP_INTENT_EVALUATION_REPORT.md](./MCP_INTENT_EVALUATION_REPORT.md).

## Client setup

See [MCP_CLIENT_INSTRUCTIONS.md](./MCP_CLIENT_INSTRUCTIONS.md) for Cursor and Claude Code guidance.

## Limitations

- MCP prompts support varies by client; prompts are optional.
- Live tool selection accuracy depends on the host model; evaluation harness measures phrase→tool alignment offline.
- Multi-project orgs may need `projectId` on tool calls.
