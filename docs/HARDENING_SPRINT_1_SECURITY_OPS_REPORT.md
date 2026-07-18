# Hardening Sprint 1 — Security & Operations Report

**Product:** SequrAI Builder Edition V1  
**Sprint scope:** Security, operations, migrations, release readiness  
**Date:** July 2026  
**Verdict:** **YES, WITH DOCUMENTED LIMITATIONS**

---

## 1. Executive summary

This sprint addressed the critical security and operational blockers identified in QA audit QA.1. The most severe issue — permissive `organization_members` INSERT RLS allowing any authenticated user to join any organization — is fixed in migration **015**. The missing `create_organization_with_owner` RPC is now versioned in the same migration. Production auth bypass is blocked at build time (Vercel production) and runtime (`next start`). GitHub webhook verification was hardened. GitHub token encryption-at-rest is implemented when `GITHUB_TOKEN_ENCRYPTION_KEY` is configured. Environment validation and schema health-check scripts were added.

**Connected Supabase instance status (verified this sprint):**

| Check | Result |
|-------|--------|
| `create_organization_with_owner()` RPC | Present |
| Migrations 010–014 columns | **Not applied** — `verdict_autopilot_enabled`, `review_type`, `repository_sync_status` missing |
| Migration 015 | **Not applied** — permissive membership policy may still be active |

**Before inviting beta users:** apply migrations 010–015 on production Supabase and run `node scripts/schema-health-check.mjs`.

---

## 2. Security issues found

| ID | Severity | Issue |
|----|----------|-------|
| S1 | **Critical** | `organization_members` INSERT policy: `with check (auth.uid() is not null)` — any user could insert membership into any org |
| S2 | **Critical** | `create_organization_with_owner` RPC used by signup but absent from repo migrations |
| S3 | **High** | `SEQURAI_BYPASS_AUTH` could authenticate as arbitrary org via service role in non-production |
| S4 | **High** | GitHub tokens stored plaintext in `user_github_tokens` |
| S5 | **Medium** | `getSession()` used for auth gate on GitHub repos route (identity not verified first) |
| S6 | **Medium** | Client-side `members.service.ts` could insert members if RLS permitted |
| S7 | **Low** | Stripe webhook stub without signature verification (billing inactive in beta) |
| S8 | **Ops** | Migrations 010–014 not applied on connected database |
| S9 | **Ops** | No env validation or schema health check before deploy |

---

## 3. Security issues fixed

| Fix | File(s) |
|-----|---------|
| Removed permissive org/membership INSERT policies | `database/migrations/015_organization_security_hardening.sql` |
| Added secure `create_organization_with_owner` RPC (SECURITY DEFINER, search_path, auth.uid() validation) | Migration 015 |
| Tightened membership SELECT to same-org roster only | Migration 015 |
| Added owner/admin UPDATE/DELETE policies for memberships | Migration 015 |
| Production bypass blocked on Vercel production build | `next.config.mjs` |
| Runtime bypass blocked when `NODE_ENV=production` | `lib/env/production-guard.ts`, `lib/auth/dev-bypass.ts` |
| GitHub repos route uses `getUser()` before `getSession()` | `app/api/github/repos/route.ts` |
| Webhook: content-type check, invalid signature logging | `app/api/webhooks/github/route.ts` |
| GitHub token AES-256-GCM encryption when key configured | `lib/crypto/token-encryption.ts`, `lib/github/token-store.ts` |
| Env validation script | `scripts/validate-env.mjs`, `lib/env/validate-env.ts` |
| Schema health check script | `scripts/schema-health-check.mjs` |
| `.env.example` without secrets | `.env.example` |
| Beta deployment checklist | `docs/BETA_ENV_CHECKLIST.md` |
| Migration documentation | `database/migrations/README.md` |
| Tests: RLS migration, token encryption, auth guard, cross-tenant, webhooks | 17 new tests (187 total) |

---

## 4. Remaining known risks

| Risk | Severity | Mitigation for beta |
|------|----------|---------------------|
| Migrations 010–015 not yet on production DB | **Blocker** | Apply before first invite |
| GitHub tokens plaintext if encryption key unset | High | Set `GITHUB_TOKEN_ENCRYPTION_KEY`; document in invite |
| Inline scan execution (60s serverless limit) | Medium | Curate small repos; document limit |
| Multi-org users get `.limit(1)` nondeterministic org | Low | Beta = 1 org per user |
| No automated RLS integration tests against live Postgres | Low | Manual SQL verification in checklist |
| Stripe webhook unsigned | Low | Billing not active in beta |
| E2E push→verdict not executed in this sprint | Medium | Manual smoke test required |
| `members.service.ts` client insert still exists | Low | Blocked by RLS after migration 015 |

---

## 5. Migrations audited

