# Workspace-Scoped GitHub Architecture

## Previous ownership model

| Asset | Old scope | Problem |
|-------|-----------|---------|
| `user_github_tokens` | `user_id` | One token per user, reused across all Workspaces |
| `projects` | `organization_id` | Correct tenant, but no link to which GitHub connection owns the repo |
| Automation token lookup | First member token in org (≤20, unordered) | Wrong GitHub account could power another Workspace's reviews |

## New canonical hierarchy

```
User → Workspace (organization_id) → workspace_github_connections → Repositories → Reviews → Verdicts
```

## Schema changes (migration 019)

Table: `workspace_github_connections`

- One active connection row per Workspace (`unique (organization_id)`)
- Encrypted `access_token` / `refresh_token` (same encryption as legacy table)
- `github_user_id`, `github_login`, `connected_by_user_id`, `status`, scopes

Projects:

- `github_connection_id` → FK to workspace connection
- `connected_by_user_id`
- Unique `(organization_id, github_repository_id)` when repo linked

## Backfill strategy

1. **Single Workspace user** → copy `user_github_tokens` to that Workspace connection
2. **Multiple Workspaces, one with linked repos** → assign token only to that Workspace
3. **Ambiguous** → no row copied; UI shows reconnect required

Legacy `user_github_tokens` remains for OAuth session bootstrap only.

## OAuth state design

- `POST /api/github/oauth/prepare` validates membership, sets signed httpOnly cookie
- Payload: `{ workspaceId, userId, exp, nonce }` + HMAC-SHA256
- Callback validates cookie, upserts `workspace_github_connections`, redirects to `/integrations`

Secret: `GITHUB_OAUTH_STATE_SECRET` (falls back to service role key in dev)

## Token resolution

`resolveWorkspaceGitHubToken(admin, organizationId, projectId?)`

1. Project's `github_connection_id` if set
2. Else Workspace active connection
3. Legacy member-loop fallback only if migration table missing (`42P01`)

## Repository ownership

- Connect/list repos require Workspace connection token
- Duplicate GitHub repo across Workspaces rejected (`409 repository_already_connected`)
- Webhooks resolve **all** projects with matching `github_repository_id` (session-independent)

## MCP scoping

Unchanged: MCP keys remain `organization_id` scoped. GitHub for MCP reviews uses Workspace connection via `resolveOrganizationGitHubToken(orgId, projectId)`.

## RLS

- Members: SELECT on `workspace_github_connections`
- Owners: ALL (disconnect/reconnect management)

Server writes use admin client.

## UI changes

Integrations page:

- Loads `/api/github/connection` for active Workspace
- Shows connected / not connected / reconnect required
- Repository list only after Workspace connection exists
- Reconnect + Disconnect (owner)

## Tests

- `lib/github/__tests__/oauth-state.test.ts`

## Known limitations

- No GitHub App installation model yet (OAuth user tokens only)
- Token refresh not implemented
- Same physical GitHub repo cannot connect to two Workspaces in Builder V1

## Rollback

1. Revert application deploy
2. Migration 019 is additive — rollback leaves new table unused; legacy `user_github_tokens` + member loop fallback remain
