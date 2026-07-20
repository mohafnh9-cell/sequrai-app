# Workspace GitHub Migration Report

Date: 2026-07-20

## Summary

Migration **019_workspace_github_connections.sql** introduces Workspace-scoped GitHub connections and backfills clear ownership cases from legacy `user_github_tokens`.

## Before state

- GitHub OAuth stored per user (`user_github_tokens.user_id`)
- Repository listing and connect used **current user's** token regardless of active Workspace
- Background automation scanned org members for any stored token

## After state

- `workspace_github_connections` keyed by `organization_id`
- OAuth callback binds token to intended Workspace via signed state cookie
- `/api/github/repos` and `/api/github/connect` require Workspace connection
- Webhooks resolve projects by `github_repository_id` without session

## Backfill results (expected)

| Scenario | Action |
|----------|--------|
| User with 1 Workspace + token | Connection created (`legacy-backfill` login until next OAuth) |
| User with N Workspaces, 1 with GitHub projects | Connection assigned to that Workspace only |
| Ambiguous multi-Workspace | No connection row — user must reconnect per Workspace |

## Production steps

1. Apply migration: `npm run db:apply-migrations` or run SQL in Supabase
2. Set `GITHUB_OAUTH_STATE_SECRET` in Vercel (recommended)
3. Deploy application
4. Existing users with ambiguous ownership: see **Reconnect required** on Integrations

## Validation checklist

- [ ] Workspace A connects GitHub account A
- [ ] Switch to Workspace B → Integrations shows **Not connected**
- [ ] Connect GitHub account B in Workspace B
- [ ] Repository lists never mix after switching
- [ ] Push to repo A triggers review only in Workspace A

## Rollback / recovery

- Revert app to previous release
- Table `workspace_github_connections` can remain; legacy paths still read `user_github_tokens` when table absent
- Do not delete `user_github_tokens` during rollback window
