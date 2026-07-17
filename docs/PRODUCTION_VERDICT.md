# Production Verdict Architecture (Block 6.1 + 6.2)

## Rule for all consumers

**No consumer may calculate Production Ready Score, status, or priorities outside the Production Verdict Engine.**

Read persisted `ProductionVerdictV1` from `production_verdicts` (or generate via `generateAndPersistProductionVerdict` on scan completion).

## Schema v1.0.0

Official statuses:

- `ready_to_ship`
- `almost_ready`
- `needs_improvement`
- `not_ready`
- `insufficient_data`
- `analysis_failed`

UI labels and badges: `brain/production-verdict/status-ui.ts`

## Data flow

```
scan completed
  → generateAndPersistProductionVerdict (server/production-verdict/service.ts)
  → production_verdicts (JSONB + denormalized columns)
  → repository_scan_state.current_verdict_id
  → buildProjectBrain / buildOrgBrain / MCP / GitHub / scan detail
```

## Persistence

Migration: `database/migrations/010_production_verdicts.sql`

Apply in Supabase SQL Editor or CLI:

```bash
psql "$DATABASE_URL" -f database/migrations/010_production_verdicts.sql
```

Verify:

```bash
npx tsx scripts/health-check-production-verdict.ts
```

## Legacy migration

| Legacy | Status |
|--------|--------|
| `production_readiness_scores` writes | **Stopped** (`persist-readiness.ts` no-op) |
| `calculateProductionReadiness` in brain builders | **Removed** |
| `ready_for_production` UI status | **Mapped** via `adapters/legacy.ts` only |
| `getProjectProductionStatus` | **Deprecated** — use `VerdictStatus` |

## Backfill

Dry-run first:

```bash
npx tsx scripts/backfill-production-verdicts.ts --dry-run --limit 20
```

Apply:

```bash
npx tsx scripts/backfill-production-verdicts.ts --limit 100
```

## Consumer guidelines

- **Dashboard / Org brain**: aggregate persisted verdicts only
- **Project brain**: `getCurrentProductionVerdict` → `currentVerdict`
- **MCP / GitHub**: formatters in `adapters/format.ts`
- **UI**: `ProductionHero`, `ProductionVerdictPanel` consume verdict or view model — no local score math
- **AI Production Engineer**: may change wording only; never mutate score, status, blockers, or priorities

## Contract tests

`brain/__tests__/production-verdict-consolidation.test.ts` validates adapter consistency.

## Block 6.3 — Experience layer

UI components live in `features/production-verdict/components/`:

- `ProductionVerdictHero` — executive verdict header (all statuses)
- `FastestPathForward` — top 3 priorities from verdict
- `ProjectedScorePanel` — current → projected score
- `ScoreDeltaSummary` — contextual delta narrative
- `ProductionEngineerSummary` — executive note (AI enhances wording only)
- `CoverageBreakdown` — evaluated / partial / not evaluated areas
- `TechnicalFindingsSection` — collapsed secondary findings
- `ProductionVerdictExperience` — scan/report orchestrator
- `ProjectVerdictSummary` — project overview entry point
- `PortfolioVerdictCard` — dashboard portfolio rows

View models: `brain/production-verdict/experience-view.ts`

Analytics stubs: `lib/analytics/track.ts`

**Rule:** Components consume `ProductionVerdictV1` only — no score/status recalculation in UI.
