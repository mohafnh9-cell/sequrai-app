# Hardening Sprint 3 — GitHub Flow & Reliability Report

**Product:** SequrAI Builder Edition V1 (product frozen)  
**Sprint scope:** GitHub integration reliability, Continuous Reviews pipeline, Production Verdict automation  
**Date:** July 2026  
**Trust verdict:** **YES, WITH LIMITATIONS**

---

## 1. Executive summary

This sprint audited the full GitHub → Continuous Review → Production Verdict → Dashboard pipeline and hardened reliability gaps without adding product features. The core flow is architecturally sound: OAuth connect, webhook registration, HMAC-verified push handling, automatic review creation, verdict finalization, and SSR dashboard/project views all exist and are wired together.

**Six reliability fixes were applied in code.** The largest gaps before this sprint were: webhook deliveries marked `processed` before reviews finished, duplicate delivery replays not short-circuited, push metadata write failures blocking reviews entirely, and stale GitHub auth not surfacing as connection errors.

**Blockers before 25 beta users:** apply migrations **010–015** on production Supabase, configure `GITHUB_WEBHOOK_SECRET` + token encryption key, and run one manual push→verdict smoke test per connected repo.

**Test status after sprint:** 189 tests passing, typecheck clean.

---

## 2. End-to-end flow audit

### 2.1 Connect repository

| Step | Implementation | Status |
|------|----------------|--------|
| GitHub OAuth | Supabase GitHub provider + `startGitHubOAuth()` from integrations/onboarding | ✅ |
| Token storage | `user_github_tokens` with optional AES-256-GCM encryption | ✅ |
| Repo verification | `getGitHubRepoById()` confirms user access before save | ✅ |
| Project upsert | `app/api/github/connect/route.ts` with missing-column fallback | ✅ |
| Webhook registration | `registerProjectWebhook()` — create or reuse hook, upsert `github_webhooks` | ✅ |
| Sync status init | `initializeRepositorySyncStatus()` on connect | ✅ (requires migration 012) |

**Observations:** Webhook registration is skipped (with warnings) when `GITHUB_WEBHOOK_SECRET` or `NEXT_PUBLIC_APP_URL` is missing — the repo connects but Continuous Reviews will not run until env is fixed and user reconnects. Admin client absence also skips webhooks silently with a warning in the API response.

### 2.2 Push detection

| Step | Implementation | Status |
|------|----------------|--------|
| Webhook endpoint | `POST /api/webhooks/github` — signature verify, 202 fast response | ✅ |
| Background processing | Next.js `after()` runs orchestrator asynchronously | ✅ |
| Project lookup | Match `github_repository_id` on `projects` | ✅ |
| Token resolution | First org member with stored GitHub token (up to 20 members) | ✅ |
| Push parsing | `parsePushDetection()` — branch, SHA, message, timestamp | ✅ |
| Sync metadata | `recordPushDetection()` → `repository_sync_status` | ✅ |
| Event log | `repository_events` with `github_delivery_id` unique constraint | ✅ |

### 2.3 Continuous Review (automatic)

| Step | Implementation | Status |
|------|----------------|--------|
| Autopilot gate | `organizations.verdict_autopilot_enabled` (default on) | ✅ |
| Decision engine | `shouldRunAutomaticReview()` — connection, commit, duplicates, in-progress | ✅ |
| Scan creation | `scans` row with `review_type: automatic`, `trigger_type: webhook` | ✅ |
| Scan execution | `InlineScanJobRunner` — fetch repo, run rules, `persistMode: review_only` | ✅ |
| Duplicate commit | Unique partial index on completed automatic reviews per commit | ✅ |
| Active review guard | Skips if another scan is in queued/fetching/indexing/scanning state | ✅ |

### 2.4 Production Verdict & recommendations

| Step | Implementation | Status |
|------|----------------|--------|
| Verdict finalize | `finalizeProjectStateAfterAutomaticReview()` after completed scan | ✅ |
| Idempotent verdict | Skips if verdict already exists for scan | ✅ |
| Project score update | Updates `projects.security_score` + `last_scan_at` | ✅ |
| Recommendations | Production Intelligence derived from latest verdict/findings | ✅ |
| Dashboard | `buildOrgBrain()` + `PortfolioVerdictCard` + autopilot summary | ✅ |
| Project page | Verdict hero → Recommendations → Continuous Reviews (`AutopilotSection`) | ✅ |

