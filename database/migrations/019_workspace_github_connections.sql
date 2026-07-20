-- Workspace-scoped GitHub connections (Builder V1: one active connection per Workspace)
begin;

create table if not exists public.workspace_github_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connected_by_user_id uuid not null references public.profiles(id) on delete restrict,
  github_user_id bigint not null default 0,
  github_login text not null,
  github_account_type text not null default 'User'
    check (github_account_type in ('User', 'Organization')),
  access_token text not null,
  refresh_token text,
  token_scopes text[] not null default '{}',
  expires_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired', 'insufficient_scope', 'migration_reconnection_required')),
  last_validated_at timestamptz,
  last_error text,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (organization_id)
);

create index if not exists workspace_github_connections_org_idx
  on public.workspace_github_connections (organization_id);

alter table public.projects
  add column if not exists github_connection_id uuid
    references public.workspace_github_connections(id) on delete set null;

alter table public.projects
  add column if not exists connected_by_user_id uuid
    references public.profiles(id) on delete set null;

create unique index if not exists projects_org_github_repository_id_unique
  on public.projects (organization_id, github_repository_id)
  where github_repository_id is not null;

create index if not exists projects_github_repository_id_idx
  on public.projects (github_repository_id)
  where github_repository_id is not null;

alter table public.workspace_github_connections enable row level security;

drop policy if exists "Members read workspace github connections" on public.workspace_github_connections;
create policy "Members read workspace github connections"
  on public.workspace_github_connections for select
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = workspace_github_connections.organization_id
        and m.user_id = auth.uid()
    )
  );

drop policy if exists "Owners manage workspace github connections" on public.workspace_github_connections;
create policy "Owners manage workspace github connections"
  on public.workspace_github_connections for all
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = workspace_github_connections.organization_id
        and m.user_id = auth.uid()
        and m.role = 'OWNER'
    )
  );

drop trigger if exists set_workspace_github_connections_updated_at on public.workspace_github_connections;
create trigger set_workspace_github_connections_updated_at
  before update on public.workspace_github_connections
  for each row execute function public.set_updated_at();

-- Backfill A: user belongs to exactly one Workspace and has a stored token
insert into public.workspace_github_connections (
  organization_id,
  connected_by_user_id,
  github_user_id,
  github_login,
  github_account_type,
  access_token,
  refresh_token,
  token_scopes,
  status,
  connected_at,
  updated_at
)
select
  om.organization_id,
  ugt.user_id,
  0,
  'legacy-backfill',
  'User',
  ugt.access_token,
  ugt.refresh_token,
  array['repo']::text[],
  'active',
  coalesce(ugt.created_at, now()),
  coalesce(ugt.updated_at, now())
from public.user_github_tokens ugt
join public.organization_members om
  on om.user_id = ugt.user_id
 and om.role = 'OWNER'
where (
  select count(*)
  from public.organization_members om2
  where om2.user_id = ugt.user_id
) = 1
on conflict (organization_id) do nothing;

-- Backfill B: multiple Workspaces but only one owns GitHub-linked projects for this token holder
insert into public.workspace_github_connections (
  organization_id,
  connected_by_user_id,
  github_user_id,
  github_login,
  github_account_type,
  access_token,
  refresh_token,
  token_scopes,
  status,
  connected_at,
  updated_at
)
select distinct on (om.organization_id)
  om.organization_id,
  ugt.user_id,
  0,
  'legacy-backfill',
  'User',
  ugt.access_token,
  ugt.refresh_token,
  array['repo']::text[],
  'active',
  coalesce(ugt.created_at, now()),
  coalesce(ugt.updated_at, now())
from public.user_github_tokens ugt
join public.organization_members om
  on om.user_id = ugt.user_id
 and om.role = 'OWNER'
join public.projects p
  on p.organization_id = om.organization_id
 and p.github_repository_id is not null
where not exists (
  select 1
  from public.workspace_github_connections wgc
  where wgc.organization_id = om.organization_id
)
and (
  select count(distinct p2.organization_id)
  from public.organization_members om2
  join public.projects p2
    on p2.organization_id = om2.organization_id
   and p2.github_repository_id is not null
  where om2.user_id = ugt.user_id
) = 1
on conflict (organization_id) do nothing;

update public.projects p
set
  github_connection_id = wgc.id,
  connected_by_user_id = coalesce(p.connected_by_user_id, wgc.connected_by_user_id)
from public.workspace_github_connections wgc
where p.organization_id = wgc.organization_id
  and p.github_repository_id is not null
  and p.github_connection_id is null;

commit;
