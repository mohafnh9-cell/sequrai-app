# Block 6.5 — Production Journey — Delivery Report

**Status:** Complete (within scope)  
**Date:** 2026-07-17  
**Branch:** `main` (local, uncommitted)

---

## 1. Product outcome

Production Journey transforms isolated Production Verdicts into a **measurable evolution story**. Users see how their application improves, regresses, and matures over time — not a collection of scans.

**Route:** `/projects/[projectId]/journey`

**Navigation:** Project sub-nav — Overview · Production Journey · Technical Details

---

## 2. Architecture

```
production_verdicts (DB)
        ↓
loadVerdictJourneyRecords()     server/production-journey/load-verdicts.ts
        ↓
buildProductionJourney()        brain/production-journey/build.ts
        ↓
ProductionJourney (Zod)         brain/production-journey/schema.ts
        ↓
getProductionJourneyByProject() server/production-journey/get-production-journey.ts
        ↓
ProductionJourneyView           features/production-journey/components/
ProductionJourneyPreviewCard    (overview preview)
PortfolioVerdictCard            (dashboard preview)
```

**Design principles:**
- No verdict recalculation in the UI
- No `production_readiness_scores` as source
- Null scores never plotted as zero
- Failed scans shown as events, not score points
- Milestones computed on read (no duplicate store)

---

## 3. Contract (`ProductionJourney`)

**File:** `brain/production-journey/schema.ts`

| Field | Description |
|-------|-------------|
| `currentScore`, `previousScore`, `bestScore`, `lowestScore` | Score aggregates from valid verdicts |
| `currentStatus`, `previousStatus`, `bestStatus` | Verdict status progression |
| `totalReviews`, `validReviews`, `completedReviews`, `failedReviews` | Review counts |
| `blockersResolved`, `blockersIntroduced`, `currentBlockers`, `netBlockerImprovement` | Blocker aggregates |
| `scoreChange7d`, `scoreChange30d` | Period score deltas |
| `currentFocusKey` | Single primary focus area |
| `currentMilestone`, `nextMilestoneKey` | Latest reached + next target |
| `trend` | `improving` \| `stable` \| `declining` \| `insufficient_data` |
| `maturity` | `unassessed` → `production_maintained` |
| `timeline` | `ProductionJourneyPoint[]` |
| `milestones` | `ProductionMilestone[]` |
| `areasProgress` | Per-area current vs previous (from verdict snapshots) |
| `latestIntroducedTitles`, `latestResolvedTitles` | Latest review impact |
| `skippedInvalidVerdicts` | Corrupt/invalid records omitted |

Validated with Zod on build and server return.

---

## 4. Trend methodology

**File:** `brain/production-journey/trend.ts`  
**Docs:** `docs/PRODUCTION_JOURNEY.md`

| Trend | Minimum data | Rules |
|-------|--------------|-------|
| `insufficient_data` | < 2 valid verdicts | Not enough history |
| `improving` | ≥ 2 valid | Recent 3-review avg ≥ prior window + 6, OR resolved blockers > introduced with positive delta |
| `declining` | ≥ 2 valid | Recent avg ≤ −6, OR blockers introduced > resolved with negative delta, OR status regression (`almost_ready` → `needs_improvement`) |
| `stable` | ≥ 2 valid | Absolute average change ≤ 4 |

Configurable thresholds in `brain/production-journey/config.ts`.

---

## 5. Maturity rules

**File:** `brain/production-journey/maturity.ts`

| Stage | Rules |
|-------|-------|
| `unassessed` | 0 valid reviews |
| `production_maintained` | Current `ready_to_ship` + last 2 reviews all `ready_to_ship` + no regression from ready |
| `production_ready` | Current `ready_to_ship` (first time or after regression) |
| `approaching_production` | `almost_ready` OR score ≥ 70 |
| `production_aware` | ≥ 2 reviews + blockers resolved OR trend improving/stable |
| `early_build` | `not_ready` OR score < 50 |

Presentation keys: `productionJourney.maturityValues.*` (EN/ES).

---

## 6. Milestones implemented

**File:** `brain/production-journey/milestones.ts`

| Type | Trigger |
|------|---------|
| `first_verdict` | First timeline point |
| `first_blocker_resolved` | First review with resolved blockers |
| `score_50` | Score ≥ 50 (once) |
| `score_70` | Score ≥ 70 (once) |
| `almost_ready` | First `almost_ready` status |
| `ready_to_ship` | First `ready_to_ship` status |
| `ten_reviews` | 10 valid reviews |
| `all_critical_resolved` | Blockers went to 0 after having blockers |
| `best_score` | Updated when new high score reached |
| `recovered_after_regression` | `ready_to_ship` again after score drop from ready |

No gamification. Editorial timeline presentation.

---

## 7. Current focus

**File:** `brain/production-journey/focus.ts`

Priority order:
1. `topPriorities[0].category` → mapped i18n key
2. First `partiallyEvaluatedAreas` entry
3. `focus.technicalReview` if blockers remain
4. `null` if no signal