### 2.5 UI state machine

Autopilot states (`deriveAutopilotState`): `disabled` → `repository_disconnected` → `reviewing_changes` → `review_failed` / `up_to_date` / `waiting_for_changes`.

Continuous Reviews badge shows spinner during active review, destructive badge on failure, checkmark when verdict is current.

---

## 3. Reliability issues found

| ID | Severity | Issue |
|----|----------|-------|
| R1 | **High** | Push webhook events marked `processed` **before** automatic review completed — audit trail showed success while review could still fail |
| R2 | **High** | Duplicate GitHub delivery replays not short-circuited — same `github_delivery_id` could re-trigger processing |
| R3 | **Medium** | `recordPushDetection()` threw on DB error, aborting review even when push was valid |
| R4 | **Medium** | Expired/revoked GitHub tokens during scan did not update `repository_sync_status` — UI stayed "connected" |
| R5 | **Medium** | Dashboard/project pages could serve cached SSR — user returning after push might see stale verdict |
| R6 | **Medium** | Migrations 010–014 not applied on connected Supabase — Continuous Reviews tables/columns missing in prod |
| R7 | **Medium** | Inline scan runs inside webhook `after()` with **60s** Vercel `maxDuration` — large repos may timeout |
| R8 | **Medium** | Webhook returns 202 immediately — if background worker crashes, GitHub will **not** retry |
| R9 | **Low** | No live polling while user keeps a tab open — must navigate away and back (or refresh) to see updates |
| R10 | **Low** | Concurrent duplicate pushes for same commit (race) could create two in-flight scans — only completed reviews are deduped |
| R11 | **Low** | Org token resolver is nondeterministic among members — first token wins |
| R12 | **Low** | Multi-org users blocked at connect (409) — acceptable for beta |
| R13 | **Info** | PR webhook path still runs legacy full-scan automation — out of V1 product scope but adds server load if PR events fire |

---

## 4. Reliability issues fixed (this sprint)

| Fix | File(s) | Impact |
|-----|---------|--------|
| Record `processed`/`failed` **after** review completes, not before | `server/github-automation/orchestrator.ts` | Accurate event audit trail; failures visible in `repository_events` |
| Short-circuit duplicate deliveries with terminal status | `server/github-automation/delivery-idempotency.ts`, orchestrator | Prevents duplicate review triggers on replay |
| Soft-fail push metadata writes | `server/repository-sync/persistence.ts` | Review proceeds even if sync metadata write fails |
| Mark `invalid_github_connection` on GitHub 401/403 during scan | `server/automatic-review/run-on-push.ts` | Autopilot shows connection issue; user knows to reconnect |
| Force dynamic SSR for dashboard routes | `app/(dashboard)/layout.tsx` | Fresh verdict/review state on navigation back to app |
| Unit tests for delivery terminal statuses | `server/github-automation/__tests__/delivery-idempotency.test.ts` | 189 tests total |

---

## 5. Remaining limitations

| Limitation | User impact | Beta mitigation |
|------------|-------------|-----------------|
| Migrations 010–015 not on production DB | Continuous Reviews completely broken | Apply migrations before invites |
| 60s serverless ceiling | Large repos fail mid-review | Document repo size limits; typical Next.js/Supabase apps fit |
| No background job queue | Scan tied to webhook worker lifetime | Acceptable for 25 users; monitor Vercel function logs |
| No token refresh | User must reconnect GitHub after token expiry | Clear error state + integrations reconnect path |
| No in-tab auto-refresh | User with open tab must navigate/refresh | Acceptable if user flow is "push → return to app" |
| GitHub file caps (200 files, 5MB) | Very large monorepos get partial scan | Document in beta FAQ |
| Webhook misconfiguration silent at connect | Repo connected but no automation | Surface `webhookWarnings` in integrations UI (already returned by API) |

---

## 6. E2E GitHub flow results

### 6.1 Automated validation (executed this sprint)

