# Hardening Sprint 5 — Private Beta Readiness Report

**Product:** SequrAI Builder Edition V1 (product frozen)  
**Sprint scope:** Private beta go/no-go for first 25 users  
**Date:** July 2026  
**Final recommendation:** **YES, WITH LIMITATIONS — not tomorrow**

---

## 1. Executive summary

Builder Edition V1 is **product-complete in code** but **operationally not ready** to invite 25 users tomorrow. The core value proposition is clear and compelling: a Production Verdict that updates automatically on every push. Security hardening, UX simplification, GitHub reliability fixes, and landing repositioning were completed across Sprints 1–4 — but **most of that work is uncommitted locally**, and the **connected Supabase database is missing migrations 010–015**.

**Would I feel comfortable giving 25 Cursor users access tomorrow?**  
**No.** I would invite them **within 48–72 hours** after completing the pre-launch checklist below.

**Beta readiness score: 6.5 / 10**

---

## 2. Automated verification (executed this sprint)

| Check | Result |
|-------|--------|
| Unit / integration tests | ✅ **189/189 passing** |
| TypeScript | ✅ Clean |
| Production build | ✅ Succeeds |
| `npm run validate:env` (local) | ✅ Passes |
| `npm run validate:env:production` | ❌ **Fails** — `GITHUB_WEBHOOK_SECRET` missing; `SEQURAI_BYPASS_AUTH` enabled |
| `npm run validate:schema` | ❌ **Fails** — migrations 010–014 not applied |

### Schema failures (blockers)

```
MISSING column: organizations.verdict_autopilot_enabled
MISSING column: scans.review_type
MISSING migration marker: repository_sync_status.connection_status
```

Without these, **Continuous Reviews, automatic verdict updates, and autopilot toggle cannot function** on the connected database.

---

## 3. Product audit (Builder Edition V1)

| Feature | Code status | Live DB status | Beta-ready? |
|---------|-------------|----------------|-------------|
| **Production Verdict** | ✅ Engine, persistence, hero UI | ⚠️ Partial — `production_verdicts` table exists; autopilot finalize path needs `review_type` | **After migrations** |
| **Continuous Reviews** | ✅ Webhook → automatic scan → verdict | ❌ Broken — `review_type`, `repository_sync_status` columns missing | **After migrations** |
| **Recommendations** | ✅ Production Intelligence panel | ✅ Works on manual scans | **Yes** |
| **Production Verdict History** | ✅ Journey tab (`/projects/[id]/journey`) | ✅ Works with completed scans/verdicts | **Yes** |

**Verdict:** Product scope is correctly frozen. All four V1 features exist. Continuous Reviews — the core differentiator — **will fail silently or error** on the current database.

---

## 4. Onboarding audit

| Step | Status | Notes |
|------|--------|-------|
| Sign up | ✅ | Email + GitHub OAuth via Supabase |
| Login | ✅ | `redirectTo` supported; forgot-password added (Sprint 2, uncommitted) |
| Connect repository | ✅ | Onboarding + Integrations; webhook registration with warnings |
| First Verdict | ✅ | Manual review step in onboarding |
| Dashboard entry | ✅ | Redirects to onboarding until org has a verdict |

**Flow:** Welcome → GitHub → Repository → Review → Verdict reveal → Dashboard

**Risk:** If Continuous Reviews DB columns are missing, post-onboarding pushes will not update the verdict — user experience breaks after the magic moment.

---

## 5. GitHub experience audit

Consolidated from Sprint 3 (+ uncommitted fixes):

| Area | Status |
|------|--------|
| OAuth | ✅ Supabase GitHub provider |
| Repository connection | ✅ Verified via GitHub API |
| Webhook registration | ✅ HMAC secret required |
| Push detection | ⚠️ Requires `repository_sync_status` migration |
| Continuous Reviews | ⚠️ Requires `review_type` + autopilot column |
| Verdict auto-update | ⚠️ Requires migrations 013–014 |
| Delivery dedup | ✅ Fixed (uncommitted) |
| Token expiry UX | ✅ Marks `invalid_github_connection` (uncommitted) |

