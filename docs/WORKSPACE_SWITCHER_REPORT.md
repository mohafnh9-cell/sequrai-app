# Workspace Switcher — Implementation Report

Date: 2026-07-20

## 1. Existing organization architecture audit

SequrAI’s tenant model remains **organization-backed**:

| Layer | Current shape |
|---|---|
| Database | `organizations`, `organization_members`, `organization_id` FKs on projects/scans/MCP keys |
| Creation | Secure RPC `create_organization_with_owner` (migration 015) |
| Resolution | `pickPrimaryOrganizationId()` + membership queries in `server/organizations/resolve-user-organization.ts` |
| Auth context | `getServerAuthContext()` in `lib/auth/dev-bypass.ts` |

No database tables, foreign keys, or API contracts were renamed. The switcher introduces a **presentation-layer alias**:

> **Organization (backend) → Workspace (product UI)**

## 2. User-facing terminology changes

- Sidebar header, dropdown, settings, and onboarding creation copy now say **Workspace**.
- Internal code, Supabase tables, RPC names, and MCP authorization still use `organization`.
- Settings card added: **Manage Workspaces** → `/settings/workspaces`.
- `OrgSetupForm` labels updated to Workspace copy (still calls the existing organization RPC).

## 3. Components created or modified

### Created

| Path | Purpose |
|---|---|
| `features/workspaces/components/WorkspaceSwitcher.tsx` | Premium dropdown switcher |
| `features/workspaces/components/WorkspaceIcon.tsx` | Logo / deterministic initials |
| `features/workspaces/components/CreateWorkspaceDialog.tsx` | Minimal create flow |
| `features/workspaces/components/CreateWorkspaceButton.tsx` | Settings page create action |
| `features/workspaces/components/WorkspaceManagementPanel.tsx` | Manage page list + switch |
| `lib/workspaces/presentation.ts` | Initials, plan formatting, partitioning |
| `lib/workspaces/constants.ts` | Cookie name + optional docs URL |
| `server/workspaces/service.ts` | List + resolve active workspace |
| `server/workspaces/mutations.ts` | Switch + create |
| `server/workspaces/active-workspace-cookie.ts` | HttpOnly cookie helpers |
| `app/api/workspaces/route.ts` | `GET` list / `POST` create |
| `app/api/workspaces/switch/route.ts` | `POST` switch |
| `app/(dashboard)/settings/workspaces/page.tsx` | Manage Workspaces page |
| `database/migrations/018_profiles_active_workspace.sql` | Profile preference column |
| `messages/en/workspace.json`, `messages/es/workspace.json` | i18n copy |

### Modified

| Path | Change |
|---|---|
| `components/dashboard/sidebar.tsx` | Replaced static org header with `WorkspaceSwitcher` |
| `components/dashboard/DashboardShell.tsx` | Mobile header + workspace props |
| `app/(dashboard)/layout.tsx` | Server-load workspaces for switcher |
| `lib/auth/dev-bypass.ts` | Active workspace resolution (profile → cookie → fallback) |
| `server/actions/organizations.ts` | Sets active workspace after RPC create |
| `app/(dashboard)/settings/page.tsx` | Link to manage workspaces |
| `lib/i18n/types.ts`, `lib/i18n/load-messages.ts` | `workspace` namespace |

## 4. Workspace resolution and persistence

Resolution order (server-side, membership-validated):

1. `profiles.active_organization_id` (migration **018**)
2. HttpOnly cookie `sequrai_active_workspace`
3. Deterministic fallback via `pickPrimaryOrganizationId()` (owner-first, then newest)

On switch/create success, **both** profile preference and cookie are updated. No unordered `.limit(1)` selection is used.

## 5. Switching behavior

1. Client calls `POST /api/workspaces/switch` with `{ workspaceId }`.
2. Server verifies membership, persists profile + cookie, `revalidatePath("/", "layout")`.
3. Client navigates to `/dashboard` and calls `router.refresh()`.
4. Pending UI: “Switching Workspace…” + disabled double-clicks.
5. Failure: previous workspace remains active; inline error shown.

