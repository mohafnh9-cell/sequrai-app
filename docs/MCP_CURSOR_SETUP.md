# SequrAI MCP — Cursor Setup

**Verified against:** Cursor's published MCP documentation (`cursor.com/docs/mcp`) as of July 2026. Cursor uses the same `mcpServers` JSON shape as Claude Desktop, so this format is stable, but **you should confirm the exact config file location and any UI changes against Cursor's in-app Settings → Tools & MCP panel before relying on this for a release**, since Cursor ships UI changes frequently. Marked below wherever that manual check matters.

---

## 1. Get a SequrAI MCP API key

1. Open SequrAI → **Settings** → find the **MCP Integration** panel (`McpApiKeysPanel`).
2. Give the key a name (e.g. `Cursor — laptop`) and click **Generate key**.
3. Copy the raw key immediately — it starts with `seq_live_` and is shown **only once**. It is stored server-side only as a SHA-256 hash; if you lose it, revoke it and generate a new one.

---

## 2. Required transport

SequrAI's MCP server exposes a single HTTP endpoint (`POST /api/mcp`, JSON-RPC 2.0) and does not require a persistent process on the SequrAI side. Cursor launches MCP servers as local `command` (stdio) processes, so we ship a small stdio bridge that forwards every message from Cursor to that HTTP endpoint:

- Bridge script: `mcp/stdio-bridge.mjs` (checked into the `sequrai-app` repo you're working in — no separate install needed if you already have the repo cloned).
- Transport as seen by Cursor: **stdio** (`command` + `args`, no `url`).
- Transport as seen by SequrAI: **HTTPS** (`POST https://<your-sequrai-host>/api/mcp`), authenticated with your API key as a Bearer token.

---

## 3. Configuration file

Cursor reads MCP servers from either of:

- **Project-specific** (recommended for a team, commit it): `<project-root>/.cursor/mcp.json`
- **Global** (personal, all projects): `~/.cursor/mcp.json`

Both use the same top-level `mcpServers` object; project-level config takes priority if a server name collides.

### Exact config

```json
{
  "mcpServers": {
    "sequrai": {
      "command": "node",
      "args": ["/absolute/path/to/sequrai-app/mcp/stdio-bridge.mjs"],
      "env": {
        "SEQURAI_API_KEY": "seq_live_your_key_here",
        "SEQURAI_API_URL": "https://your-sequrai-deployment.example.com"
      }
    }
  }
}
```

- `args` must be an **absolute path** to `mcp/stdio-bridge.mjs` inside your checkout of `sequrai-app`. If you use `${workspaceFolder}` and your Cursor workspace root **is** the `sequrai-app` repo, `"${workspaceFolder}/mcp/stdio-bridge.mjs"` also works.
- `SEQURAI_API_URL` defaults to `https://sequrai-app.vercel.app` if omitted — set it explicitly if you're pointing at a different deployment (staging, self-hosted, etc.).
- Prefer `"env": { "SEQURAI_API_KEY": "${env:SEQURAI_API_KEY}" }` over a literal key if you want to keep the committed `.cursor/mcp.json` secret-free and set the real value in your shell profile instead. Cursor resolves `${env:NAME}` in `command`, `args`, `env`, `url`, and `headers`.

### Alternative: connect directly over HTTP (no bridge)

If your Cursor version supports remote/HTTP MCP servers and you don't want to run a local process, you can point Cursor directly at the HTTP endpoint instead — **this variant has not been manually verified end-to-end and should be smoke-tested before relying on it**:

```json
{
  "mcpServers": {
    "sequrai": {
      "url": "https://your-sequrai-deployment.example.com/api/mcp",
      "headers": {
        "Authorization": "Bearer seq_live_your_key_here"
      }
    }
  }
}
```

---

## 4. Enabling the server in Cursor

1. Save the config file above.
2. Open Cursor → **Settings** (`Cmd/Ctrl+Shift+J`) → **Tools & MCP**.
3. Find `sequrai` in the list and toggle it on. Cursor should report the server as connected and list the five tools (`can_i_deploy`, `safe_fix`, `what_changed`, `production_history`, `deployment_confidence`).
4. **Manually verify:** the exact panel name/location ("Tools & MCP") and toggle behavior against your installed Cursor version — this has moved before and may move again.

---

## 5. Example calls

Once enabled, ask Cursor's agent things like:

- "Can I deploy this?" → Cursor should call `can_i_deploy` with no arguments (auto-selects your project if your org has exactly one).
- "What's blocking production and how do I fix the first one?" → Cursor should call `safe_fix` with no `blockerId` first (to list candidates), then call it again with the chosen `blockerId`.
- "What changed since my last review?" → `what_changed`.
- "Show me my production history for the last 30 days." → `production_history` with `range: "30d"`.
- "Would you deploy this?" → `deployment_confidence`.

You can also invoke tools directly from Cursor's tool-call UI with explicit arguments, e.g.:

```json
{ "projectId": "11111111-1111-4111-8111-111111111111", "locale": "es" }
```

---

## 6. Project selection

- If your SequrAI organization has exactly one project, you can omit `projectId`/`repositoryId`/`repositoryFullName` entirely — it's auto-selected.
- If your organization has more than one project and you don't specify one, every tool returns an `ambiguous_project` error with a concise list of project names and stable IDs. Pass one of those IDs as `projectId` (or the exact `owner/repo` as `repositoryFullName`) on your next call.
- SequrAI never guesses nondeterministically and never exposes projects belonging to another organization, regardless of what ID you pass — the server re-validates every ID against your API key's organization.

---

## 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Server shows as disconnected / not listed | Wrong absolute path to `stdio-bridge.mjs`, or `node` not on PATH | Use an absolute path; confirm `node --version` works in the same shell Cursor uses |
| `unauthorized` on every call | Missing/invalid `SEQURAI_API_KEY` | Regenerate a key in SequrAI Settings and update `env` |
| `invalid_api_key` | Key was revoked | Generate a new key; revoked keys cannot be un-revoked |
| `project_not_found` | Wrong `projectId`/`repositoryFullName`, or it belongs to another organization | Omit the field to auto-select (if you have one project) or call any tool with no selector to receive the `ambiguous_project` list |
| `ambiguous_project` | Your organization has multiple projects and none was specified | Pass one of the returned project IDs |
| `no_verdict_available` | The project has never completed a Production Review | Push a commit or trigger a scan in SequrAI first |
| Tool calls hang or time out | Network/firewall blocking outbound HTTPS from the bridge process | Confirm the machine running Cursor can reach `SEQURAI_API_URL` directly (e.g. `curl` it) |
| Changes to `env` don't take effect | Cursor caches the running server process | Toggle the server off/on, or fully restart Cursor |

---

## 8. Key revocation

1. SequrAI → Settings → MCP Integration → find the key by name/prefix → **Revoke**.
2. Revocation is immediate (`revoked_at` is set server-side); any in-flight or future call with that key returns `invalid_api_key` / `unauthorized`.
3. Revoked keys cannot be restored — generate a new key and update your `.cursor/mcp.json` `env` block.
4. Rotate keys whenever a laptop is lost, a key is accidentally committed, or a teammate leaves the organization.