**GitHub score: 7.5 / 10** (code) · **4 / 10** (current DB)

---

## 6. Security audit

Consolidated from Sprint 1:

| Control | Code | Production DB |
|---------|------|---------------|
| RLS org membership | ✅ Migration 015 in repo | ❌ **Not applied** — permissive INSERT may still exist |
| `create_organization_with_owner` RPC | ✅ | ✅ Present |
| Auth bypass blocked in production build | ✅ | ⚠️ Verify Vercel env |
| Webhook HMAC validation | ✅ | ⚠️ Secret not configured |
| GitHub token encryption | ✅ Optional AES-256-GCM | ⚠️ Key not set — plaintext tokens |
| Cross-tenant scan access | ✅ Membership checks | ✅ |
| Service role isolation | ✅ Server-only | ✅ |

**Security score: 8 / 10** (code) · **5 / 10** (ops readiness)

**Do not invite users until migration 015 is applied.**

---

## 7. UX audit

Consolidated from Sprint 2 (uncommitted):

| Area | Status |
|------|--------|
| Dashboard | ✅ Verdict hero → Continuous Reviews → projects ("Can you deploy?") |
| Project page | ✅ Verdict → Recommendations → Continuous Reviews |
| Settings | ✅ Continuous Reviews toggle + language only |
| Empty states | ✅ Dashboard, projects list |
| Error states | ✅ Autopilot `review_failed`, connection issue badges |
| Loading states | ✅ Scan progress, onboarding review step |
| Mobile | ✅ Hamburger drawer nav |
| Dead nav removed | ✅ No timeline/security/ai-fixes in sidebar |

**Remaining UX gaps (non-blocking):**
- No in-tab auto-refresh after push (user must navigate back)
- In-app `/billing` page still shows old Free/Builder $29/Studio $99 plans — **inconsistent with landing €29 Private Beta**
- Orphan routes exist (`/timeline`, `/security`, `/ai-fixes`) but are not in nav

**UX score: 8 / 10**

---

## 8. Landing audit

Consolidated from Sprint 4 (uncommitted):

| Criterion | Status |
|-----------|--------|
| 5-second clarity | ✅ 12-word headline |
| V1-only messaging | ✅ |
| Cursor/Claude Code audience | ✅ Eyebrow names them |
| Pricing €29 / €49 | ✅ Builder Edition only |
| No fake social proof | ✅ |
| CTA | ✅ "Connect your repository" |

**Landing score: 8.5 / 10**

---

## 9. Pricing assessment

**Private Beta: €29/month**

| Question | Answer |
|----------|--------|
| Is the product worth €29/month? | **Yes** — for the target user shipping weekly with Cursor/Claude Code |
| Would I pay after one week? | **Yes, if Continuous Reviews worked reliably** and caught at least one real pre-production issue |

**Value anchor:** One prevented bad deploy (leaked Supabase key, missing auth guard, open CORS) saves hours of incident response and reputational damage. €29/month is cheap insurance for indie founders.

**Caveats for beta:**
- Stripe checkout **not implemented** (`/api/stripe/checkout` stub)
- In-app billing page **contradicts** landing pricing
- Beta can launch **free or invite-only** until billing is wired — do not charge until checkout works

**Pricing score: 7 / 10** (positioning strong; payment flow not live)

---

## 10. Documentation audit

| Document | Status |
|----------|--------|
| `docs/BETA_ENV_CHECKLIST.md` | ✅ Complete pre-launch checklist |
| `database/migrations/README.md` | ✅ Migration order + verification SQL |
| `.env.example` | ✅ Present |
| Sprint 1–4 reports | ✅ Audit trail (Sprints 2–4 uncommitted) |
| Known beta limitations | ✅ Documented in BETA_ENV_CHECKLIST |
| Manual setup instructions | ✅ GitHub OAuth scopes, webhook URL |

**Gap:** No single `PRIVATE_BETA_INVITE.md` with user-facing known limitations email — optional, not blocking.

---

## 11. Manual beta simulation

