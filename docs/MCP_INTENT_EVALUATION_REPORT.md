# MCP Intent Evaluation Report

**MCP version:** 2.2.0  
**Dataset:** `server/mcp/evaluation/intent-dataset.ts`  
**Harness:** `server/mcp/evaluation/intent-recommender.ts` (evaluation only — **not** production routing)  
**Tests:** `server/mcp/__tests__/intent-evaluation.test.ts`

## Purpose

Measure whether natural-language phrases map to the correct SequrAI MCP tool (or clarify / no-tool) before users rely on host-model tool selection in Cursor and Claude Code.

## Dataset composition

| Category | Count | Target |
|----------|------:|--------|
| `review_now` | 30 | ≥ 30 |
| `can_i_deploy` | 30 | ≥ 30 |
| `safe_fix` | 30 | ≥ 30 |
| `what_changed` | 25 | ≥ 25 |
| `production_history` | 25 | ≥ 25 |
| Ambiguous (clarify) | 25 | ≥ 25 |
| Compound (multi-tool) | 20 | ≥ 20 |
| Negative (no tool) | 20 | ≥ 20 |
| **Total** | **205** | ≥ 185 |

Coverage includes English and Spanish, informal phrasing, misspellings, mid-sentence keywords, and conflicting keyword combinations.

## Private Beta targets vs results

Run `getIntentEvaluationMetrics()` or `npm run test -- server/mcp/__tests__/intent-evaluation.test.ts` to refresh numbers after dataset changes.

| Metric | Target | Result (CI) |
|--------|--------|-------------|
| Clear first-tool selection | ≥ 95% | **Pass** (≥ 95%) |
| Compound sequence accuracy | ≥ 90% | **Pass** (≥ 90%) |
| Overall dataset accuracy | ≥ 90% | **Pass** (≥ 90%) |
| Ambiguous → clarify | ≥ 90% | **Pass** (≥ 90%) |
| Negative → no tool | ≥ 95% | **Pass** (≥ 95%) |
| English accuracy | ≥ 90% | **Pass** (≥ 90%) |
| Spanish accuracy | ≥ 90% | **Pass** (≥ 90%) |

## Scenarios tested

- Correct tool recommendation by intent
- Keywords in the middle of sentences (e.g. design context before “revisa el último commit”)
- Multiple conflicting keywords (deploy + review → phrase-level resolution)
- Spanish and English
- Misspellings and informal language
- Ambiguous intent → `clarify`
- Compound requests → ordered tool sequences
- No-tool cases (greetings, generic coding tasks)
- `review_now` vs `can_i_deploy` for deploy-adjacent phrases
- Evaluation harness **not** wired into `executeMcpTool`
- Exactly five public tools (ADR-001)

## Stale verdict behavior

Production routing does not use the evaluation recommender. Stale verdict handling is enforced in tool implementations (`server/mcp/staleness.ts`, `can_i_deploy` responses) and in client instructions:

- Stale verdicts must be labeled stale.
- Agents must recommend `review_now` when a fresh review is needed.
- Outdated verdicts must not be presented as current.

See `server/mcp/__tests__/staleness.test.ts`.

## Safe fix execution claims

`safe_fix` descriptions and client instructions explicitly state that fixes are **not** executed. Tests verify the evaluation layer does not imply execution; product tools return prompt text only.

## Model variability

The evaluation harness uses deterministic phrase rules for regression testing. **Live** Cursor/Claude tool selection depends on the host model reading MCP descriptions and `initialize` instructions. Expected variability:

- Paraphrases outside the dataset may mis-route occasionally.
- Compound requests may run tools in parallel unless the model follows orchestration guidance.

Mitigations: rich tool descriptions, server `instructions`, optional MCP prompts, and user-facing docs.

## How to run

```bash
cd sequrai-app
npx vitest run server/mcp/__tests__/intent-evaluation.test.ts
```

## Limitations

- Offline harness ≠ live agent behavior.
- No cross-tenant routing in the harness (tenant scope tested separately in `workspace-scope.test.ts`).
- Prompt support not evaluated in CI (client-dependent).

## Related docs

- [MCP_NATURAL_LANGUAGE_EXPERIENCE.md](./MCP_NATURAL_LANGUAGE_EXPERIENCE.md)
- [MCP_CLIENT_INSTRUCTIONS.md](./MCP_CLIENT_INSTRUCTIONS.md)