| # | File | Status in repo | Connected DB |
|---|------|----------------|--------------|
| 001 | initial_schema | ✅ | Partial (base tables exist) |
| 002 | scan_engine_v1 | ✅ | Applied |
| 003 | user_github_tokens | ✅ | Applied |
| 004 | reset_scan_schema | ✅ | **One-time only — never re-run** |
| 005 | ai_security_engine | ✅ | Applied |
| 006 | github_automation | ✅ | Applied |
| 007 | fix_repository_scan_state_rls | ✅ | Applied |
| 008 | production_readiness | ✅ | Applied |
| 009 | mcp_api_keys | ✅ | Applied |
| 010 | production_verdicts | ✅ | **Missing columns** |
| 011 | profiles_locale | ✅ | Unknown |
| 012 | repository_sync_status | ✅ | **Table missing** |
| 013 | automatic_production_reviews | ✅ | **Missing review_type** |
| 014 | verdict_autopilot | ✅ | **Missing column** |
| 015 | organization_security_hardening | ✅ New | **Not applied** |

See `database/migrations/README.md` for order, dependencies, and verification SQL.

---

## 6. RLS changes (migration 015)

**Removed:**
- `"Users can create org memberships"` — `with check (auth.uid() is not null)`
- `"Authenticated users can create organizations"`

**Added/updated:**
- `"Members can view org memberships"` — SELECT limited to orgs the user belongs to
- `"Owners and admins can update member roles"` — UPDATE
- `"Owners and admins can remove members"` — DELETE
- **No client INSERT policy** — membership creation only via `create_organization_with_owner` RPC

**Verification after apply:**
```sql
select polname, polcmd from pg_policy
where polrelid = 'public.organization_members'::regclass;
-- Must NOT include "Users can create org memberships"
```

**Policy test (reproducible):**
As authenticated user A, attempt:
```sql
insert into organization_members (organization_id, user_id, role)
values ('<org-b-id>', auth.uid(), 'MEMBER');
```
Expected: **permission denied** after migration 015.

---

## 7. Auth changes

| Surface | Before | After |
|---------|--------|-------|
| Dev bypass | Enabled via env in any environment | Blocked when `NODE_ENV=production`; Vercel production build fails if set |
| GitHub repos API | `getSession()` only | `getUser()` then `getSession()` for provider token |
| GitHub connect API | Already used `getUser()` | Unchanged |
| Scan routes | `getUser()` + membership check | Unchanged — verified |
| MCP routes | Bearer hash lookup + org scope | Unchanged — verified |
| Org creation | RPC (missing from migrations) | RPC in migration 015 |

### Authorization matrix (summary)

| Resource | Auth method | Authorization check |
|----------|-------------|---------------------|
| Dashboard pages | Middleware + `getServerAuthContext()` | Session user required |
| Projects/scans API | `getUser()` | Org membership + project org match |
| GitHub connect | `getUser()` | Single org membership, token verified against GitHub API |
| GitHub webhook | HMAC signature | Repository matched by `github_repository_id` in DB |
| MCP tools | Bearer key SHA-256 hash | Key org must match project org |
| Production verdicts | Server-side | Org membership via project |
| Admin operations | Service role only | Never exposed to client |

---

## 8. GitHub webhook changes

| Control | Status |
|---------|--------|
| HMAC SHA-256 | ✅ `verifyGitHubWebhookSignature` with `timingSafeEqual` |
| Missing secret → 503 | ✅ |
| Invalid signature → 401 | ✅ + structured log (no payload secrets) |
| Content-Type application/json | ✅ Added 415 for non-JSON |
| Fast 202 response | ✅ Processing in `after()` |
| Delivery idempotency | ✅ `repository_events.github_delivery_id` unique upsert |
| Repository matching | ✅ `findProjectByRepositoryId` — no trust of unregistered repos |

---

## 9. MCP findings

| Control | Status |
|---------|--------|
| Keys hashed SHA-256 at rest | ✅ |
| Plaintext key shown once on create | ✅ |
| Bearer validation | ✅ `resolveMcpAuth` |
| Cross-tenant project access | ✅ `assertProjectInOrg` |
| Revocation | ✅ `revoked_at` timestamp |
| Rate limiting | ❌ Not implemented — acceptable for 25-user beta |
| Key creation auth | ✅ Requires authenticated org member |

---

## 10. Token-storage status

| Aspect | Status |
|--------|--------|
| Client access to tokens | ❌ Denied — RLS enabled, no policies on `user_github_tokens` |
| Service-role only read/write | ✅ `token-store.ts` uses admin client |
| Logs exclude token values | ✅ Only userId/error codes logged |
| Encryption at rest | ✅ AES-256-GCM when `GITHUB_TOKEN_ENCRYPTION_KEY` set (32-byte base64) |
| Backward compatibility | ✅ Plaintext tokens still readable if no `enc:v1:` prefix |
| Beta recommendation | **Set encryption key before invite** |

Generate key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 11. Environment checklist

See `docs/BETA_ENV_CHECKLIST.md` and `.env.example`.