Full live E2E was **not executed** (requires production deployment + GitHub push). Below is a **simulated walkthrough** with pass/fail based on code + schema evidence.

| Step | Simulated result |
|------|------------------|
| Landing → understand product | ✅ Pass (Sprint 4 copy) |
| Sign up | ✅ Pass |
| Connect repository | ⚠️ Partial — connects but webhook skipped if secret missing |
| Get Production Verdict | ✅ Pass (manual onboarding scan) |
| Push code | ❌ **Fail on current DB** — Continuous Reviews columns missing |
| Continuous Reviews update | ❌ **Fail on current DB** |
| Production Verdict updated | ❌ **Fail on current DB** after push |
| Deploy decision | ✅ Pass — verdict UI answers "Can I deploy?" |
| Return next day | ⚠️ Partial — SSR refresh on navigation; no polling |
| Use again | ⚠️ Depends on push automation working |

**Manual E2E on production after checklist: REQUIRED before first invite.**

---

## 12. Failure scenarios

| Scenario | Handled? | User sees |
|----------|----------|-----------|
| GitHub OAuth failure | ✅ | Reconnect prompt |
| Missing `GITHUB_WEBHOOK_SECRET` | ✅ | Webhook 503; connect warnings |
| Expired GitHub token | ✅ | Connection issue badge (uncommitted fix) |
| Review scan failure | ✅ | `review_failed` autopilot state |
| Verdict generation failure | ✅ | Error on autopilot panel |
| Login / session expiry | ✅ | Redirect to login |
| Missing DB migrations | ❌ | **Silent breakage** of Continuous Reviews |
| Large repo timeout (60s) | ⚠️ | Scan fails; logged |
| Duplicate push | ✅ | Skipped gracefully |

---

## 13. Biggest strengths

1. **Laser-focused V1** — One question: "Can I deploy?" Everything else was stripped away.
2. **Production Verdict** — Concrete, memorable output; not another generic "security scanner."
3. **Continuous Reviews promise** — "Every push reviewed" matches how AI builders actually work.
4. **Target audience fit** — Cursor/Claude Code users shipping Next.js/Supabase apps weekly.
5. **Premium UX direction** — Dashboard, landing, and project page feel intentional after Sprints 2 and 4.
6. **Security awareness** — RLS hardening, webhook HMAC, token encryption path documented.

---

## 14. Biggest weaknesses

1. **Database migrations not applied** — Single largest blocker.
2. **Production env incomplete** — Webhook secret, encryption key, bypass auth.
3. **Hardening work uncommitted** — Sprints 2–4 + Sprint 3 fixes sit in local working tree.
4. **No verified live E2E** — Push → verdict automation never proven on production.
5. **Billing inconsistency** — Landing says €29; in-app billing shows legacy tiers.
6. **60s serverless scan limit** — Large repos may fail without user-visible guidance.

---

## 15. Known limitations (communicate to beta users)

1. GitHub.com only; one org per user effectively.
2. Continuous Reviews on **push events** — not PR comments.
3. Repository scan caps: 200 files, 5MB total (typical Next.js apps fit).
4. Inline scans may timeout on very large repos (60s).
5. GitHub token reconnect required after expiry.
6. English-first product copy; i18n partial.
7. Stripe billing coming — private beta may start free/invite-only.
8. No in-tab live updates — refresh or re-navigate after pushing code.

---

## 16. Scores summary

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Beta readiness (overall)** | **6.5 / 10** | Code ready; ops not |
| Product | 8.5 / 10 | V1 scope complete |
| UX | 8.0 / 10 | Sprint 2 uncommitted |
| GitHub | 7.5 / 10 | Code strong; DB blocks automation |
| Security | 6.5 / 10 | Migration 015 not on DB |
| Landing | 8.5 / 10 | Sprint 4 uncommitted |
| Pricing | 7.0 / 10 | Value clear; checkout missing |

---

## 17. Pre-launch checklist (must complete before invite)

### Day 0 — Blockers

