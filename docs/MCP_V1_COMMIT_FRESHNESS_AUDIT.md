# Commit Freshness Pipeline — Audit & Fix

**Trigger**: `can_i_deploy` reported `stale: false` for `sequrai-app` while `reviewedCommitSha` (`3fe74b3…`) was multiple pushes behind the real GitHub `main` branch (`1c95888`, `871144a`, …).

## 1. Root cause

Two independent, compounding causes.

### 1a. Infra: the registered GitHub webhook can never be delivered to

Querying the live database for `sequrai-app` (`project_id 765f3d55-…`) directly:

| Table | Finding |
|---|---|
| `github_webhooks` | Row exists, `active: true`, `github_hook_id: 653307891`, created `2026-07-18T11:25:30Z`. `last_delivery_at: null` — **no delivery has ever reached this endpoint since creation.** |
| `repository_sync_status` | `branch`, `commit_sha`, `pushed_at`, `detected_at` all `null` — `recordPushDetection()` has **never run** for this project. |
| `repository_events` | **0 rows** — the webhook handler's `recordEvent()` has never been invoked for this project, for any event type. |
| `scans` (last 10) | Every scan is `review_type: manual`, `trigger_type: mcp` — zero automatic (webhook-triggered) reviews have ever run. |

Cross-checking the registration path (`server/github-automation/register-webhook.ts` → `resolveWebhookCallbackUrl()`) against the local environment: `NEXT_PUBLIC_APP_URL=http://localhost:3000` in `.env.local`. If the repository was connected while running the app locally, the webhook was registered with GitHub pointing at `http://localhost:3000/api/webhooks/github` — an address unreachable from GitHub's infrastructure. Every push since then triggers a delivery attempt on GitHub's side that can never reach SequrAI; our own logs and tables show nothing, because nothing ever arrives. This exactly explains the empty `repository_events` table and the never-set `last_delivery_at`.

(GitHub's own delivery log for hook `653307891` — which would show the literal failed HTTP attempts — was **not** queried: doing so requires decrypting and reusing a live user OAuth token against GitHub's API, which is a materially more sensitive operation than reading our own database, and the internal evidence above is already conclusive without it.)

### 1b. Code: MCP staleness never had an independent detection signal to lose in the first place

Independent of 1a, `getStalenessInfo()` (`server/mcp/staleness.ts`, pre-fix) computed `latestDetectedCommitSha` **exclusively** from `repository_scan_state.last_commit_sha` — a column written *only* as a side effect of a scan completing (`server/security-scanner/scan-job-runner.ts`, `server/automatic-verdict-update/finalize.ts`). It never consulted `repository_sync_status`, the table specifically built (Block 7.0.1) to record push detection immediately and independently of scan success.

Consequences, regardless of whether the webhook works:

- If webhook delivery fails (as in 1a) → zero signal of any kind → `stale: false` reported with total confidence.
- Even with a working webhook, if the automatic review is skipped or fails before finalize → `last_commit_sha` never advances → same unsafe `stale: false`.

This violates two explicit requirements: "the latest commit detection must not depend on the scan succeeding" and "do not invent that a verdict is current." This is the primary code defect this fix addresses.

## 2. Fix — exact files changed