Mapped categories: Authentication, Authorization, Secret Management, Data Protection, Dependencies, Deployment Configuration, Database Access, Performance, Reliability.

---

## 8. Areas progress

**File:** `brain/production-journey/areas-progress.ts`

Compares current vs previous verdict `evaluatedAreas` / `partiallyEvaluatedAreas` / `unevaluatedAreas`. Shows:
- Score progression when both snapshots exist
- `Partial coverage` / `Not evaluated` when applicable
- No fabricated historical area charts

---

## 9. Persistence decision

**No `production_milestones` table created.**

**Justification:** Milestones are deterministic from verdict history. No notifications, idempotency keys, or cross-session deduplication required in 6.5. Avoids duplicate data and migration overhead.

Timeline derived from `production_verdicts` with indexed queries (`project_id`, `generated_at`).

---

## 10. Server service

**Files:** `server/production-journey/`

| Function | Purpose |
|----------|---------|
| `getProductionJourneyByProject()` | Full journey with org access check |
| `getProductionJourney()` | Alias by repositoryId |
| `getProductionJourneyPreviewByProject()` | Lightweight preview |
| `getProductionJourneyTimeline()` | Paginated timeline |
| `getProductionJourneyMilestones()` | Milestones only |

**Observability logs:** `journey_requested`, `journey_built`, `journey_built_empty`, `journey_access_denied`, `journey_load_failed`

---

## 11. UI components

| Component | Location | Role |
|-----------|----------|------|
| `ProjectSubNav` | `features/production-journey/components/` | Tab navigation |
| `ProductionJourneyView` | same | Full journey page (8 sections per spec) |
| `JourneyScoreChart` | same | SVG chart, 7d/30d/all, accessible tooltips |
| `ProductionJourneyPreviewCard` | same | Project overview preview |
| `PortfolioVerdictCard` | `features/production-verdict/components/` | Dashboard row + journey preview |

**Page sections (in order):**
1. Journey Summary
2. Current maturity
3. Score evolution
4. Latest change
5. Milestones
6. Blockers resolved vs introduced
7. Current focus
8. Review history

---

## 12. i18n

**Namespace:** `productionJourney`  
**Files:** `messages/en/productionJourney.json`, `messages/es/productionJourney.json`

Product name **Production Journey** kept untranslated. All labels, trends, maturity, milestones, empty/error states translated.

---

## 13. Analytics events

**File:** `lib/analytics/track.ts`

- `production_journey_viewed`
- `journey_range_changed`
- `milestone_viewed`
- `review_history_opened`
- `latest_change_opened`
- `production_journey_cta_clicked`

---

## 14. Tests

| File | Coverage |
|------|----------|
| `brain/__tests__/production-journey.test.ts` | Trend (improving/stable/declining/insufficient), maturity, milestones, focus, null scores, failed scans, preview parity, regression recovery |
| `lib/i18n/__tests__/i18n.test.ts` | productionJourney EN/ES namespace |

**Not implemented:** React component tests (no jsdom/RTL setup in project). Covered by brain unit tests + manual QA checklist.

---

## 15. Validation results

```
npm test      → 116 passed (20 files)
npm run lint  → pass
npm run build → pass
npm run typecheck → pass (with write permissions)
```

---

## 16. Limitations & debt

| Item | Notes |
|------|-------|
| Blocker deduplication by fingerprint | Uses per-review counts; no cross-review fingerprint dedup yet |
| `resolvedTitles` inference | Heuristic from priority diff; may miss edge cases |
| Dashboard preview | Compact inline preview (trend, focus, milestone); not a mini-chart |
| Component tests | Requires vitest jsdom setup |
| `production_milestones` persistence | Deferred until notifications (Block 6.6+) |
| Area historical charts | Only current vs previous snapshot; no multi-point area history |
| Manual QA EN/ES | Checklist in spec §30 — not automated |
| Screenshots EN/ES | Require running app with seeded verdict data |

---

## 17. Block 6.6 readiness

**Recommendation: YES — foundation is ready for Block 6.6** after manual QA on projects with 2+ reviews.

Production Journey provides:
- Stable contract and service layer
- Honest trend/maturity from real verdicts
- Milestone detection hooks for future notifications
- i18n and analytics instrumentation

Block 6.6 can add notifications/emails on top of computed milestones without schema changes, or introduce `production_milestones` persistence if idempotent delivery is required.

---

## 18. Files changed (summary)

```
brain/production-journey/          # contract, trend, maturity, milestones, focus, build
server/production-journey/         # load, service, access control
features/production-journey/       # UI components
app/(dashboard)/projects/[id]/journey/page.tsx
app/(dashboard)/projects/[id]/page.tsx
app/(dashboard)/dashboard/page.tsx
features/production-verdict/components/PortfolioVerdictCard.tsx
messages/{en,es}/productionJourney.json
lib/i18n/load-messages.ts
lib/analytics/track.ts
docs/PRODUCTION_JOURNEY.md
docs/BLOCK_6.5_REPORT.md
brain/__tests__/production-journey.test.ts
lib/i18n/__tests__/i18n.test.ts
```