- [ ] Apply migrations **010–015** on production Supabase
- [ ] Run `npm run validate:schema` — must pass
- [ ] Set `GITHUB_WEBHOOK_SECRET` on Vercel production
- [ ] Unset `SEQURAI_BYPASS_AUTH` on Vercel production
- [ ] Set `GITHUB_TOKEN_ENCRYPTION_KEY` (recommended)
- [ ] Commit + deploy Sprints 2–4 hardening changes
- [ ] Run full manual smoke test (see `docs/BETA_ENV_CHECKLIST.md` §5)

### Day 1 — Before first email

- [ ] Push trivial commit to connected test repo → verdict updates within 60s
- [ ] Confirm webhook delivery in GitHub repo settings
- [ ] Test signup → onboarding → dashboard on production URL
- [ ] Test mobile nav on iPhone-width viewport
- [ ] Align billing page copy with landing OR hide billing nav until Stripe live

### Day 2 — Invite

- [ ] Send invite to 5 internal testers first
- [ ] Monitor Vercel function logs for 24h
- [ ] Expand to 25 users if no P0 issues

---

## 18. Retention question

> If the Production Verdict saves a user from deploying bad AI-generated code once, will they continue paying?

**Yes — likely.**

**Why:**
- AI builders generate code fast but **lack production instinct**. A leaked env var, missing auth middleware, or exposed Supabase RLS gap is common in Cursor/Claude Code output.
- Catching **one** of these before deploy creates immediate, tangible ROI — far exceeding €29/month.
- Continuous Reviews make SequrAI **habit-forming**: every push → updated verdict. Users who connect once and see value will keep the repo connected.
- The product is not a one-time audit — it is ongoing production judgment, which justifies subscription pricing.

**Why they might churn:**
- Continuous Reviews fail silently (current migration gap — **must fix**).
- False sense of security if scan caps miss files in large repos.
- If verdict feels generic and does not surface **actionable** issues specific to their stack.

---

## 19. Final questions

### 1. Is Builder Edition V1 ready for Private Beta?

**YES, WITH LIMITATIONS**

The product, messaging, and UX are ready. Operations (migrations, env, deploy, E2E proof) are not.

### 2. Would you invite 25 users tomorrow?

**No.**

Migration and environment blockers would cause Continuous Reviews to fail for every user who pushes code — destroying trust on day one.

### 3. What would stop you from inviting them tomorrow?

1. Migrations 010–015 not applied on production Supabase  
2. `GITHUB_WEBHOOK_SECRET` not configured in production  
3. Hardening changes (Sprints 2–4) not deployed  
4. No live push → verdict smoke test completed  
5. Migration 015 (RLS) not applied — security risk  

### 4. What is the biggest risk for the beta?

**Continuous Reviews failing silently** because database schema is behind codebase — users connect GitHub, get a first verdict manually, then pushes never update anything. They conclude the product is broken.

### 5. What is the biggest strength of the product?

**A single, clear answer to "Can I deploy?"** — updated automatically when code changes. No other tool in the Cursor builder workflow answers that question this directly.

---

## 20. Final recommendation

| Question | Answer |
|----------|--------|
| Invite 25 users **tomorrow**? | **No** |
| Invite after checklist (48–72h)? | **Yes** |
| Charge €29/month at launch? | **Wait** until Stripe checkout + one week of free usage proves value |
| Product frozen and ready? | **Yes** |
| Ops frozen and ready? | **No** |

**Cursor's answer to the success criteria:**

> "Yes, I would invite the first 25 beta users tomorrow."

**Not yet.**  
> "Yes, I would invite them **this week** after migrations, env, deploy, and one green smoke test."

---

## 21. Uncommitted work summary

The following hardening is **complete in the working tree** but **not on `main`/production**:

- Sprint 2: UX simplification (dashboard, project, onboarding, settings)
- Sprint 3: GitHub reliability (delivery dedup, event ordering, sync soft-fail)
- Sprint 4: Landing repositioning
- All three sprint reports

**Action:** User should say **"si"** to commit and deploy before beta invite.

---

*Sprint 5 complete. Do not start Sprint 6 without explicit instruction.*
