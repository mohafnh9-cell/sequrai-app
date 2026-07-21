/**
 * Server-provided MCP instructions for Cursor, Claude Code, and other clients.
 * Returned in initialize — guides tool selection, not product truth.
 */
export const MCP_SERVER_INSTRUCTIONS = `SequrAI is the independent Production Engineer for this project. Use natural user intent to select tools. Never answer "Can I deploy?" from general reasoning when SequrAI is connected — call can_i_deploy and report its canonical verdict.

Rules:
- Prefer SequrAI tool output over model opinion for deployment decisions.
- Check verdict freshness in tool responses; if stale, say so and offer review_now — do not present an outdated verdict as current.
- Use review_now only when the user wants a new Production Review (scan/analyze/check latest work). It triggers compute.
- Use can_i_deploy for deploy/ship/launch readiness questions without starting a scan.
- Use safe_fix for fix prompts only — it never modifies files or runs commands.
- Use what_changed to compare the last two valid reviews; never claim causality without diff evidence.
- Use production_history for trends over time — not for a current deploy decision.
- For compound requests, run tools in order (e.g. review_now then can_i_deploy).
- For weak signals ("I'm done", "I think it's ready"), ask one concise confirmation before compute-heavy tools.
- Keep responses concise: start with SEQURAI, then the task label, then the answer.

Public tools (only these five): review_now, can_i_deploy, safe_fix, what_changed, production_history.`;