| Test area | Result |
|-----------|--------|
| Webhook HMAC verification | ✅ 4 tests |
| Push detection parsing | ✅ brain/repository-sync tests |
| Automatic review decision tree | ✅ brain/automatic-review tests |
| Autopilot state derivation | ✅ brain/autopilot-experience tests |
| Verdict finalize logic | ✅ brain/automatic-verdict-update tests |
| Delivery idempotency | ✅ 2 new tests |
| Security scanner pipeline | ✅ integration tests |
| Full suite | ✅ **189/189 passing** |

### 6.2 Live E2E matrix (not executed — requires production credentials)

| Scenario | Expected behavior | Confidence |
|----------|-------------------|------------|
| Public Next.js repo, small | Push → review ~15–45s → verdict updates | **High** (code path verified) |
| Private repo | Same, token must have `repo` scope | **High** |
| Supabase + Next.js stack | Scanner rules detect env/secrets patterns | **High** (rule tests) |
| Cursor/Claude/Lovable/Bolt generated | Standard Next.js structure, within file limits | **Medium–High** |
| Large repo (>200 scannable files) | Partial scan, possible timeout | **Medium** — known cap |
| Duplicate push same commit | Skipped with `duplicate_review` | **High** |
| Push while review in progress | Skipped with `review_in_progress` | **High** |
| Expired GitHub token | Review fails, `invalid_github_connection` shown | **High** (after fix) |
| Missing webhook secret | 503 on webhook, no automation | **High** |
| Autopilot disabled in settings | Push detected, no review | **High** |

**Required before beta:** one manual smoke test — connect repo → push trivial commit → confirm Continuous Reviews badge → Production Verdict updated on dashboard and project page within 60s.

---

## 7. Performance observations

| Metric | Observation | 25-user capacity |
|--------|-------------|------------------|
| Webhook response | Returns 202 in <100ms (signature + JSON parse only) | ✅ Comfortable |
| Review execution | Inline scan: GitHub fetch (25s timeout) + rules — typically 10–45s for small Next.js repos | ✅ With headroom |
| Vercel maxDuration | 60s hard cap on webhook route | ⚠️ Edge case for large repos |
| GitHub API limits | 8 concurrent fetches, 200 file cap | ✅ Fine at beta scale |
| Database | Single scan insert + findings batch + verdict upsert per push | ✅ Fine at beta scale |
| Dashboard load | SSR `force-dynamic` — fresh queries per navigation | ✅ Acceptable for 25 users |
| Concurrent pushes | One active review per repo; others queue as skip | ✅ |

**Estimate:** 25 beta users with 1–3 repos each, pushing a few times per day, is comfortably within Vercel + Supabase free/pro tier limits assuming migrations are applied.

---

## 8. Failure scenarios

| Scenario | System behavior | User-visible state | Silent? |
|----------|-----------------|-------------------|---------|
| Invalid webhook signature | 401, no processing | No change | No — GitHub shows failed delivery |
| Webhook secret missing | 503 | Connect works, no automation | Partial — warnings in connect API |
| No org GitHub token | Event `failed`, sync error `invalid_github_connection` | Connection issue badge | No |
| Push to deleted branch | Ignored | No review | No — logged as ignored |
| Autopilot disabled | Push detected, no review | Waiting for changes / enabled | No — intentional |
| Scan timeout / GitHub error | Scan `failed`, event `failed` | Review failed badge | No |
| Verdict generation failure | Review completes, verdict missing | Review failed (errorCode) | No |
| Duplicate delivery replay | Ignored (`duplicate_delivery`) | No duplicate review | No — logged |
| Duplicate commit push | Skipped (`duplicate_review`) | Up to date | No |
| DB migration missing | Sync/review inserts fail | Broken or empty states | **Yes until schema check** |
| Background worker crash after 202 | Event may stay `processing` | Stuck reviewing | **Partial** — rare |
| Repository disconnected | Reviews skipped | Repository disconnected | No |

---

## 9. Beta limitations (GitHub-specific)

1. **One GitHub account per org** effectively — token from first member with stored credentials.
2. **github.com only** — enterprise/self-hosted not supported.
3. **Push events only** for Continuous Reviews — not PR comments, not manual webhook replay UI.
4. **Default branch pushes** parsed from ref; tag pushes ignored.
5. **File/size caps** on repository fetch — not a full clone.
6. **No GitHub App** — OAuth user token model; token expiry requires reconnect.
7. **Webhook URL must be publicly reachable** — localhost requires tunnel for dev testing.