| File | Change |
|---|---|
| `server/mcp/staleness.ts` | Rewritten. `latestDetectedCommitSha` now sourced from `repository_sync_status.commit_sha` (written before any scan runs) with a fallback to the latest automatic-review scan's `commit_sha`. Added `freshnessStatus: "current" \| "stale" \| "unknown"` and `reviewFailed`. Added `isPushDetectionTrustworthy()`: when there is no detected-commit signal at all, freshness is only ever `"current"` if push detection can be positively proven to work (active webhook, at least one prior delivery, registered callback URL matches the currently deployed URL, connection status healthy) — otherwise `"unknown"`. A failed automatic review always resolves to `"stale"`. |
| `lib/github/webhook-service.ts` | Added `isPubliclyReachableCallbackUrl()` — rejects `localhost`/loopback/private-network callback URLs. |
| `server/github-automation/register-webhook.ts` | Refuses to register a webhook against an unreachable callback URL (`status: "skipped"`, surfaced to the connect flow as a warning) instead of silently creating one GitHub can never call. Persists the registered `callback_url` on `github_webhooks` so future drift can be detected. |
| `database/migrations/017_webhook_callback_url.sql` | `alter table github_webhooks add column if not exists callback_url text;` — **applied to production** (see §5). |
| `server/repository-sync/persistence.ts` | `recordPushDetection()` now reads the existing row first and ignores an incoming push whose `pushedAt` is older than what is already recorded — an older/retried delivery can no longer regress `latestDetectedCommitSha`. |
| `server/mcp/tools/can-i-deploy.ts`, `server/mcp/tools/deployment-confidence.ts` | Expose `freshnessStatus`; render the new "unknown" warning and "review failed" warning; downgrade a `deploy`/`SHIP_IT` recommendation to `more_analysis_required`/`MORE_ANALYSIS_REQUIRED` when `reviewFailed` is true (a failed review for a newer commit is positive proof the current recommendation may be outdated). |
| `messages/en/mcp.json`, `messages/es/mcp.json` | New keys: `canIDeploy.freshnessUnknown`, `canIDeploy.reviewFailedWarning`, `deploymentConfidence.freshnessUnknown`, `deploymentConfidence.reviewFailedWarning` (EN + ES). |
| `docs/MCP_V1_IMPLEMENTATION.md`, `docs/MCP_V1_IMPLEMENTATION_REPORT.md` | Updated §7 (staleness behavior) to describe the corrected design. |

