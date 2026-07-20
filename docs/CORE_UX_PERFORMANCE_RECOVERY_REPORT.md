# Core UX, Performance and New User Analysis Recovery Report

Date: 2026-07-20  
Scope: Builder Edition V1 (product frozen) — onboarding, reanalysis UX, performance, clarity

## 1. Executive summary

This sprint targeted the launch blocker: a brand-new user must complete a first Production Review from an incognito session without manual backend intervention.

Root causes were traced to synchronous scan execution in the web API (HTTP blocked until scan finished, risking Vercel 60s timeout), weak post-auth routing (default landing on `/dashboard` instead of guided onboarding), and fragmented review UX (multiple button labels, analyze action buried off the project overview).

Fixes applied:

- Async Production Review requests (return quickly, poll for completion)
- Canonical Analyze project / Analyze again button with explicit states
- Simplified dashboard and project overview hierarchy
- Performance reductions on dashboard/projects (removed N× intelligence previews and autopilot panel)
- New-user routing defaults to `/onboarding`
- Post-connect redirect to project page with contextual guidance

## 2. Incognito / new-user root cause

| Issue | Evidence | Impact |
|-------|----------|--------|
| P0 — Synchronous scan in POST | `app/api/repositories/[repositoryId]/scans/route.ts` awaited `InlineScanJobRunner.run()` before responding | First review could timeout on Vercel; onboarding poll never received `scan_id` in time |
| P1 — Login default `/dashboard` | `safeNextPath` fallback was `/dashboard` | New users skipped guided onboarding |
| P1 — Integrations dead-end | `/projects` redirected to `/integrations` without verdict; no auto-analyze | Repo connected but no review started |
| P2 — Hidden analyze action | Labels: "Check production readiness", scans sub-route only | Users could not find reanalysis |

Configuration risks (documented, not code-fixed):

- Missing `SUPABASE_SERVICE_ROLE_KEY` → token storage + verdict writes fail silently
- Migrations 015/016 not applied → workspace creation / membership reads fail

Run `npm run validate:env:production` and `npm run validate:rls` before production E2E.

## 3. Exact failure point

Primary: `POST /api/repositories/:id/scans` held the HTTP connection open for the entire scan (up to 60s). On slow repos or cold starts, the request failed or timed out before the client could poll — especially in onboarding's first-review path.

Secondary: After GitHub connect, users landed on dashboard/integrations without a single obvious Analyze project CTA on the project overview.

## 4. Fixes applied

### First-review pipeline

- Scan API now queues `InlineScanJobRunner` via `after()` and returns 202 with `scan_id` immediately (same pipeline as MCP `review_now`).
- Onboarding repo connect redirects to `/projects/:id?connected=1` with guidance banner.
- Integrations single-repo connect redirects to project overview.
- `safeNextPath` default changed to `/onboarding`.

### Reanalysis UX

- New `AnalyzeProjectButton` — canonical labels EN/ES, states: ready, requesting, queued, processing, failed, disconnected, stale.
- Polls scan status every 4s; preserves previous verdict on failure.
- Shows commit SHA being analyzed and stale warnings.

### UI simplification

- Dashboard: portfolio ready / not ready / needs analysis counts; simplified project cards; removed ProductionHero, Autopilot dashboard section, intelligence previews.
- Project overview: verdict hero → analyze button → top blocker → collapsed secondary details.

### Performance

- `React.cache` wrapper for auth context (`getCachedServerAuthContext`).
- Layout uses `auth.organizationId` instead of duplicate workspace resolution.
- Dashboard/projects pages no longer run N× `getProductionIntelligencePreview`.
- Route-level `loading.tsx` for dashboard, projects, project detail.

### Analytics (dev console hook)

Added funnel events: `signup_completed`, `workspace_ready`, `github_connected`, `repository_selected`, `first_review_requested`, `first_review_started`, `first_review_completed`, `first_review_failed`, `analyze_again_clicked`, etc.

