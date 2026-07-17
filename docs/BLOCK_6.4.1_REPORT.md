# Block 6.4.1 — Internationalization & UX Foundation — Delivery Report

**Date:** 2026-07-17  
**Status:** Complete (within scope)  
**Repository:** `sequrai-app`

---

## 1. i18n solution chosen

**Custom lightweight i18n** in `lib/i18n/` — no third-party library.

| Capability | Implementation |
|------------|----------------|
| Namespaces | JSON files under `messages/{en,es}/` |
| Server Components | `getTranslator()`, `getRequestLocale()` |
| Client Components | `I18nProvider`, `useI18n()` |
| Plurals | `createTranslator()` with `_one` / `_other` suffixes |
| Dates & numbers | `Intl` via `lib/i18n/format.ts` |
| Typed keys | Namespace JSON + `MessageNamespace` union |

**Why not next-intl:** Existing App Router layout, OAuth/webhook stability, and minimal dependency surface. Cookie-based locale avoids route duplication.

---

## 2. Locale strategy

**Cookie `sequrai_locale` — no URL prefix** (`/dashboard`, not `/es/dashboard`).

Resolution order:
1. `profiles.locale` (authenticated)
2. `sequrai_locale` cookie
3. `Accept-Language` (first visit)
4. Fallback: `en`

Documented in `docs/I18N.md`.

**Not localized:** API routes, webhooks, MCP, OAuth callbacks, report deep links.

---

## 3. Files created

| Path | Purpose |
|------|---------|
| `lib/i18n/types.ts` | Locale types, namespaces |
| `lib/i18n/config.ts` | Cookie name, labels |
| `lib/i18n/detect.ts` | Browser detection |
| `lib/i18n/translate.ts` | Translator + plurals |
| `lib/i18n/load-messages.ts` | Namespace loader |
| `lib/i18n/server.ts` | Server helpers |
| `lib/i18n/client.tsx` | Provider + hooks |
| `lib/i18n/format.ts` | Localized dates |
| `lib/i18n/verdict-copy.ts` | Brand-consistent verdict labels |
| `components/shared/I18nShell.tsx` | Server → client bridge |
| `components/shared/LanguageSelector.tsx` | Accessible EN/Español switcher |
| `server/actions/locale.ts` | Persist cookie + profile |
| `database/migrations/011_profiles_locale.sql` | `profiles.locale` column |
| `messages/en/*.json` | 11 namespaces |
| `messages/es/*.json` | 11 namespaces |
| `docs/I18N.md` | Architecture doc |
| `docs/COPY_GLOSSARY.md` | Official terminology |
| `lib/i18n/__tests__/i18n.test.ts` | i18n unit tests |
| `features/onboarding/components/OnboardingPageHeader.tsx` | Onboarding header + language |

---

## 4. Files modified (high impact)

- **Routing:** `proxy.ts`, `app/layout.tsx`, auth/dashboard/onboarding layouts
- **Navigation:** `components/dashboard/sidebar.tsx` — 4 items only
- **Onboarding:** All step components + progress tracker
- **Dashboard:** `app/(dashboard)/dashboard/page.tsx`
- **Projects:** list, detail, `ProjectCard`
- **Verdict UI:** Hero, badge, fastest path, engineer summary, coverage, portfolio card, experience
- **Scan:** `ScanDetailView`, `RunSecurityScanButton`
- **Auth:** login, signup
- **Settings:** language selector section
- **Landing:** navbar + selector (body copy not fully translated)
- **AI:** locale passed into AI analysis pipeline prompts

---

## 5. Namespaces

| Namespace | Scope |
|-----------|-------|
| `common` | Shared UI, states, dates |
| `navigation` | Sidebar, menu |
| `auth` | Login, signup |
| `onboarding` | First Production Verdict flow |
| `dashboard` | Production overview |
| `projects` | Projects list & detail |
| `verdict` | Production Verdict copy |
| `settings` | Settings page |
| `errors` | User-facing errors |
| `integrations` | Integrations header & GitHub card |
| `technicalDetails` | Findings, coverage labels |

---

## 6. Language preference persistence

| Layer | Mechanism |
|-------|-----------|
| Authenticated | `profiles.locale` (`en` \| `es`) |
| Fallback | `sequrai_locale` cookie (1 year) |
| Detection | `Accept-Language` on first visit via `proxy.ts` |
| Manual change | `LanguageSelector` → `setLocaleAction` → `router.refresh()` |

**Migration required:** Run `database/migrations/011_profiles_locale.sql` on Supabase.

---

## 7. Navigation — before vs after

### Main sidebar (Builder Edition)

| Before | After |
|--------|-------|
| Dashboard | Dashboard |
| Projects | Projects / Proyectos |
| Timeline | *(hidden)* |
| AI Fixes | *(hidden)* |
| Security | *(hidden)* |
| Integrations | Integrations / Integraciones |
| Settings | Settings / Ajustes |
| Billing (duplicate) | *(removed from nav)* |
| New project (sidebar) | *(removed — CTA on projects page)* |

### Legacy routes (hidden, not deleted)

`/timeline`, `/ai-fixes`, `/security`, `/billing`, `/settings/team`

---

## 8. Screens translated

| Screen | EN | ES |
|--------|----|----|
| Onboarding (full flow) | ✅ | ✅ |
| Dashboard | ✅ | ✅ |
| Projects list | ✅ | ✅ |
| Project overview | ✅ | ✅ |
| Scan detail | ✅ | ✅ |
| Settings + language | ✅ | ✅ |
| Auth (login/signup) | ✅ | ✅ |
| Sidebar navigation | ✅ | ✅ |
| Production Verdict UI | ✅ | ✅ |
| Integrations (primary) | ✅ | ✅ |
| Landing navbar | ✅ | ✅ |

---

## 9. Screens pending / partial

| Surface | Notes |
|---------|-------|
| Landing body (hero, pricing, FAQ) | Nav + selector only |
| `/projects/new`, `/projects/[id]/edit` | Legacy forms |
| `TechnicalFindingsSection` filters | Partial |
| Email templates (`lib/resend`) | Not wired |
| Security activity feed, timeline | Legacy, hidden from nav |

---

## 10. Validation results

| Check | Result |
|-------|--------|
| `npm run typecheck` | ✅ Pass |
| `npm run lint` | ✅ Pass |
| `npm test` | ✅ 101 tests pass |
| `npm run build` | ✅ Pass |

---

## 11. Block 6.5 readiness

**Recommendation: Yes — foundation is ready for Block 6.5.**

Remaining i18n work (landing body, legacy pages, emails) is incremental and non-blocking.
