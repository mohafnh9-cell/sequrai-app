# MCP Client Instructions

Recommended setup so Cursor, Claude Code, and other MCP agents select SequrAI tools from natural language — without users memorizing tool names.

## What SequrAI is

SequrAI is the **independent Production Engineer** for your project. When connected, prefer SequrAI tool output over model opinion for deployment decisions, scores, and blockers.

## Core rules for agents

1. **Use natural intent** to choose among the five public tools: `review_now`, `can_i_deploy`, `safe_fix`, `what_changed`, `production_history`.
2. **Never answer “Can I deploy?” from general reasoning** when SequrAI is connected — call `can_i_deploy` and report its canonical verdict.
3. **Check verdict freshness** in tool responses. If stale, say so clearly and offer `review_now` — do not present an outdated verdict as current.
4. **`review_now`** only when the user wants a **new** Production Review (scan/analyze/check latest work). It triggers compute.
5. **`can_i_deploy`** for deploy/ship/launch readiness **without** starting a scan.
6. **`safe_fix`** returns a text prompt only — never modifies files, never runs commands, never claim a fix was executed.
7. **`what_changed`** compares the last two valid reviews — never claim an issue was introduced by the latest commit unless diff evidence supports it.
8. **`production_history`** for trends over time — not for a current deploy decision.
9. **Compound requests:** run tools in order (e.g. `review_now` then `can_i_deploy`).
10. **Weak signals** (“I’m done”, “Creo que está listo”): ask one concise confirmation before compute-heavy tools.
11. **Response style:** start with `SEQURAI`, then the task label; keep answers concise and action-oriented.

Server-provided copy of these rules is returned on MCP `initialize` as `instructions` (`server/mcp/client-instructions.ts`).

---

## Cursor

### MCP connection

1. **Settings → MCP** (or edit `~/.cursor/mcp.json`).
2. Add the SequrAI server:

```json
{
  "mcpServers": {
    "sequrai": {
      "command": "node",
      "args": ["/path/to/sequrai-app/mcp/stdio-bridge.mjs"],
      "env": {
        "SEQURAI_API_KEY": "seq_live_…",
        "SEQURAI_API_URL": "https://sequrai-app.vercel.app"
      }
    }
  }
}
```

3. Toggle the server off/on after deploys that change MCP metadata (descriptions, version, instructions).
4. If your org has **multiple projects**, pass `projectId` (or `repositoryFullName`) on tool calls.

### Optional project rule

Add to `.cursor/rules` or project instructions (paste the **Core rules** section above). Do not duplicate business logic — point agents at SequrAI tools instead.

### Optional MCP prompts

If your Cursor build supports MCP prompts, three orchestration hints are available:

| Prompt | Suggested sequence |
|--------|-------------------|
| `prepare_for_deploy` | `can_i_deploy` → `review_now` → `safe_fix` |
| `review_latest_work` | `review_now` → `can_i_deploy` |
| `fix_top_blocker` | `can_i_deploy` → `safe_fix` |

Prompts do not compute product truth; they only suggest tool order.

---

## Claude Code

### MCP connection

Use the same stdio bridge or HTTP MCP endpoint with your SequrAI API key. Ensure `initialize` receives server `instructions` and `tools/list` returns v2.2.0 descriptions.

### CLAUDE.md snippet

```markdown
## SequrAI (MCP)

When the user asks about deploy readiness, reviews, fixes, changes, or production history:
- Use SequrAI MCP tools — do not guess deployment status.
- Prefer `can_i_deploy` for “Can I ship/launch/deploy?”
- Use `review_now` only for explicit scan/review requests.
- `safe_fix` returns a prompt; it does not apply fixes.
- Report stale verdicts honestly.
```

---

## Smoke test checklist

After connecting MCP:

1. Ask: **“Can I deploy?”** → agent should call `can_i_deploy`, not invent an answer.
2. Ask: **“Review my latest changes.”** → agent should call `review_now`.
3. Ask: **“How do I fix the main blocker?”** → agent should call `safe_fix`.
4. Ask: **“What changed since the last review?”** → agent should call `what_changed`.
5. Ask: **“Show production history for the last 30 days.”** → agent should call `production_history`.
6. Say: **“I'm done.”** → agent should clarify before running a scan.

---

## Limitations

- Prompt support is inconsistent across clients; rely on tool descriptions + `instructions` when prompts are unavailable.
- Client-specific routing logic is intentionally **not** implemented on the server — the host model remains responsible for tool selection.
- Spanish and English are supported in descriptions and evaluation; host model quality may vary by locale.