---

## 10. Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **GitHub experience** | **7.5 / 10** | Connect + push → review pipeline works; missing live E2E proof and in-tab refresh |
| **Reliability** | **7.5 / 10** | Strong idempotency and state machine after fixes; 60s/serverless and migration dependency remain |
| **Private beta readiness (GitHub)** | **7.0 / 10** | Ready after migrations applied + one smoke test; not ready on current unmigrated prod DB |

---

## 11. Final questions

### 1. Does the GitHub experience feel magical?

**Almost.** The intended flow — connect, push, return, see updated verdict — is implemented. The Continuous Reviews badge and one-liner ("Every time your code changes, SequrAI automatically reviews it.") communicate the promise. It does not yet feel fully invisible because: (a) an open browser tab does not auto-update, and (b) webhook/env misconfiguration can connect a repo without enabling automation unless the user notices warnings.

### 2. Does the user trust the Continuous Reviews system?

**Yes, with caveats.** State transitions are explicit (reviewing, up to date, failed, disconnected). Failures surface in the Autopilot badge rather than failing silently. Trust requires migrations on production and a successful smoke test — without those, the system cannot demonstrate reliability.

### 3. Would you personally use SequrAI before deploying your own project?

**Yes, for a typical Next.js + Supabase project under the file/size caps**, after confirming migrations and webhook env on production. I would not rely on it yet for a large monorepo or as the sole gate for a high-stakes production deploy without monitoring function logs for timeouts.

### 4. Is Builder Edition V1 ready for 25 beta testers from a reliability perspective?

**Yes, with documented limitations**, contingent on:

- [ ] Apply migrations 010–015 on production Supabase
- [ ] Run `npm run validate:schema` — must pass
- [ ] Set `GITHUB_WEBHOOK_SECRET`, disable bypass auth, set encryption key
- [ ] Manual push → verdict smoke test on staging/production
- [ ] Monitor Vercel function logs for first week of beta

---

## 12. Trust verdict

### Would you trust SequrAI with one of your own production repositories?

**YES, WITH LIMITATIONS**

**Why yes:** The pipeline is coherent, idempotent at the delivery and completed-review layers, fails visibly in the UI, and respects the product-frozen scope (push-triggered automatic reviews → Production Verdict → Recommendations).

**Why limitations:** Production database migrations are not yet applied; inline scanning has a 60-second ceiling; live end-to-end validation was not run in this sprint; and token lifecycle depends on manual GitHub reconnect.

---

## 13. Pipeline diagram

```
Connect GitHub (OAuth)
        ↓
Select repository → verify access → save project
        ↓
Register webhook (HMAC secret) → init sync status
        ↓
Developer pushes code
        ↓
GitHub POST webhook → verify signature → 202 Accepted
        ↓
after() → orchestrator → parse push → record detection
        ↓
Autopilot enabled? ──no──→ change detected only
        ↓ yes
shouldRunAutomaticReview? ──no──→ skip (duplicate / in progress)
        ↓ yes
Create automatic scan → InlineScanJobRunner
        ↓
Scan completed → finalizeProjectStateAfterAutomaticReview
        ↓
Production Verdict persisted → project score updated
        ↓
User opens dashboard / project (force-dynamic SSR)
        ↓
Verdict + Recommendations + Continuous Reviews state visible
```

---

## 14. Files changed this sprint

| File | Change |
|------|--------|
| `server/github-automation/delivery-idempotency.ts` | New — delivery replay guard |
| `server/github-automation/orchestrator.ts` | Event ordering + dedup |
| `server/repository-sync/persistence.ts` | Soft-fail push metadata |
| `server/automatic-review/run-on-push.ts` | Auth error → sync status |
| `app/(dashboard)/layout.tsx` | `force-dynamic` for fresh SSR |
| `server/github-automation/__tests__/delivery-idempotency.test.ts` | New tests |

---

*Sprint 3 complete. Do not start Sprint 4 without explicit instruction.*