Deliberately **not** changed: `scan-job-runner.ts` failure handling (already correctly leaves `repository_scan_state.last_commit_sha`/`active_scan_id` in the right state on failure — verified by reading the code and by `staleness.test.ts`'s "preserves the stale state after a scan fails" case), `delivery-idempotency.ts` (duplicate-delivery dedup by delivery ID already existed and is correct), and no new product features were added.

## 3. Database state — before and after

**Before** (live query, `sequrai-app`, `project_id 765f3d55-…`):

```json
// repository_sync_status
{ "branch": null, "commit_sha": null, "pushed_at": null, "detected_at": null, "connection_status": "connected" }
// github_webhooks
{ "active": true, "last_delivery_at": null, "callback_url": <column did not exist> }
// production_verdicts (latest)
{ "score": 100, "status": "ready_to_ship", "generated_at": "2026-07-19T07:07:42.231Z" }
```

MCP `can_i_deploy` (pre-fix, live): `"stale": false`, `"reviewedCommitSha": "3fe74b3…"`, `"latestDetectedCommitSha": "3fe74b3…"` — **incorrect**: no evidence backs the claim that this is the latest commit.

**After migration 017** (applied to production via direct `DATABASE_URL` connection, additive-only `add column if not exists`):

```json
// github_webhooks.callback_url column now exists (null for the pre-existing row until the webhook is re-registered)
```

**After the code fix ships**, the same live query for `sequrai-app` will resolve to `freshnessStatus: "unknown"` (not `"current"`), because: `github_webhooks.last_delivery_at` is still `null` (never proven to work) — see §6 for the exact expected/actual response captured post-deploy.

## 4. Tests added

- `server/mcp/__tests__/staleness.test.ts` — `getStalenessInfo()` unit tests: push marks stale before any scan; `reviewInProgress` while a scan runs; stale state survives scan failure; stale clears only once the reviewed commit matches; unknown freshness for no-webhook / inactive-webhook / connection-issue / never-detected-a-push / callback-URL-mismatch; non-GitHub projects are not penalized; failed automatic review → `"stale"` (never merely `"unknown"`).
- `server/repository-sync/__tests__/persistence.test.ts` — `recordPushDetection()`: fresh detection persists immediately; a newer delivery overwrites; an older/out-of-order delivery cannot regress the detected commit.
- `lib/github/__tests__/webhook-service.test.ts` — `isPubliclyReachableCallbackUrl()`: accepts production HTTPS URLs; rejects `localhost`, loopback, and private-network addresses (the exact regression); rejects malformed URLs.
- `server/mcp/__tests__/canonical-tools.test.ts` — updated existing stale/reviewInProgress fixtures to the new `repository_sync_status`-based model; added: unknown-freshness surfaced in `can_i_deploy`'s summary; failed-review → `"stale"` with the correct warning; `deployment_confidence` unknown-freshness warning; `deployment_confidence` decision downgrade on failed review; Spanish-locale unknown-freshness summary.
- `server/mcp/__tests__/i18n.test.ts` — EN/ES copy exists and is correct for both new warning keys on both tools.

## 5. Typecheck / lint / tests / build

```
npm run typecheck   → clean (tsc --noEmit, 0 errors)
npm run lint         → clean (eslint, 0 errors)
npx vitest run       → 40 files, 282 tests passed (0 failed)
npm run build        → production build succeeded (Next.js 16, Turbopack)
```

Migration 017 applied directly to the production database (additive `add column if not exists callback_url text` on `github_webhooks`); verified via `information_schema.columns`.

## 6. Manual smoke-test result

A full live end-to-end run of §7 of the request (push A → B, verify stale mid-scan, verify current after scan, push C with an intentionally failed scan) requires a repository with a **working** webhook connection, which `sequrai-app` does not currently have (see §1a — this is the actual product bug being reported, not a test-environment limitation). Reconnecting GitHub for `sequrai-app` from the **deployed** app (not `localhost`) will register a webhook with a reachable `callback_url`, which the fix will then treat as trustworthy going forward.

What *was* validated live — the fix was pushed to `main` (`871144a..b3c8434`), deployed on Vercel, and `can_i_deploy` was called again for the real `sequrai-app` project/its real, currently-broken webhook:

**Before fix** (captured at the top of this audit):

```json
{ "stale": false, "latestDetectedCommitSha": "3fe74b3…", "reviewedCommitSha": "3fe74b3…" }
```

No `freshnessStatus` field existed. No warning in `summary`. Presented as a confident, current `SHIP_IT`.

**After fix** (captured live, same project, same still-broken webhook, immediately after deploy):

```json
{
  "reviewedCommitSha": "3fe74b32f4a3e373c95acd72e40a0cac34dffe40",
  "latestDetectedCommitSha": null,
  "stale": true,
  "freshnessStatus": "unknown",
  "reviewInProgress": false,
  "reviewFailed": false,
  "deploymentRecommendation": "SHIP_IT",
  "summary": "...\n\nSequrAI no pudo verificar si este veredicto cubre tu código más reciente. La detección de pushes no tiene ninguna señal confirmada para este repositorio — reconecta GitHub o ejecuta una nueva revisión para estar seguro."
}
```

This is the exact behavior change required: `stale` flipped from a confidently-wrong `false` to `true`, `latestDetectedCommitSha` is honestly `null` instead of an unfounded value, and every response now carries an explicit, localized warning that SequrAI cannot verify the verdict is current — instead of silently presenting a two-day-stale verdict as fresh. `deploymentRecommendation` remains `SHIP_IT` here because no automatic review has ever run to *fail* (`reviewFailed: false` — this repository's webhook has never delivered at all, so there is nothing to downgrade against; the warning is the correct signal for this specific failure mode, per §3's requirement to distinguish "unknown" from "stale with positive evidence").

The unit and integration tests in §4 cover the rest of the state-machine (stale-before-scan, stale-through-failure, current-only-on-match, idempotent/ordered push detection) that this specific project's permanently-broken webhook cannot exercise end-to-end. Reconnecting GitHub for `sequrai-app` from the **deployed** app (not `localhost`) will register a webhook with a reachable `callback_url`; once GitHub delivers at least one push to it, freshness will resolve to `"current"`/`"stale"` with a real `latestDetectedCommitSha` instead of `"unknown"`.