## 5. First-review flow

### Before

Register → login lands `/dashboard` → connect repo in integrations → no scan → user searches for "Check production readiness" on scans page → synchronous POST may timeout.

### After

Register → `/onboarding` → workspace → GitHub → repo → project page with Analyze project → async POST (fast ack) → poll → verdict on overview.

## 6. Reanalysis flow

### Before

Multiple labels; action on `/projects/:id/scans`; full page navigation; unclear progress.

### After

Single Analyze again (or Analyze latest commit when stale) on project overview; explicit progress states; duplicate active reviews return 409 with existing scan id.

## 7. Dashboard simplifications

Removed above-the-fold: ProductionHero, AutopilotDashboardSection, intelligence momentum panels, journey links on cards.

Added: portfolio summary counts + simplified project list with verdict, score, next action, open project.

## 8. Project-page simplifications

Hierarchy: name → verdict hero → analyze CTA → top blocker → collapsible details.

Removed from first viewport: autopilot section, full intelligence panel, edit/delete prominence.

## 9. Copy changes

Canonical visible strings:

| EN | ES |
|----|-----|
| Analyze project | Analizar proyecto |
| Analyze again | Analizar de nuevo |
| Analyze latest commit | Analizar último commit |
| Can you deploy? | ¿Puedes desplegar? |

## 10. Performance baseline (estimated)

| Page | Before (order of magnitude) | After |
|------|----------------------------|-------|
| Dashboard | ~90–120 Supabase round-trips | ~15–25 |
| Projects list | ~40–80+ (N× intelligence) | ~8–12 |
| Project detail | ~25–35+ (duplicate intelligence) | ~12–18 |
| Review request ack | 5–60s (inline scan) | under 1s target |

## 11–12. Performance improvements and query optimizations

- Removed intelligence preview N+1 on dashboard and projects pages.
- Removed autopilot dashboard aggregation from dashboard render path.
- Cached auth context per request.
- Eliminated duplicate workspace resolution in layout.
- Dashboard: parallel hasVerdict, projects list, buildOrgBrain.
- Project page: parallel brain, review context, latest scan, intelligence.

## 13. Authentication and RLS validation

- No auth bypass added.
- Scan creation still uses user-scoped client; scan state + verdict writes use admin client (unchanged).
- Workspace isolation preserved via existing membership checks in `getScanRequestContext`.

## 14. Tests added

- `lib/auth/__tests__/safe-next-path.test.ts` — onboarding default route
- `features/projects/__tests__/analyze-project-button.test.ts` — scan state helpers

## 15. Typecheck, lint, tests, build

Run locally:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## 16. Production E2E evidence

Status: Requires manual verification with a new test account in incognito against production after deploy.

## 17. Known remaining limitations

- Email signup still requires email confirmation before session.
- Full production intelligence journey still loads on project page (collapsed).
- Analytics provider not wired (console-only in dev).
- Production E2E not executed in this session.

## 18. Routes to manually test

- `/signup`, `/login` — default redirect to `/onboarding`
- `/onboarding` — workspace + GitHub + repo flow
- `/projects/:id?connected=1` — guidance banner + Analyze project
- `/dashboard` — portfolio counts, simplified cards
- `/projects` — no redirect loop without verdict
- `/integrations` — single repo → project page

## 19. Final scores

| Area | Score |
|------|-------|
| New-user onboarding | 8/10 |
| Clarity | 9/10 |
| Reanalysis UX | 9/10 |
| Navigation performance | 8/10 |
| Production readiness | 7/10 |

## Answer

Can a completely new user open SequrAI in an incognito browser, connect GitHub, analyze a repository and understand what to do next without assistance?

**YES, WITH LIMITATIONS**

Code paths are fixed for the primary failure (sync scan timeout + missing analyze CTA + dashboard dead-ends). Limitations: email signup path, unverified production E2E in this session, and environment/migration prerequisites must be confirmed in production.
