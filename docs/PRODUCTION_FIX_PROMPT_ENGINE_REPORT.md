# Production Fix Prompt Engine — Hardening Sprint Report

**Builder Edition V1 · Product Frozen · Hardening only**

## Summary

The Production Fix Prompt Engine transforms every Production Verdict blocker into a **deterministic, production-grade prompt** that builders can copy and paste directly into Cursor, Claude Code, Lovable, or Bolt.

This is **not** an auto-fix feature. SequrAI does not modify code, open pull requests, or execute agents. It answers:

> "How do I safely fix what prevents me from deploying?"

---

## Problem → Solution

| Before | After |
|--------|-------|
| Production Verdict → NOT READY → Recommendations → user figures out the fix | Production Verdict → NOT READY → **Production Blockers** → **Copy Production Fix Prompt** → paste in Cursor → fix → push → Continuous Review → READY TO SHIP |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Static analysis (existing)                                     │
│  scan_findings + detected_stack + Production Verdict priorities │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  brain/fix-prompt/                                              │
│  ├── format-stack.ts        Tech stack labels + enrichment      │
│  ├── category-guidance.ts   Preserve / do-not-modify / tests    │
│  ├── build-production-fix-prompt.ts  Template assembly          │
│  └── index.ts                                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
   FastestPathForward   FindingCard   MCP explainProductionBlocker
   (priority blockers)  (technical)   (agent API — same template)
```

### Design principles

- **Deterministic** — no paid AI APIs; prompts are assembled from scan data and category rules.
- **Smallest safe fix** — every prompt instructs minimal scope and forbids unrelated refactors.
- **Stack-aware** — uses `detected_stack` from completed scans, enriched from `package.json` dependencies.
- **Category-aware** — authentication, authorization, secrets, deployment, and database each get tailored preserve/test guidance.

### Key modules

| Path | Role |
|------|------|
| `brain/fix-prompt/build-production-fix-prompt.ts` | Core template engine |
| `brain/fix-prompt/format-stack.ts` | Stack detection and formatting |
| `brain/fix-prompt/category-guidance.ts` | Per-category preserve / regression rules |
| `features/production-verdict/components/CopyProductionFixPromptButton.tsx` | Clipboard UX |
| `features/production-verdict/fix-prompt-context.ts` | Context builder for UI surfaces |
| `server/mcp/copilot-handlers.ts` | MCP uses same engine for `explain_production_blocker` |

---

## UX

### Production Blockers section (formerly "Recommendations" label in UI)

Each priority blocker card shows:

- Issue title and rank
- Why it matters
- Estimated fix time
- Estimated score improvement (+ points)
- **Projected Production Verdict after fix**
- **Copy Production Fix Prompt** button
- Review fix link (scrolls to technical details on scan page)

### Technical findings

Each CRITICAL/HIGH finding in **Technical details** includes the same copy button.

### Production Intelligence panel

When the recommended action is `fix_blocker`, the top priority includes **Copy Production Fix Prompt** beside the report CTA.

### Analytics

`fix_prompt_copied` event with `source` (`priority` | `finding` | `intelligence`), category, and severity. Skipped on `/demo` routes.

---

## Prompt template

Every generated prompt follows this structure:

```
PROJECT CONTEXT
Project stack:
- Next.js
- TypeScript
- Supabase
...

ISSUE DETECTED
[title + description]

WHY THIS MATTERS
[reason + estimated impact]

GOAL
[smallest safe fix + recommended action + target time]

FILES TO REVIEW
[affected paths]

PRESERVE THE FOLLOWING
[category-specific list]

DO NOT MODIFY
[category-specific list]

IMPLEMENTATION REQUIREMENTS
[recommended action + constraints]

REGRESSION TESTS
[category-specific checklist]

VALIDATION
npm run build
npm run typecheck
npm test
npm run lint

EXPECTED RESULT
Current Production Verdict: Not Ready to Ship
Projected after this fix: Almost Ready (+18 points)
```

---

## Tech stack detection strategy

1. **Primary source:** `scans.detected_stack` JSON from static analysis (`features/security-scanner/stack.ts`).
2. **Enrichment:** `brain/fix-prompt/format-stack.ts` maps known dependencies to labels:
   - Next.js, React, TypeScript, Tailwind CSS
   - Supabase, Firebase, PostgreSQL, Prisma, Stripe, Clerk, Auth.js
   - Expo, React Native, Vercel, Docker
3. **Fallback:** project `framework` enum (e.g. `NEXTJS` → Next.js + React + TypeScript).

No additional network calls. No secrets exposed in prompts.

---

## Example prompts (abbreviated)

### Authentication blocker

**Issue:** Session tokens not rotated after password reset  
**Stack:** Next.js, Supabase, TypeScript  
**Preserve:** sign-in flows, callback URLs, session shape  
**Regression:** invalid credentials rejected, expired sessions redirect  
**Projected:** Not Ready → Almost Ready

### Secrets blocker

**Issue:** Service role referenced in client bundle  
**Stack:** Next.js, Supabase  
**Preserve:** env var naming, server-only patterns  
**Do not modify:** git history (rotate instead)  
**Regression:** no secrets in client bundle or build output

### Authorization / RLS blocker

**Issue:** Permissive RLS policy on user profiles  
**Stack:** Supabase, PostgreSQL  
**Preserve:** unrelated table policies  
**Regression:** users access only own rows, cross-tenant denied

---

## Estimated implementation time

| Work item | Estimate |
|-----------|----------|
| Core prompt engine + category guidance | 4–6 h |
| UI integration (priorities, findings, intelligence) | 3–4 h |
| MCP alignment + demo/report wiring | 1–2 h |
| Tests + i18n + documentation | 2 h |
| **Total** | **~10–14 h** |

Actual sprint delivery: single hardening pass within Builder Edition V1 scope.

---

## Builder Edition V1 alignment

### In scope ✅

- Deterministic prompt generation from existing verdict data
- Copy-to-clipboard UX on blockers
- Tech stack context from scan metadata
- MCP `explain_production_blocker` uses the same template
- EN/ES i18n for new strings
- Demo environment support (read-only, fictional data)

### Explicitly out of scope ❌

- Auto code modifications
- Pull request generation
- Autonomous agents or file editing
- GitHub write actions
- Paid AI generation for prompts
- Enterprise-only workflows

---

## Success criteria

A builder can:

1. Receive a Production Verdict (NOT READY TO SHIP)
2. Open Production Blockers on the report or scan page
3. Click **Copy Production Fix Prompt**
4. Paste into Cursor or Claude Code without editing the structure
5. Apply the smallest safe fix
6. Push code
7. Receive an updated Production Verdict from Continuous Reviews

---

## Validation

Run before release:

```bash
npm run typecheck
npm run lint
npm test -- --run
npm run build
```

Dedicated tests: `brain/__tests__/fix-prompt-engine.test.ts`

---

## Files changed (reference)

- `brain/fix-prompt/*` — new engine
- `features/production-verdict/components/FastestPathForward.tsx`
- `features/production-verdict/components/TechnicalFindingsSection.tsx`
- `features/production-verdict/components/CopyProductionFixPromptButton.tsx`
- `features/production-intelligence/components/ProductionIntelligencePanel.tsx`
- `server/mcp/copilot-handlers.ts`
- `messages/en/verdict.json`, `messages/es/verdict.json`
