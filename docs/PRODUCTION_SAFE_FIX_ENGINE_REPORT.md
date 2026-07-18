# Production Safe Fix Engine — Hardening Sprint Report

**Builder Edition V1 · Product Frozen · Hardening only**

## Summary

The Production Safe Fix Engine is SequrAI's deterministic bridge between **Production Verdict blockers** and **AI-assisted implementation** in Cursor, Claude Code, Lovable, or Bolt.

SequrAI **never modifies user code**. It generates the **safest possible implementation prompt** so builders can fix blockers without breaking their application.

---

## Product philosophy

| SequrAI does NOT answer | SequrAI answers |
|-------------------------|-----------------|
| "How do I build my application?" | **Can I deploy?** |
| | **If not, what is the safest way to fix it?** |

### The number one rule

**THE SMALLEST POSSIBLE SAFE CHANGE.**

Every prompt prioritizes safety, minimal scope, preserved behaviour, preserved architecture, and preserved user intent over refactors, improvements, or new features.

---

## Architecture

```
Production Verdict (blockers + priorities)
        │
        ▼
brain/fix-prompt/
├── assessment.ts          Confidence, risk, scope
├── build-production-fix-prompt.ts   16-section Safe Fix Prompt
├── category-guidance.ts   Preserve / do-not-modify / tests
├── format-stack.ts        Stack detection + enrichment
└── index.ts
        │
        ├── SafeFixMetrics (UI)
        ├── CopySafeFixPromptButton (clipboard)
        └── MCP explain_production_blocker (same template)
```

### Deterministic by design

- No paid AI APIs
- No code execution or file editing
- No auto-fix, PRs, commits, or deploys
- Prompt assembled from scan findings, stack metadata, and category rules

---

## UX

### Critical Blockers Detected

Each blocker card displays:

| Field | Example |
|-------|---------|
| Severity | Critical / High |
| Estimated fix time | ~45 min |
| Safe Fix Confidence | 87% |
| Implementation Risk | MEDIUM |
| Estimated scope | 2 files · 18–45 LOC |
| Projected verdict | Almost Ready |
| **Copy Safe Fix Prompt** | clipboard |

Surfaces:

- Production report / scan detail — priority blockers
- Technical findings — per CRITICAL/HIGH finding
- Production Intelligence — top `fix_blocker` recommendation

---

## Safe Fix Prompt template (16 sections)

1. **PROJECT CONTEXT** — detected stack
2. **PRODUCTION BLOCKER** — what, where, severity, impact
3. **WHY THIS MATTERS** — production/security/deployment risk
4. **GOAL** — smallest safe fix
5. **FILES TO REVIEW** — affected paths
6. **PRESERVE THE FOLLOWING** — functionality, UI, contracts, schema, flows
7. **DO NOT MODIFY** — refactors, renames, architecture, UX
8. **IMPLEMENTATION REQUIREMENTS** — minimum safe approach
9. **SAFE IMPLEMENTATION PRINCIPLES** — no breaking changes, stop when done
10. **REGRESSION TESTS** — happy path, auth, failures, edge cases
11. **BUILD REQUIREMENTS** — build, typecheck, tests, lint
12. **CONFIDENCE SCORE** — Safe Fix Confidence (70–98%)
13. **IMPLEMENTATION RISK** — LOW / MEDIUM / HIGH + reason
14. **ESTIMATED FIX TIME** — minutes
15. **ESTIMATED SCOPE** — files, LOC range, complexity
16. **PROJECTED PRODUCTION VERDICT** — current → projected

---

## Confidence score system

**Safe Fix Confidence** (70–98%) represents:

> How confident is SequrAI that this change can be safely implemented without regressions?

| Factor | Effect |
|--------|--------|
| Single affected file | +6 |
| Clear recommended action | +4 |
| Low implementation risk | +4 |
| Critical severity | −6 |
| Authorization/database category | −10 |
| Multiple files (4+) | −6 |

Examples: **98%** single middleware header fix · **87%** auth session update · **74%** RLS policy change

---

## Risk assessment system

| Risk | When | Example |
|------|------|---------|
| **LOW** | 1 file, config/middleware | Security header in `next.config.ts` |
| **MEDIUM** | Auth flow, 2+ files | Session rotation across middleware + auth lib |
| **HIGH** | Authorization/database, 3+ critical touchpoints | Permissive RLS on user profiles |

---

## Estimated scope strategy

Derived from affected files, category risk, and estimated fix minutes:

- **Files expected** — count of affected paths (minimum 1)
- **LOC range** — conservative estimate from complexity and time
- **Complexity** — low / medium / high with human-readable label

---

## Tech stack detection

1. Primary: `scans.detected_stack` from static analysis
2. Enrichment: dependency map → Stripe, Tailwind, Clerk, Auth.js, Expo, etc.
3. Fallback: project framework enum (e.g. NEXTJS)

---

## Example: secrets blocker

**Blocker:** Service role referenced in client bundle  
**Confidence:** 91% · **Risk:** LOW · **Scope:** 1 file · 8–15 LOC  
**Projected:** Not Ready → Almost Ready

Prompt instructs: move service role to server-only code, preserve env naming, verify build output contains no secrets, run full validation suite.

---

## Builder Edition V1 alignment

### In scope ✅

- Safe Fix Prompt generation (deterministic)
- Confidence, risk, and scope metrics in UI
- Copy-to-clipboard on all blocker surfaces
- MCP parity with in-app prompts
- EN/ES i18n

### Out of scope ❌

- AI auto-fix, autonomous coding, PR generation
- Code execution, GitHub writes, auto deploy
- Multi-agent orchestration, AI chat
- Enterprise-only features

---

## Success criteria

A builder can:

1. Receive Production Verdict → NOT READY TO SHIP
2. See **Critical Blockers Detected**
3. Click **Copy Safe Fix Prompt**
4. Paste into Cursor without editing structure
5. Implement the smallest safe fix
6. Push → Continuous Review → updated verdict
7. Deploy with confidence

---

## Validation

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

Tests: `brain/__tests__/fix-prompt-engine.test.ts`

---

## Module reference

| Path | Role |
|------|------|
| `brain/fix-prompt/assessment.ts` | Confidence, risk, scope |
| `brain/fix-prompt/build-production-fix-prompt.ts` | Prompt assembly |
| `features/production-verdict/components/SafeFixMetrics.tsx` | Blocker metrics UI |
| `features/production-verdict/components/CopySafeFixPromptButton.tsx` | Copy action |
| `docs/PRODUCTION_FIX_PROMPT_ENGINE_REPORT.md` | Prior sprint (superseded by this doc) |
