# Database Migrations (001–015)

Apply in numeric order. Do not skip migrations.

## Execution order and dependencies

| # | File | Purpose | Destructive? |
|---|------|---------|--------------|
| 001 | `001_initial_schema.sql` | Core tables, initial RLS | No |
| 002 | `002_scan_engine_v1.sql` | Scan engine tables | No |
| 003 | `003_user_github_tokens.sql` | GitHub token storage | No |
| 004 | `004_reset_scan_schema.sql` | **Drops scan tables** and recreates | **YES — one-time only** |
| 005 | `005_ai_security_engine.sql` | AI engine tables | No |
| 006 | `006_github_automation.sql` | Webhooks, repository events | No |
| 007 | `007_fix_repository_scan_state_rls.sql` | RLS fix | No |
| 008 | `008_production_readiness.sql` | Readiness columns | No |
| 009 | `009_mcp_api_keys.sql` | MCP API keys | No |
| 010 | `010_production_verdicts.sql` | Production Verdict persistence | No |
| 011 | `011_profiles_locale.sql` | User locale | No |
| 012 | `012_repository_sync_status.sql` | Push detection state | No |
| 013 | `013_automatic_production_reviews.sql` | Automatic review type | No |
| 014 | `014_verdict_autopilot.sql` | Continuous Reviews toggle | No |
| 015 | `015_organization_security_hardening.sql` | Org RLS + creation RPC | No |

## Destructive migration warning

**Migration 004** drops `scans`, `scan_findings`, `repository_scan_state`, and related tables.
Never re-run on a populated production database.

## Idempotency

Migrations 001–003, 005–015 use `if not exists` / `drop policy if exists` where appropriate.
Migration 004 is **not** idempotent.

## Production verification

After applying all migrations:

```bash
node scripts/schema-health-check.mjs
```

Manual SQL checks:

```sql
-- RPC exists
select proname from pg_proc where proname = 'create_organization_with_owner';

-- Autopilot column
select verdict_autopilot_enabled from organizations limit 1;

-- Automatic review column
select review_type from scans limit 1;

-- Permissive membership insert policy must NOT exist
select polname from pg_policy
where polrelid = 'public.organization_members'::regclass
  and polname = 'Users can create org memberships';
-- Expected: 0 rows after migration 015
```

## Rollback

Migration 015 rollback (emergency only):

```sql
-- Recreate permissive policies ONLY if rolling back 015 entirely
-- Not recommended — fix forward instead
```

Do not roll back migrations 004+ on production with data.