**Production required:**
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GITHUB_WEBHOOK_SECRET`

**Production recommended:**
- `GITHUB_TOKEN_ENCRYPTION_KEY`

**Production forbidden:**
- `SEQURAI_BYPASS_AUTH` (any truthy value)

**Validate:**
```bash
npm run validate:env:production
npm run validate:schema
```

---

## 12. E2E evidence

**Status: NOT EXECUTED in this sprint** — requires live GitHub push against deployed environment with migrations 010–015 applied.

The connected Supabase database is **missing migrations 010–014**, so automatic Continuous Reviews and Production Verdict persistence would fail or degrade on that instance today.

### Manual E2E procedure (required before beta)

1. Apply migrations 010–015 on production Supabase
2. Deploy with production env vars validated
3. Sign in → create organization
4. Connect GitHub repo via Integrations
5. Confirm webhook in GitHub repo settings (deliveries tab)
6. Wait for or trigger first Production Review
7. Confirm `production_verdicts` row exists
8. Push empty commit to connected branch
9. Confirm GitHub webhook delivery 202
10. Confirm `repository_events` row with delivery ID
11. Confirm automatic scan with `review_type = 'automatic'`
12. Confirm Production Verdict updated on project page and dashboard

**Expected timing:** 3–5 minutes for first verdict; 1–3 minutes for push-triggered update on small repos.

---

## 13. Test results

```
Test Files  28 passed (28)
Tests       187 passed (187)
Typecheck   PASS
Lint        PASS
Build       PASS
```

New test coverage:
- `lib/crypto/__tests__/token-encryption.test.ts` — encryption round-trip, migration 015 SQL assertions
- `lib/env/__tests__/production-guard.test.ts` — bypass blocking, env validation
- `lib/auth/__tests__/authorization.test.ts` — cross-tenant denial, MCP scope
- Extended `server/github-automation/__tests__/webhook-utils.test.ts` — signature edge cases

---

## 14. Deployment steps

1. **Apply migrations 010–015** in Supabase SQL Editor (in order)
2. Run `node scripts/schema-health-check.mjs` — must pass
3. Set Vercel production environment variables (see checklist)
4. Generate and set `GITHUB_TOKEN_ENCRYPTION_KEY`
5. Confirm `SEQURAI_BYPASS_AUTH` is **unset** on Vercel production
6. Deploy to Vercel production
7. Run manual E2E procedure (Section 12)
8. Invite first beta user

---

## 15. Rollback guidance

| Change | Rollback |
|--------|----------|
| Migration 015 | **Do not roll back RLS to permissive state.** Fix forward only. |
| Token encryption | Remove key → new tokens stored plaintext; existing encrypted tokens require key to decrypt |
| Auth bypass guard | Revert `lib/env/production-guard.ts` only if emergency local dev needed |
| Migrations 010–014 | Do not drop columns on populated DB without backup |

Emergency: disable Continuous Reviews via org setting (`verdict_autopilot_enabled = false`) after migration 014 is applied.

---

## 16. Private beta limitations

1. **Curated users only** — max ~25 builders, desktop, small repos
2. **Migrations must be current** — 001–015
3. **Manual E2E required** per deploy
4. **60-second scan ceiling** on Vercel — large repos may fail
5. **Token encryption optional but strongly recommended**
6. **No MCP rate limiting**
7. **Single org per user** recommended (multi-org nondeterministic)
8. **Billing/Stripe inactive** — do not expose billing flows

---

## 17. Final scores

| Category | Score | Notes |
|----------|-------|-------|
| **Security** | **8.0 / 10** | Critical RLS fixed in code; must apply migration 015 on prod |
| **Operational readiness** | **7.5 / 10** | Scripts + docs added; prod DB migrations pending |
| **GitHub readiness** | **8.0 / 10** | Webhook solid; E2E unverified; env deps documented |
| **Multi-tenant isolation** | **8.5 / 10** | After 015: strong; scan/MCP routes verified |
| **Private beta readiness** | **7.5 / 10** | Ready after migrations + manual E2E |

---

## Final question

**If 25 curated AI builders connected real private GitHub repositories tomorrow, would you be comfortable allowing them to use SequrAI?**

### **YES, WITH DOCUMENTED LIMITATIONS**

**Evidence for YES:**
- Critical membership RLS vulnerability has a tested fix (migration 015)
- Org creation RPC is now versioned and secure
- Webhook HMAC verification is strict
- Auth bypass cannot run in production runtime
- Token encryption available
- Authorization patterns on scans, projects, MCP are sound
- 187 tests passing; build clean

**Conditions before invite:**
1. Apply migrations **010–015** on production Supabase (verified failing today)
2. Run schema health check — must pass
3. Set all production env vars including webhook secret and encryption key
4. Execute manual E2E push→verdict flow once on production
5. Invite only curated builders with documented repo size limits

**Would not say unconditional YES** because migrations are not yet applied on the connected database and E2E was not executed in this session. With those two operational steps complete, the product is defensible for a private beta with 25 trusted AI builders.

---

*No new product features were introduced in this sprint.*
