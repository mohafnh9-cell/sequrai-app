# Production Journey — Trend Methodology (Block 6.5)

Production Journey trend is computed **deterministically** from persisted `production_verdicts` only.

## Valid verdicts

A verdict counts toward score/trend when:

- `status !== analysis_failed`
- `score !== null`

Null scores are never plotted as zero.

## Trend states

| Trend | Minimum data | Rules |
|-------|----------------|-------|
| `insufficient_data` | < 2 valid verdicts | Not enough history |
| `improving` | ≥ 2 valid | Recent 3-review average ≥ prior window + 6, OR resolved blockers > introduced with positive delta |
| `declining` | ≥ 2 valid | Recent average ≤ -6, OR blockers introduced > resolved with negative delta, OR status regression |
| `stable` | ≥ 2 valid | Absolute average change ≤ 4 |

## Persistence

No duplicate verdict store. Milestones derived on read (no `production_milestones` table in 6.5).