## 6. Creation and management behavior

### Create Workspace

- Dropdown action opens dialog → `POST /api/workspaces`.
- Reuses `create_organization_with_owner` RPC.
- Creator becomes owner; new workspace becomes active; redirects to `/dashboard`.
- Onboarding `OrgSetupForm` still redirects to `/onboarding?step=welcome` unless `redirectTo=/dashboard` is posted.

### Manage Workspaces

- Route: **`/settings/workspaces`**
- Lists authorized workspaces, marks active, provides switch buttons + create button.
- Rename/delete/team features intentionally omitted.

### Documentation

- Shown only when `NEXT_PUBLIC_DOCS_URL` is a valid URL (see `.env.example`).
- Opens in a new tab with `rel="noopener noreferrer"`.
- Hidden when unset (no broken placeholder link).

### Sign out

- Reuses secure Supabase sign-out from the switcher menu.
- Workspace preference is **not** cleared on sign-out (restored on next login).

## 7. Security and authorization validation

- Listing, switching, and creating workspaces require authenticated session.
- Switch/create verify membership server-side; client cannot select arbitrary IDs.
- All existing organization-scoped APIs continue validating `organization_id` independently.
- Switcher is navigation only — not an authorization boundary.

## 8. MCP Workspace-context decision

**No change to MCP key semantics.**

- MCP API keys remain scoped to the organization that issued them.
- The web Workspace Switcher controls **web dashboard context only**.
- To access another workspace via MCP, use a key authorized for that organization (or pass an explicit supported project selector).

Documented here to avoid ambiguous cross-workspace MCP behavior.

## 9. Responsive behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (`md+`) | Dropdown anchored below sidebar header (~300px wide) |
| Mobile | Switcher in top bar + full sidebar sheet; close button sits beside trigger (not inside it) |

Dropdown uses Radix portal, fade/zoom animation (~150ms), keyboard + Escape + outside click via Radix defaults.

## 10. i18n

Namespace: `workspace` (EN + ES).

Required strings implemented:

- Current Workspace / Workspace actual
- Other Workspaces / Otros Workspaces
- Create / Manage / Documentation / Sign out
- Switching + switch failure messages

## 11. Tests

Added:

- `lib/workspaces/__tests__/presentation.test.ts`
- `server/workspaces/__tests__/service.test.ts`
- `features/workspaces/__tests__/workspace-i18n.test.ts`

Covers: initials, plan formatting, partition logic, resolution order, EN/ES copy.

Component interaction tests (Radix keyboard/outside-click) rely on Radix primitives + manual QA (no `@testing-library/react` in repo).

## 12. Typecheck, lint, tests and build results

Run locally after applying migration **018**:

```bash
npm run db:apply-migrations   # or apply 018 in Supabase SQL editor
npm run typecheck
npm run lint
npm run test
npm run build
```

> Note: CI/local runs in this environment hit long-running `tsc`/Vitest worker timeouts; re-run on your machine for authoritative results.

## 13. Remaining limitations

- No workspace rename UI (backend update action exists but not exposed).
- No workspace deletion, invitations, roles, or billing management.
- Documentation menu hidden until `NEXT_PUBLIC_DOCS_URL` is configured.
- Plan label shown only for non-`FREE` plans from real DB values.
- Demo mode shows a static workspace header (no live switching).

## 14. Exact routes to test

| Route | What to verify |
|---|---|
| `/dashboard` | Switcher opens; active workspace name; data scoped correctly |
| `/projects` | Project list updates after switch |
| `/integrations` | Repos scoped to active workspace |
| `/settings` | “Manage Workspaces” link |
| `/settings/workspaces` | List, switch, create |
| Mobile width | Top-bar switcher + sidebar sheet |

API smoke tests:

```bash
GET  /api/workspaces
POST /api/workspaces        { "name": "Client Demo" }
POST /api/workspaces/switch { "workspaceId": "<uuid>" }
```

Apply migration **`database/migrations/018_profiles_active_workspace.sql`** before testing persistence across refresh/login.
