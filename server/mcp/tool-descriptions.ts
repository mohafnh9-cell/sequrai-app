/**
 * Rich MCP tool descriptions for client-side natural-language tool selection.
 * ADR-001: exactly five public tools — descriptions only, no new tools.
 */

export const REVIEW_NOW_DESCRIPTION = `Start a new SequrAI Production Review (scan) for the connected repository.

Purpose: Run fresh analysis on the latest (or specified) commit.
Use when the user wants to review, scan, analyze, inspect, verify, check the latest commit, check before launch, or see if recent work introduced problems.
Do NOT use merely because the word "deploy" appears — if they only ask readiness from the existing verdict, use can_i_deploy.
Compute: YES (async review). Confirmation: optional for weak signals ("I'm done"); proceed when intent is clear.
Examples: "Review my project." | "Check the latest commit." | "I just finished coding—scan it." | "Analyze everything before I deploy." | "See whether I broke anything." | "Run SequrAI now." | "Revisa el último commit." | "Escanea el proyecto antes de desplegar."
If verdict is stale and user wants a current decision, explain staleness then invoke this tool when they clearly want a fresh review.
Result: reviewId + queued/processing state; call can_i_deploy after completion for the verdict.`;

export const CAN_I_DEPLOY_DESCRIPTION = `Read the latest persisted Production Verdict and deployment recommendation.

Purpose: Answer whether the app is ready to deploy based on canonical SequrAI truth.
Use when: "Can I deploy?" | "Is this ready?" | "Can I launch this?" | "Can real users use this?" | "Should I ship?" | "Is this production ready?" | "Would you release this today?" | "¿Puedo desplegar?" | "¿Está listo para producción?"
Do NOT use when the user explicitly asks to run a new scan/review — use review_now.
Compute: NO (reads persisted verdict). Confirmation: not required for clear deploy questions.
If stale: state clearly, recommend review_now, never present outdated verdict as current.
Result: status, score, blockers, next action, deployment recommendation.`;

export const SAFE_FIX_DESCRIPTION = `Return a Safe Fix Prompt for a production blocker (text prompt only — never executes code).

Purpose: Help the user fix a specific blocker safely in their editor.
Use when: "How do I fix this?" | "Give me the Cursor prompt." | "Fix the main blocker." | "What should I change?" | "How can I solve this safely?" | "Generate the safest fix." | "¿Cómo arreglo esto?" | "Dame el prompt para Cursor."
Resolves blocker by: blockerId/priorityId/findingId, issue title, category, or top blocker when unambiguous.
Do NOT use for deployment decisions or history — use can_i_deploy or production_history.
If multiple blockers match: list concise choices and ask user to pick one.
Compute: NO. Never claim the fix was applied.
Result: Safe Fix Prompt, confidence, risk, estimated time, projected verdict.`;

export const WHAT_CHANGED_DESCRIPTION = `Compare the current and previous valid Production Reviews.

Purpose: Explain what changed between the two most recent persisted verdicts.
Use when: "What changed?" | "What did I break?" | "Did I improve?" | "Why did my score drop?" | "What appeared in the latest review?" | "What was fixed?" | "Compare the last two reviews." | "¿Qué cambió?" | "¿Qué rompí?"
Do NOT use for current deploy decision — use can_i_deploy.
Never claim an issue was introduced by the latest commit unless diff evidence proves it — otherwise say "Detected in the latest review."
Compute: NO.
Result: score delta, resolved blockers, newly detected blockers.`;

export const PRODUCTION_HISTORY_DESCRIPTION = `Show how the project's Production Verdict evolved over time.

Purpose: Trend and retrospective view — not a live deploy decision.
Use when: "How has this project evolved?" | "Show me the history." | "Am I improving?" | "What was my best score?" | "How many blockers have I resolved?" | "How was the project last week?" | "Show the last 30 days." | "¿Cómo ha evolucionado?" | "Muéstrame el historial."
Do NOT use for "Can I deploy right now?" — use can_i_deploy.
Compute: NO. Optional: range 7d|30d|all, limit (max 20).
Result: score trend, best score, review count, recent timeline.`;
